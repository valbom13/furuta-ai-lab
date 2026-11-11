/**
 * OpenAI Evolutionary Strategies (OpenAI-ES)
 * Scalable black-box gradient estimation via Gaussian perturbation and antithetic sampling.
 */

import { Individual } from './types.ts';

export class OpenAIES {
  private genomeLength: number;
  private populationSize: number;
  private learningRate: number;
  private sigma: number;
  private theta: Float32Array; // Mean parameter vector
  private perturbations: Float32Array[];

  constructor(genomeLength: number, populationSize = 50, learningRate = 0.05, sigma = 0.1) {
    this.genomeLength = genomeLength;
    this.populationSize = populationSize % 2 === 0 ? populationSize : populationSize + 1; // even for mirrored
    this.learningRate = learningRate;
    this.sigma = sigma;
    this.theta = new Float32Array(genomeLength);

    // Initialize with standard Xavier-like scale
    const scale = 0.5;
    for (let i = 0; i < genomeLength; i++) {
      this.theta[i] = (Math.random() * 2 - 1) * scale;
    }

    // Allocate perturbations
    const halfPop = this.populationSize / 2;
    this.perturbations = Array.from({ length: halfPop }, () => new Float32Array(genomeLength));
  }

  public getMeanGenome(): Float32Array {
    return this.theta;
  }

  /**
   * Generates population with antithetic (mirrored) perturbations:
   * Pair i: theta + sigma * eps_i  AND  theta - sigma * eps_i
   */
  public generatePopulation(): Individual[] {
    const individuals: Individual[] = [];
    const halfPop = this.populationSize / 2;
    const len = this.genomeLength;

    for (let i = 0; i < halfPop; i++) {
      const eps = this.perturbations[i];
      // Sample standard Gaussian noise
      for (let j = 0; j < len; j++) {
        eps[j] = this.gaussianSample();
      }

      // Individual + (positive perturbation)
      const gPos = new Float32Array(len);
      // Individual - (negative mirrored perturbation)
      const gNeg = new Float32Array(len);

      for (let j = 0; j < len; j++) {
        gPos[j] = this.theta[j] + this.sigma * eps[j];
        gNeg[j] = this.theta[j] - this.sigma * eps[j];
      }

      individuals.push({
        id: i * 2,
        genome: gPos,
        fitness: 0,
        rawBalanceTime: 0,
        energyUsed: 0,
        avgJerk: 0
      });

      individuals.push({
        id: i * 2 + 1,
        genome: gNeg,
        fitness: 0,
        rawBalanceTime: 0,
        energyUsed: 0,
        avgJerk: 0
      });
    }

    return individuals;
  }

  /**
   * Updates mean parameter vector theta using fitness-ranked gradient approximation.
   */
  public step(evaluatedPopulation: Individual[]): void {
    const n = evaluatedPopulation.length;
    const halfPop = n / 2;
    const len = this.genomeLength;

    // Rank transformation to reduce outlier impact
    const sorted = [...evaluatedPopulation].sort((a, b) => a.fitness - b.fitness);
    const ranks = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      // Centered ranks in [-0.5, 0.5]
      const normalizedRank = (i / (n - 1)) - 0.5;
      ranks.set(sorted[i].id, normalizedRank);
    }

    // Gradient estimator: sum (R_pos - R_neg) * eps_i
    const grad = new Float32Array(len);
    for (let i = 0; i < halfPop; i++) {
      const idPos = i * 2;
      const idNeg = i * 2 + 1;
      const rPos = ranks.get(idPos) ?? 0;
      const rNeg = ranks.get(idNeg) ?? 0;
      const weight = rPos - rNeg;
      const eps = this.perturbations[i];

      for (let j = 0; j < len; j++) {
        grad[j] += weight * eps[j];
      }
    }

    // Update theta: theta += lr / (n * sigma) * grad
    const stepSize = this.learningRate / (halfPop * this.sigma);
    for (let j = 0; j < len; j++) {
      this.theta[j] += stepSize * grad[j];
    }
  }

  private gaussianSample(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}
