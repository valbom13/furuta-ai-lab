/**
 * MAP-Elites (Multi-dimensional Archive of Phenotypic Elites)
 * Illumination algorithm maintaining an archive of high-performing niches across behavioral dimensions.
 */

import { Individual } from './types.ts';
import { MutationOperators } from './mutation.ts';

export interface MapElitesCell {
  x: number;
  y: number;
  elite: Individual | null;
}

export class MapElitesArchive {
  public readonly resolution: number; // e.g. 20x20
  private archive: (Individual | null)[][];
  private totalFilled = 0;

  // Behavior limits
  // Dim 0: Energy efficiency (0 to 100 J)
  // Dim 1: Arm travel / velocity variance (0 to 20 rad/s)
  private readonly dim0Min = 0.0;
  private readonly dim0Max = 50.0;
  private readonly dim1Min = 0.0;
  private readonly dim1Max = 15.0;

  constructor(resolution = 20) {
    this.resolution = resolution;
    this.archive = Array.from({ length: resolution }, () =>
      Array.from({ length: resolution }, () => null)
    );
  }

  public getGrid(): (Individual | null)[][] {
    return this.archive;
  }

  public getCoverage(): number {
    return this.totalFilled / (this.resolution * this.resolution);
  }

  public getFilledCount(): number {
    return this.totalFilled;
  }

  /**
   * Maps continuous behavior descriptor [b0, b1] to grid cell coordinates [x, y].
   */
  public getCoordinates(descriptor: [number, number]): [number, number] {
    const normX = Math.max(0, Math.min(1, (descriptor[0] - this.dim0Min) / (this.dim0Max - this.dim0Min)));
    const normY = Math.max(0, Math.min(1, (descriptor[1] - this.dim1Min) / (this.dim1Max - this.dim1Min)));

    const x = Math.min(this.resolution - 1, Math.floor(normX * this.resolution));
    const y = Math.min(this.resolution - 1, Math.floor(normY * this.resolution));
    return [x, y];
  }

  /**
   * Adds an individual to its corresponding behavioral cell if it outperforms current occupant.
   */
  public add(individual: Individual): boolean {
    if (!individual.behaviorDescriptor) return false;

    const [x, y] = this.getCoordinates(individual.behaviorDescriptor);
    const current = this.archive[x][y];

    if (!current) {
      this.archive[x][y] = {
        ...individual,
        genome: new Float32Array(individual.genome)
      };
      this.totalFilled++;
      return true;
    } else if (individual.fitness > current.fitness) {
      this.archive[x][y] = {
        ...individual,
        genome: new Float32Array(individual.genome)
      };
      return true;
    }

    return false;
  }

  /**
   * Samples a random elite from filled cells in the archive.
   */
  public sampleRandomElite(): Individual | null {
    if (this.totalFilled === 0) return null;

    // Pick random filled cell
    const filled: Individual[] = [];
    for (let x = 0; x < this.resolution; x++) {
      for (let y = 0; y < this.resolution; y++) {
        const item = this.archive[x][y];
        if (item) filled.push(item);
      }
    }

    return filled[Math.floor(Math.random() * filled.length)];
  }

  /**
   * Generates a new batch of offspring from current archive elites.
   */
  public generateBatch(batchSize: number, genomeLength: number): Individual[] {
    const offspring: Individual[] = [];

    for (let i = 0; i < batchSize; i++) {
      const parent = this.sampleRandomElite();
      const childGenome = new Float32Array(genomeLength);

      if (parent) {
        childGenome.set(parent.genome);
        MutationOperators.mutate(childGenome, 'cauchy', 0.15, 0.2);
      } else {
        // Random initialization if archive is empty
        for (let j = 0; j < genomeLength; j++) {
          childGenome[j] = (Math.random() * 2 - 1) * 0.5;
        }
      }

      offspring.push({
        id: i,
        genome: childGenome,
        fitness: 0,
        rawBalanceTime: 0,
        energyUsed: 0,
        avgJerk: 0
      });
    }

    return offspring;
  }
}
