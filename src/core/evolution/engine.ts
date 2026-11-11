/**
 * Master Genetic Evolution Engine
 * Coordinates population life-cycle, reproduction operators,
 * multi-modal algorithms, and real-time statistics.
 */

import {
  EvolutionConfig,
  Individual,
  GenerationStats,
  EvolutionAlgorithm
} from './types.ts';
import { SelectionOperators } from './selection.ts';
import { CrossoverOperators } from './crossover.ts';
import { MutationOperators } from './mutation.ts';
import { OpenAIES } from './es.ts';
import { IslandManager } from './island.ts';
import { MapElitesArchive } from './map_elites.ts';
import { NeatEngine, NeatGenome } from './neat.ts';

export class GeneticEngine {
  private config: EvolutionConfig;
  private population: Individual[] = [];
  private generation = 0;
  private bestEverIndividual: Individual | null = null;
  private history: GenerationStats[] = [];

  // Sub-algorithm handlers
  private openaiEs: OpenAIES | null = null;
  private islandManager: IslandManager | null = null;
  private mapElitesArchive: MapElitesArchive | null = null;
  private neatEngine: NeatEngine | null = null;
  private neatGenomes: NeatGenome[] = [];

  constructor(config: EvolutionConfig) {

    this.config = { ...config };
    this.reset();
  }

  public getConfig(): Readonly<EvolutionConfig> {
    return this.config;
  }

  public updateConfig(partial: Partial<EvolutionConfig>): void {
    const prevAlgorithm = this.config.algorithm;
    const prevGenomeLength = this.config.genomeLength;
    Object.assign(this.config, partial);

    if (
      (partial.algorithm && partial.algorithm !== prevAlgorithm) ||
      (partial.genomeLength !== undefined && partial.genomeLength !== prevGenomeLength)
    ) {
      this.reset();
    }
  }

  public reset(): void {
    this.generation = 0;
    this.bestEverIndividual = null;
    this.history = [];

    const popSize = this.config.populationSize;
    const gLen = this.config.genomeLength;

    if (this.config.algorithm === 'openai_es') {
      this.openaiEs = new OpenAIES(gLen, popSize, 0.05, 0.1);
      this.population = this.openaiEs.generatePopulation();
    } else if (this.config.algorithm === 'island') {
      this.islandManager = new IslandManager(
        this.config.islandCount,
        this.config.migrationInterval,
        this.config.migrationRate
      );
      this.population = this.createRandomPopulation(popSize, gLen);
      this.islandManager.partition(this.population);
    } else if (this.config.algorithm === 'map_elites') {
      this.mapElitesArchive = new MapElitesArchive(this.config.mapElitesResolution);
      this.population = this.mapElitesArchive.generateBatch(popSize, gLen);
    } else if (this.config.algorithm === 'neat') {
      const inDim = this.config.inputDim ?? 8;
      this.neatEngine = new NeatEngine(inDim, 1);
      this.neatGenomes = [];
      const pop: Individual[] = [];
      for (let i = 0; i < popSize; i++) {
        const ng = this.neatEngine.createMinimalGenome(i);
        this.neatGenomes.push(ng);
        pop.push({
          id: i,
          genome: this.neatEngine.encodeWeights(ng),
          fitness: 0,
          rawBalanceTime: 0,
          energyUsed: 0,
          avgJerk: 0,
          neatGenome: ng
        });
      }
      this.population = pop;
    } else {
      // Classical GA
      this.population = this.createRandomPopulation(popSize, gLen);
    }
  }


  private createRandomPopulation(popSize: number, gLen: number): Individual[] {
    const pop: Individual[] = [];
    const scale = 0.5;
    for (let i = 0; i < popSize; i++) {
      const g = new Float32Array(gLen);
      for (let j = 0; j < gLen; j++) {
        g[j] = (Math.random() * 2 - 1) * scale;
      }
      pop.push({
        id: i,
        genome: g,
        fitness: 0,
        rawBalanceTime: 0,
        energyUsed: 0,
        avgJerk: 0
      });
    }
    return pop;
  }

  public getPopulation(): Individual[] {
    return this.population;
  }

  public getBestIndividual(): Individual | null {
    return this.bestEverIndividual;
  }

  public getHistory(): readonly GenerationStats[] {
    return this.history;
  }

  public getGeneration(): number {
    return this.generation;
  }

  public getMapElitesArchive(): MapElitesArchive | null {
    return this.mapElitesArchive;
  }

  /**
   * Called after population evaluation to record statistics and evolve to next generation.
   */
  public nextGeneration(): GenerationStats {
    this.generation++;

    // 1. Sort population descending by fitness
    this.population.sort((a, b) => b.fitness - a.fitness);

    // 2. Track best
    const currentBest = this.population[0];
    if (!this.bestEverIndividual || currentBest.fitness > this.bestEverIndividual.fitness) {
      this.bestEverIndividual = {
        ...currentBest,
        genome: new Float32Array(currentBest.genome)
      };
    }

    // 3. Compute statistics
    let sumFitness = 0;
    for (const ind of this.population) {
      sumFitness += ind.fitness;
    }
    const meanFitness = sumFitness / this.population.length;

    // Diversity computation
    const diversity = this.computePopulationDiversity();

    const stats: GenerationStats = {
      generation: this.generation,
      bestFitness: currentBest.fitness,
      meanFitness,
      worstFitness: this.population[this.population.length - 1].fitness,
      bestBalanceTime: currentBest.rawBalanceTime,
      bestGenome: new Float32Array(currentBest.genome),
      diversity
    };
    this.history.push(stats);

    // 4. Evolve next generation based on active algorithm
    switch (this.config.algorithm) {
      case 'openai_es':
        this.stepOpenAIES();
        break;
      case 'island':
        this.stepIsland();
        break;
      case 'map_elites':
        this.stepMapElites();
        break;
      case 'neat':
        this.stepNeat();
        break;
      case 'ga':
      default:
        this.stepClassicalGA();
        break;
    }


    return stats;
  }

  private stepClassicalGA(): void {
    const popSize = this.config.populationSize;
    const gLen = this.config.genomeLength;
    const nextPop: Individual[] = [];

    // Elitism: carry over top N individuals unchanged
    const eliteCount = Math.min(popSize, Math.max(1, this.config.eliteCount));
    for (let i = 0; i < eliteCount; i++) {
      nextPop.push({
        id: i,
        genome: new Float32Array(this.population[i].genome),
        fitness: 0,
        rawBalanceTime: 0,
        energyUsed: 0,
        avgJerk: 0
      });
    }

    // Breed remainder
    const childGenomeBuf = new Float32Array(gLen);
    for (let i = eliteCount; i < popSize; i++) {
      const parentA = SelectionOperators.select(
        this.population,
        this.config.selectionMethod,
        this.config.tournamentSize
      );

      const doCrossover = Math.random() < this.config.crossoverRate;
      if (doCrossover) {
        const parentB = SelectionOperators.select(
          this.population,
          this.config.selectionMethod,
          this.config.tournamentSize
        );
        CrossoverOperators.crossover(
          parentA.genome,
          parentB.genome,
          childGenomeBuf,
          this.config.crossoverMethod,
          this.config.blxAlpha
        );
      } else {
        childGenomeBuf.set(parentA.genome);
      }

      // Mutation
      MutationOperators.mutate(
        childGenomeBuf,
        this.config.mutationMethod,
        this.config.mutationRate,
        this.config.mutationStrength,
        this.generation,
        100
      );

      nextPop.push({
        id: i,
        genome: new Float32Array(childGenomeBuf),
        fitness: 0,
        rawBalanceTime: 0,
        energyUsed: 0,
        avgJerk: 0
      });
    }

    this.population = nextPop;
  }

  private stepOpenAIES(): void {
    if (!this.openaiEs) return;
    this.openaiEs.step(this.population);
    this.population = this.openaiEs.generatePopulation();
  }

  private stepIsland(): void {
    if (!this.islandManager) return;

    // Partition population into islands
    const islands = this.islandManager.partition(this.population);

    // Evolve each island independently with local elitism and selection
    const nextPop: Individual[] = [];
    const gLen = this.config.genomeLength;
    let nextId = 0;

    for (let i = 0; i < islands.length; i++) {
      const island = islands[i];
      island.sort((a, b) => b.fitness - a.fitness);
      const islandSize = island.length;
      const elite = island[0];

      // Island elite
      nextPop.push({
        id: nextId++,
        genome: new Float32Array(elite.genome),
        fitness: 0,
        rawBalanceTime: 0,
        energyUsed: 0,
        avgJerk: 0,
        islandId: i
      });

      const childBuf = new Float32Array(gLen);
      for (let j = 1; j < islandSize; j++) {
        const pA = SelectionOperators.tournament(island, 3);
        const pB = SelectionOperators.tournament(island, 3);
        CrossoverOperators.crossover(pA.genome, pB.genome, childBuf, this.config.crossoverMethod, this.config.blxAlpha);
        MutationOperators.mutate(childBuf, this.config.mutationMethod, this.config.mutationRate, this.config.mutationStrength, this.generation, 100);

        nextPop.push({
          id: nextId++,
          genome: new Float32Array(childBuf),
          fitness: 0,
          rawBalanceTime: 0,
          energyUsed: 0,
          avgJerk: 0,
          islandId: i
        });
      }
    }

    // Partition and perform ring migration
    const updatedIslands = this.islandManager.partition(nextPop);
    this.islandManager.stepMigration(updatedIslands);

    // Flatten back
    this.population = updatedIslands.flat();
  }

  private stepMapElites(): void {
    if (!this.mapElitesArchive) return;

    // Add evaluated population into behavioral archive
    for (const ind of this.population) {
      this.mapElitesArchive.add(ind);
    }

    // Generate new batch of exploratory offspring from illuminated archive
    this.population = this.mapElitesArchive.generateBatch(
      this.config.populationSize,
      this.config.genomeLength
    );
  }

  private stepNeat(): void {
    if (!this.neatEngine) return;

    for (let i = 0; i < this.population.length; i++) {
      const ind = this.population[i];
      if (ind.neatGenome) {
        ind.neatGenome.fitness = ind.fitness;
      }
    }

    this.neatGenomes = this.neatEngine.stepPopulation(
      this.neatGenomes,
      this.config.populationSize,
      this.config.eliteCount
    );

    const nextPop: Individual[] = [];
    for (let i = 0; i < this.neatGenomes.length; i++) {
      const ng = this.neatGenomes[i];
      nextPop.push({
        id: i,
        genome: this.neatEngine.encodeWeights(ng),
        fitness: 0,
        rawBalanceTime: 0,
        energyUsed: 0,
        avgJerk: 0,
        neatGenome: ng
      });
    }
    this.population = nextPop;
  }

  public getNeatEngine(): NeatEngine | null {
    return this.neatEngine;
  }

  private computePopulationDiversity(): number {
    const pop = this.population;
    if (pop.length <= 1) return 0;
    const len = pop[0].genome.length;

    let totalVariance = 0;
    for (let j = 0; j < len; j++) {
      let sum = 0;
      for (let i = 0; i < pop.length; i++) {
        sum += pop[i].genome[j];
      }
      const mean = sum / pop.length;
      let varSum = 0;
      for (let i = 0; i < pop.length; i++) {
        const diff = pop[i].genome[j] - mean;
        varSum += diff * diff;
      }
      totalVariance += varSum / pop.length;
    }
    return Math.sqrt(totalVariance / len);
  }
}

