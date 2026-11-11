import { NeatGenome } from './neat.ts';

export type SelectionMethod = 'tournament' | 'roulette' | 'rank' | 'truncation';
export type CrossoverMethod = 'blx_alpha' | 'arithmetic' | 'single_point' | 'uniform';
export type MutationMethod = 'adaptive_gaussian' | 'cauchy' | 'polynomial' | 'uniform';
export type EvolutionAlgorithm = 'ga' | 'openai_es' | 'neat' | 'island' | 'map_elites';

export interface FitnessWeights {
  uprightReward: number;    // Reward for cos(alpha) upright (+1 at top)
  balanceBonus: number;     // Extra bonus for keeping |alpha| < 15 degrees
  voltagePenalty: number;   // Energy efficiency penalty -lambda * integral(V^2) dt
  jerkPenalty: number;      // Smoothness penalty -lambda * integral((dV)^2) dt
  centerPenalty: number;    // Keeping horizontal arm centered near theta = 0
  survivalReward: number;   // Reward per step survived without falling/crashing
}

export interface EvolutionConfig {
  algorithm: EvolutionAlgorithm;
  populationSize: number;
  genomeLength: number;
  eliteCount: number;
  inputDim?: number;

  // Selection
  selectionMethod: SelectionMethod;
  tournamentSize: number;

  // Crossover
  crossoverMethod: CrossoverMethod;
  crossoverRate: number;
  blxAlpha: number;

  // Mutation
  mutationMethod: MutationMethod;
  mutationRate: number;
  mutationStrength: number;
  cauchyScale: number;

  // Fitness weights
  fitnessWeights: FitnessWeights;

  // Island Model
  islandCount: number;
  migrationInterval: number; // in generations
  migrationRate: number;     // fraction of island to migrate

  // MAP-Elites
  mapElitesResolution: number; // e.g. 20x20 grid

  // Simulation trial limits
  evaluationSteps: number;   // e.g. 1000 steps at 200Hz = 5.0 seconds
  dt: number;                // 0.005s (200Hz)
}

export interface Individual {
  id: number;
  genome: Float32Array;
  fitness: number;
  rawBalanceTime: number; // seconds upright
  energyUsed: number;
  avgJerk: number;
  behaviorDescriptor?: [number, number]; // 2D behavioral characteristics for MAP-Elites
  islandId?: number;
  neatGenome?: NeatGenome;
}


export interface GenerationStats {
  generation: number;
  bestFitness: number;
  meanFitness: number;
  worstFitness: number;
  bestBalanceTime: number;
  bestGenome: Float32Array;
  diversity: number; // standard deviation of genomes
}
