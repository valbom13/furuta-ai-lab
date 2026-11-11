import { describe, it, expect } from 'vitest';
import { SimulationLab } from '../src/core/simulator.ts';
import { NeuralNetwork } from '../src/core/neural/network.ts';

describe('Algorithm compatibility with updateNetwork', () => {
  const algorithms = ['ga', 'openai_es', 'neat', 'island', 'map_elites'] as const;

  for (const algo of algorithms) {
    it(`handles updateNetwork with algorithm: ${algo}`, async () => {
      const layerConfigs = NeuralNetwork.createPreset('mlp', 8, 1);
      const lab = new SimulationLab(
        layerConfigs,
        { includeAngles: true, includeTrig: true, includeVelocities: true },
        {
          algorithm: algo,
          populationSize: 20,
          genomeLength: new NeuralNetwork(layerConfigs).getTotalWeights(),
          eliteCount: 2,
          selectionMethod: 'tournament',
          tournamentSize: 3,
          crossoverMethod: 'blx_alpha',
          crossoverRate: 0.8,
          blxAlpha: 0.5,
          mutationMethod: 'cauchy',
          mutationRate: 0.1,
          mutationStrength: 0.2,
          cauchyScale: 0.15,
          fitnessWeights: {
            uprightReward: 1.0,
            balanceBonus: 2.0,
            voltagePenalty: 0.05,
            jerkPenalty: 0.01,
            centerPenalty: 0.1,
            survivalReward: 0.1
          },
          islandCount: 4,
          migrationInterval: 5,
          migrationRate: 0.1,
          mapElitesResolution: 20,
          evaluationSteps: 400,
          dt: 0.005
        }
      );

      // Now change network to bottleneck
      const bottleneck = NeuralNetwork.createPreset('bottleneck', 8, 1);
      expect(() => {
        lab.updateNetwork(bottleneck);
      }).not.toThrow();

      // Verify stepGenerationTurbo succeeds with new topology
      const turboStats = await lab.stepGenerationTurbo();
      expect(turboStats.generation).toBe(1);
      expect(Number.isFinite(turboStats.bestFitness)).toBe(true);

      // Now change network to diamond
      const diamond = NeuralNetwork.createPreset('diamond', 8, 1);
      expect(() => {
        lab.updateNetwork(diamond);
      }).not.toThrow();
      expect(lab.evolution.getGeneration()).toBe(0);

      // Step generation with diamond
      const diamondStats = await lab.stepGenerationTurbo();
      expect(diamondStats.generation).toBe(1);

      // Now verify fullReset
      lab.fullReset();
      expect(lab.evolution.getGeneration()).toBe(0);
      expect(lab.evolution.getBestIndividual()).toBeNull();
      expect(lab.isRunning).toBe(false);
      expect(lab.isTurbo).toBe(false);
      expect(lab.simTime).toBe(0);
      expect(lab.balanceDuration).toBe(0);
    });
  }
});
