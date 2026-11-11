/**
 * Evolution Engine & Genetic Operators Test Suite
 */

import { describe, it, expect } from 'vitest';
import { SelectionOperators } from '../src/core/evolution/selection.ts';
import { CrossoverOperators } from '../src/core/evolution/crossover.ts';
import { MutationOperators } from '../src/core/evolution/mutation.ts';
import { IslandManager } from '../src/core/evolution/island.ts';
import { MapElitesArchive } from '../src/core/evolution/map_elites.ts';
import { FitnessEvaluator } from '../src/core/evolution/fitness.ts';
import { NeatEngine } from '../src/core/evolution/neat.ts';
import { Individual } from '../src/core/evolution/types.ts';

describe('Evolution Engine: Operators & Multi-Modal Algorithms', () => {
  it('verifies Tournament Selection favors high-fitness individuals as k increases', () => {
    const pop: Individual[] = [
      { id: 1, genome: new Float32Array([1]), fitness: 10, rawBalanceTime: 0, energyUsed: 0, avgJerk: 0 },
      { id: 2, genome: new Float32Array([2]), fitness: 50, rawBalanceTime: 0, energyUsed: 0, avgJerk: 0 },
      { id: 3, genome: new Float32Array([3]), fitness: 90, rawBalanceTime: 0, energyUsed: 0, avgJerk: 0 },
      { id: 4, genome: new Float32Array([4]), fitness: 200, rawBalanceTime: 0, energyUsed: 0, avgJerk: 0 }
    ];

    let championSelectedCount = 0;
    const trials = 500;
    for (let i = 0; i < trials; i++) {
      const selected = SelectionOperators.tournament(pop, 3);
      if (selected.id === 4) championSelectedCount++;
    }

    // With k=3 from 4 individuals, the theoretical probability is 1 - (3/4)^3 = 37/64 ≈ 57.8%
    // Compare against uniform random baseline (25%)
    const selectedRate = championSelectedCount / trials;
    expect(selectedRate).toBeGreaterThan(0.50);
    expect(selectedRate).toBeLessThan(0.70);
  });

  it('verifies BLX-alpha crossover generates exploration within [min - alpha*I, max + alpha*I]', () => {
    const p1 = new Float32Array([1.0, 5.0]);
    const p2 = new Float32Array([2.0, 7.0]);
    const child = new Float32Array(2);
    const alpha = 0.5;

    // For index 0: min = 1, max = 2, I = 1. Range is [1 - 0.5, 2 + 0.5] = [0.5, 2.5]
    // For index 1: min = 5, max = 7, I = 2. Range is [5 - 1.0, 7 + 1.0] = [4.0, 8.0]
    for (let i = 0; i < 200; i++) {
      CrossoverOperators.crossover(p1, p2, child, 'blx_alpha', alpha);
      expect(child[0]).toBeGreaterThanOrEqual(0.5 - 1e-5);
      expect(child[0]).toBeLessThanOrEqual(2.5 + 1e-5);
      expect(child[1]).toBeGreaterThanOrEqual(4.0 - 1e-5);
      expect(child[1]).toBeLessThanOrEqual(8.0 + 1e-5);
    }
  });

  it('demonstrates Cauchy mutation produces occasional long leaps beyond normal Gaussian 3-sigma bounds', () => {
    const genome = new Float32Array(1000);
    genome.fill(0.0);

    // Apply Cauchy mutation
    MutationOperators.mutate(genome, 'cauchy', 1.0, 0.5);

    let maxDisplacement = 0;
    for (let i = 0; i < genome.length; i++) {
      const absVal = Math.abs(genome[i]);
      if (absVal > maxDisplacement) maxDisplacement = absVal;
    }

    // Cauchy heavy-tailed distribution over 1000 samples should produce values > 3.0 (well past Gaussian 3-sigma = 1.5)
    expect(maxDisplacement).toBeGreaterThan(3.0);
  });

  it('executes Island Model ring migration with elite transfer', () => {
    const islandManager = new IslandManager(3, 1, 0.2); // 3 islands, migrate every 1 generation, top 20%
    const pop: Individual[] = [];

    for (let i = 0; i < 15; i++) {
      pop.push({
        id: i,
        genome: new Float32Array([i]),
        fitness: i * 10,
        rawBalanceTime: 0,
        energyUsed: 0,
        avgJerk: 0
      });
    }

    const islands = islandManager.partition(pop);
    expect(islands.length).toBe(3);
    expect(islands[0].length).toBe(5);

    // Perform migration
    const migrated = islandManager.stepMigration(islands);
    expect(migrated).toBe(true);
  });

  it('bins individuals into 2D behavioral niches and updates elites in MAP-Elites archive', () => {
    const archive = new MapElitesArchive(10); // 10x10 = 100 niches

    const ind1: Individual = {
      id: 1,
      genome: new Float32Array([0.1, 0.2]),
      fitness: 50,
      rawBalanceTime: 1.0,
      energyUsed: 10,
      avgJerk: 0,
      behaviorDescriptor: [10.0, 2.5] // Cell (2, 1) approx
    };

    const added1 = archive.add(ind1);
    expect(added1).toBe(true);
    expect(archive.getFilledCount()).toBe(1);

    // Submitting a lower-fitness individual to same descriptor cell should be rejected
    const ind2: Individual = {
      id: 2,
      genome: new Float32Array([0.3, 0.4]),
      fitness: 30, // lower
      rawBalanceTime: 0.5,
      energyUsed: 10,
      avgJerk: 0,
      behaviorDescriptor: [10.0, 2.5]
    };
    const added2 = archive.add(ind2);
    expect(added2).toBe(false);

    // Submitting a higher-fitness individual to same cell should replace
    const ind3: Individual = {
      id: 3,
      genome: new Float32Array([0.9, 0.9]),
      fitness: 120, // higher
      rawBalanceTime: 2.5,
      energyUsed: 10,
      avgJerk: 0,
      behaviorDescriptor: [10.0, 2.5]
    };
    const added3 = archive.add(ind3);
    expect(added3).toBe(true);
  });

  it('verifies multi-objective fitness rewards upright posture and penalizes jerk and energy', () => {
    const evaluator = new FitnessEvaluator({
      uprightReward: 1.0,
      balanceBonus: 2.0,
      voltagePenalty: 0.1,
      jerkPenalty: 0.05
    });

    const dt = 0.005;

    // Upright state (alpha = 0) with smooth control
    const uprightState = { theta: 0, alpha: 0.05, thetaDot: 0, alphaDot: 0 };
    const resUpright = evaluator.evaluateStep(uprightState, 1.0, 1.0, dt);

    // Downward hanging state (alpha = pi)
    const downState = { theta: 0, alpha: Math.PI, thetaDot: 0, alphaDot: 0 };
    const resDown = evaluator.evaluateStep(downState, 1.0, 1.0, dt);

    expect(resUpright.reward).toBeGreaterThan(resDown.reward);
    expect(resUpright.isUpright).toBe(true);
    expect(resDown.isUpright).toBe(false);

    // Jerky sudden voltage shift (from 0 to 12V in 1 step)
    const resJerk = evaluator.evaluateStep(uprightState, 12.0, 0.0, dt);
    expect(resJerk.jerk).toBeGreaterThan(0);
    expect(resJerk.reward).toBeLessThan(resUpright.reward);
  });

  it('verifies Linear Rank Selection favors higher-ranked individuals even with unsorted input', () => {
    // Unsorted population with clear fitness differences
    const pop: Individual[] = [
      { id: 1, genome: new Float32Array([1]), fitness: 10, rawBalanceTime: 0, energyUsed: 0, avgJerk: 0 },
      { id: 2, genome: new Float32Array([2]), fitness: 200, rawBalanceTime: 0, energyUsed: 0, avgJerk: 0 }, // best
      { id: 3, genome: new Float32Array([3]), fitness: 50, rawBalanceTime: 0, energyUsed: 0, avgJerk: 0 },
      { id: 4, genome: new Float32Array([4]), fitness: 90, rawBalanceTime: 0, energyUsed: 0, avgJerk: 0 }
    ];

    let bestSelected = 0;
    let worstSelected = 0;
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      const sel = SelectionOperators.rankSelection(pop);
      if (sel.id === 2) bestSelected++;
      if (sel.id === 1) worstSelected++;
    }

    // Theoretical probabilities for n=4: sum = 4+3+2+1 = 10.
    // Best (rank 4) -> 40%. Worst (rank 1) -> 10%.
    const bestRate = bestSelected / trials;
    const worstRate = worstSelected / trials;

    expect(bestRate).toBeGreaterThan(0.32);
    expect(bestRate).toBeLessThan(0.48);
    expect(worstRate).toBeGreaterThan(0.04);
    expect(worstRate).toBeLessThan(0.16);
    expect(bestRate).toBeGreaterThan(worstRate * 2.5);
  });

  it('verifies NEAT minimal genome creation, structural mutations, and topological evaluation', () => {
    const inDim = 4;
    const outDim = 1;
    const neat = new NeatEngine(inDim, outDim);

    const genome = neat.createMinimalGenome(1);
    expect(genome.nodes.length).toBe(inDim + outDim);
    expect(genome.connections.length).toBe(inDim * outDim);

    // Initial feedforward evaluation
    const inputs = new Float32Array([0.5, -0.2, 0.8, -0.5]);
    const out1 = neat.evaluate(genome, inputs);
    expect(out1.length).toBe(1);
    expect(Number.isFinite(out1[0])).toBe(true);

    // Structural node mutation: splits a connection and inserts a hidden node
    const connCountBefore = genome.connections.length;
    const nodeCountBefore = genome.nodes.length;
    // Force node mutation by calling private/internal helper or looping mutate
    let nodeAdded = false;
    for (let i = 0; i < 50; i++) {
      neat.mutate(genome);
      if (genome.nodes.length > nodeCountBefore) {
        nodeAdded = true;
        break;
      }
    }
    expect(nodeAdded).toBe(true);
    expect(genome.nodes.length).toBeGreaterThan(nodeCountBefore);
    expect(genome.connections.length).toBeGreaterThan(connCountBefore);

    // Evaluation still works after topological mutation
    const out2 = neat.evaluate(genome, inputs);
    expect(Number.isFinite(out2[0])).toBe(true);

    // Population evolution & speciation/elitism
    const pop = [
      { ...neat.createMinimalGenome(0), fitness: 10 },
      { ...neat.createMinimalGenome(1), fitness: 50 },
      { ...neat.createMinimalGenome(2), fitness: 100 }
    ];
    const nextPop = neat.stepPopulation(pop, 4, 1);
    expect(nextPop.length).toBe(4);
    // Elite preserved
    expect(nextPop[0].id).toBe(0);
  });
});
