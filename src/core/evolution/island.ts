/**
 * Island Model for Parallel Sub-Populations
 * Enhances genetic diversity through ring migration topologies.
 */

import { Individual } from './types.ts';

export class IslandManager {
  private islandCount: number;
  private migrationInterval: number;
  private migrationRate: number; // e.g. 0.1 = top 10%
  private generationsSinceMigration = 0;

  constructor(islandCount = 4, migrationInterval = 5, migrationRate = 0.1) {
    this.islandCount = islandCount;
    this.migrationInterval = migrationInterval;
    this.migrationRate = migrationRate;
  }

  public getIslandCount(): number {
    return this.islandCount;
  }

  /**
   * Partitions a flat population into K island groups.
   */
  public partition(population: Individual[]): Individual[][] {
    const islands: Individual[][] = Array.from({ length: this.islandCount }, () => []);
    const perIsland = Math.floor(population.length / this.islandCount);

    for (let i = 0; i < this.islandCount; i++) {
      const start = i * perIsland;
      const end = (i === this.islandCount - 1) ? population.length : start + perIsland;
      for (let j = start; j < end; j++) {
        population[j].islandId = i;
        islands[i].push(population[j]);
      }
    }
    return islands;
  }

  /**
   * Checks if migration should occur and executes ring migration:
   * Island 0 -> Island 1 -> ... -> Island K-1 -> Island 0
   */
  public stepMigration(islands: Individual[][]): boolean {
    this.generationsSinceMigration++;
    if (this.generationsSinceMigration < this.migrationInterval) {
      return false;
    }
    this.generationsSinceMigration = 0;

    // Collect best migrants from each island
    const migrants: Individual[][] = islands.map(island => {
      // Sort island descending by fitness
      island.sort((a, b) => b.fitness - a.fitness);
      const count = Math.max(1, Math.floor(island.length * this.migrationRate));
      return island.slice(0, count).map(ind => ({
        ...ind,
        genome: new Float32Array(ind.genome)
      }));
    });

    // Ring migration: inject migrants from island i into island (i + 1) % K
    for (let i = 0; i < this.islandCount; i++) {
      const targetIslandIdx = (i + 1) % this.islandCount;
      const targetIsland = islands[targetIslandIdx];
      const incoming = migrants[i];

      // Replace the worst individuals of the target island with incoming migrants
      targetIsland.sort((a, b) => a.fitness - b.fitness); // worst at beginning
      for (let m = 0; m < incoming.length; m++) {
        if (m < targetIsland.length) {
          incoming[m].islandId = targetIslandIdx;
          targetIsland[m] = incoming[m];
        }
      }
    }

    return true;
  }
}
