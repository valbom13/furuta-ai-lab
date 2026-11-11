/**
 * Genetic Mutation Operators
 * Adaptive Gaussian, Cauchy (heavy-tailed), Polynomial, and Uniform.
 */

import { MutationMethod } from './types.ts';

export class MutationOperators {
  /**
   * Applies mutation in-place to genome.
   */
  public static mutate(
    genome: Float32Array,
    method: MutationMethod,
    rate: number,
    strength: number,
    generation = 1,
    maxGenerations = 100
  ): void {
    const len = genome.length;
    switch (method) {
      case 'adaptive_gaussian':
        this.adaptiveGaussian(genome, len, rate, strength, generation, maxGenerations);
        break;
      case 'cauchy':
        this.cauchy(genome, len, rate, strength);
        break;
      case 'polynomial':
        this.polynomial(genome, len, rate, 20.0);
        break;
      case 'uniform':
      default:
        this.uniform(genome, len, rate, strength);
        break;
    }
  }

  /**
   * Standard Box-Muller Gaussian sample.
   */
  private static sampleGaussian(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Cauchy sample via inverse CDF:
   * x = gamma * tan(pi * (u - 0.5))
   * Heavy-tailed distribution: allows frequent small tweaks but occasional massive leaps,
   * breaking out of deceptive local optima where Gaussian search stalls.
   */
  private static sampleCauchy(scale: number): number {
    const u = Math.random();
    return scale * Math.tan(Math.PI * (u - 0.5));
  }

  /**
   * Adaptive Gaussian Mutation:
   * Strength decays exponentially over generations: sigma(t) = sigma_0 * (1 - t/T)^alpha
   */
  public static adaptiveGaussian(
    genome: Float32Array,
    len: number,
    rate: number,
    strength: number,
    generation: number,
    maxGenerations: number
  ): void {
    const progress = Math.min(1.0, generation / maxGenerations);
    // 1/5th success rule approximation / decay
    const currentSigma = Math.max(0.01, strength * (1.0 - 0.7 * progress));

    for (let i = 0; i < len; i++) {
      if (Math.random() < rate) {
        genome[i] += this.sampleGaussian() * currentSigma;
      }
    }
  }

  /**
   * Cauchy Mutation:
   * Heavy tails for exploratory breakthroughs.
   */
  public static cauchy(
    genome: Float32Array,
    len: number,
    rate: number,
    scale: number
  ): void {
    for (let i = 0; i < len; i++) {
      if (Math.random() < rate) {
        const delta = this.sampleCauchy(scale);
        // Soft clamp delta to prevent immediate infinity
        const clampedDelta = Math.max(-10.0, Math.min(10.0, delta));
        genome[i] += clampedDelta;
      }
    }
  }

  /**
   * Polynomial Mutation (Deb & Goyal):
   */
  public static polynomial(
    genome: Float32Array,
    len: number,
    rate: number,
    eta_m = 20.0
  ): void {
    for (let i = 0; i < len; i++) {
      if (Math.random() < rate) {
        const u = Math.random();
        let delta_q = 0;
        if (u <= 0.5) {
          delta_q = Math.pow(2.0 * u, 1.0 / (eta_m + 1.0)) - 1.0;
        } else {
          delta_q = 1.0 - Math.pow(2.0 * (1.0 - u), 1.0 / (eta_m + 1.0));
        }
        genome[i] += delta_q;
      }
    }
  }

  /**
   * Uniform Random Perturbation
   */
  public static uniform(
    genome: Float32Array,
    len: number,
    rate: number,
    strength: number
  ): void {
    for (let i = 0; i < len; i++) {
      if (Math.random() < rate) {
        genome[i] += (Math.random() * 2 - 1) * strength;
      }
    }
  }
}
