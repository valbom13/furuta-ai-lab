/**
 * Test suite for Generation Time Control & Inspector Didactic Explanations
 */

import { describe, it, expect } from 'vitest';
import { SimulationLab } from '../src/core/simulator.ts';
import { NeuralNetwork } from '../src/core/neural/network.ts';
import { TOPICS } from '../src/ui/inspector.ts';
import { LayerConfig } from '../src/core/neural/types.ts';
import { EvolutionConfig } from '../src/core/evolution/types.ts';

describe('Generation Time Control & Inspector Topics', () => {
  const layerConfigs: LayerConfig[] = [
    { id: 'layer-1', type: 'dense', inFeatures: 6, outFeatures: 12, activation: 'tanh', useBias: true },
    { id: 'layer-2', type: 'dense', inFeatures: 12, outFeatures: 1, activation: 'tanh', useBias: true }
  ];

  const totalWeights = new NeuralNetwork(layerConfigs).getTotalWeights();

  const evoConfig: EvolutionConfig = {
    algorithm: 'ga',
    populationSize: 20,
    genomeLength: totalWeights,
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
    evaluationSteps: 1200,
    dt: 0.005
  };

  it('correctly configures and updates generation evaluation time', () => {
    const lab = new SimulationLab(layerConfigs, { includeAngles: true, includeTrig: true, includeVelocities: true }, evoConfig);

    // Initial default: 1200 steps (6.0s at 200Hz dt=0.005)
    expect(lab.getGenerationTime()).toBeCloseTo(6.0, 2);
    expect(lab.getMaxGenSteps()).toBe(1200);
    expect(lab.evolution.getConfig().evaluationSteps).toBe(1200);

    // Change to 8.0s
    lab.setGenerationTime(8.0);
    expect(lab.getGenerationTime()).toBeCloseTo(8.0, 2);
    expect(lab.getMaxGenSteps()).toBe(1600); // 8.0 / 0.005
    expect(lab.evolution.getConfig().evaluationSteps).toBe(1600);

    // Change to 1.5s
    lab.setGenerationTime(1.5);
    expect(lab.getGenerationTime()).toBeCloseTo(1.5, 2);
    expect(lab.getMaxGenSteps()).toBe(300); // 1.5 / 0.005

    // Change to 25.0s
    lab.setGenerationTime(25.0);
    expect(lab.getGenerationTime()).toBeCloseTo(25.0, 2);
    expect(lab.getMaxGenSteps()).toBe(5000); // 25.0 / 0.005
  });

  it('verifies all parameters have comprehensive didactic explanations and examples in TOPICS', () => {
    const requiredTopicKeys = [
      'system_selector',
      'sim_speed',
      'turbo_mode',
      'swarm_mode',
      'network_preset',
      'sensor_angles',
      'sensor_trig',
      'sensor_vels',
      'sensor_noise',
      'sensor_quantization',
      'sensor_latency',
      'layer_stack',
      'gen_time',
      'evo_algo',
      'evo_pop_size',
      'evo_elite_count',
      'evo_selection',
      'evo_crossover',
      'evo_cross_rate',
      'evo_mutation',
      'evo_mut_rate',
      'evo_mut_strength',
      'fit_upright',
      'fit_bonus',
      'fit_volt_pen',
      'fit_jerk_pen',
      'fit_center_pen',
      'mat_pendulum',
      'phy_pend_len',
      'phy_pend_rad',
      'phy_arm_len',
      'motor_max_v',
      'motor_res',
      'motor_kb',
      'motor_tau_max',
      'fric_viscous',
      'fric_coulomb',
      'sensor_pipeline',
      'evo_operators',
      'fitness_weights',
      'dc_motor',
      'friction_model',
      'calc_physics',
      'synaptic_diagram',
      'phase_portrait',
      'openai_es',
      'neat'
    ];

    for (const key of requiredTopicKeys) {
      const topic = TOPICS[key];
      expect(topic, `Topic "${key}" must be defined in TOPICS`).toBeDefined();
      expect(topic.title.length, `Topic "${key}" title must not be empty`).toBeGreaterThan(3);
      expect(topic.category, `Topic "${key}" category must be defined`).toBeDefined();
      expect(topic.concept.length, `Topic "${key}" concept must be rich and didactic`).toBeGreaterThan(20);
      expect(topic.examples.length, `Topic "${key}" examples must provide concrete values to input`).toBeGreaterThan(20);
      expect(topic.generalExpectation.length, `Topic "${key}" generalExpectation must be comprehensive`).toBeGreaterThan(20);
      expect(topic.simulationSpecific.length, `Topic "${key}" simulationSpecific must detail impacts on Furuta/motor`).toBeGreaterThan(20);
    }

    // Verify Linear, Gargalo, and Diamante preset explanations exist in network_preset examples
    expect(TOPICS.network_preset.examples).toContain('Linear');
    expect(TOPICS.network_preset.examples).toContain('Gargalo');
    expect(TOPICS.network_preset.examples).toContain('Diamante');
  });

  it('verifies updateNetwork cleanly resizes genomes, resets population, and seamlessly advances generations', async () => {
    const lab = new SimulationLab(layerConfigs, { includeAngles: true, includeTrig: true, includeVelocities: true }, evoConfig);

    // Initial weight count
    const initialWeights = lab.network.getTotalWeights();
    expect(lab.evolution.getPopulation()[0].genome.length).toBe(initialWeights);

    // Step 1 generation before network change
    lab.isRunning = true;
    for (let i = 0; i < 20; i++) {
      lab.update(16);
    }

    // Now modify network topology (e.g. switch to Bottleneck preset)
    const inDim = lab.sensors.computeOutputDim();
    const bottleneckConfigs = NeuralNetwork.createPreset('bottleneck', inDim, 1);
    lab.updateNetwork(bottleneckConfigs);

    const newWeights = lab.network.getTotalWeights();
    expect(newWeights).not.toBe(initialWeights);
    // Population genomes must match new total weights
    expect(lab.evolution.getPopulation()[0].genome.length).toBe(newWeights);
    expect(lab.evolution.getGeneration()).toBe(0);

    // Generations must advance cleanly without weight dimension mismatch error
    expect(() => {
      lab.finishGeneration();
    }).not.toThrow();

    expect(lab.evolution.getGeneration()).toBe(1);

    // Modify neuron count in a layer
    const modifiedConfigs = lab.network.getLayers().map(l => ({ ...l.config }));
    modifiedConfigs[0].outFeatures = 32;
    modifiedConfigs[1].inFeatures = 32;
    lab.updateNetwork(modifiedConfigs);

    expect(lab.network.getTotalWeights()).toBe(lab.evolution.getPopulation()[0].genome.length);

    // Evolution advances seamlessly with newly configured layer dimensions
    expect(() => {
      lab.finishGeneration();
    }).not.toThrow();
    expect(lab.evolution.getGeneration()).toBe(1);
  });

  it('verifies fullReset resets physics, generation counter to 0, telemetry, and population', () => {
    const lab = new SimulationLab(layerConfigs, { includeAngles: true, includeTrig: true, includeVelocities: true }, evoConfig);

    // Advance simulation and generations
    lab.isRunning = true;
    for (let i = 0; i < 50; i++) {
      lab.update(16);
    }
    lab.finishGeneration();
    expect(lab.evolution.getGeneration()).toBe(1);

    // Execute full reset
    lab.fullReset();

    // Verification of complete reset
    expect(lab.evolution.getGeneration()).toBe(0);
    expect(lab.evolution.getBestIndividual()).toBeNull();
    expect(lab.getCurrentGenStep()).toBe(0);
    expect(lab.balanceDuration).toBe(0);
    expect(lab.simTime).toBe(0);
    expect(lab.currentVoltage).toBe(0);
    expect(lab.physicsStepsPerSec).toBe(0);
    expect(lab.lastObservation).toBeNull();

    const physState = lab.physics.getState();
    expect(physState.theta).toBe(0);
    expect(physState.alpha).toBeCloseTo(Math.PI, 2);
    expect(physState.thetaDot).toBe(0);
    expect(physState.alphaDot).toBe(0);

    // Swarm states must also be fully reset
    for (const sw of lab.swarmStates) {
      expect(sw.fitness).toBe(0);
      expect(sw.voltage).toBe(0);
      expect(sw.isUpright).toBe(false);
      expect(sw.theta).toBe(0);
      expect(sw.alpha).toBeCloseTo(Math.PI, 2);
    }
  });

  it('verifies stepGenerationTurbo evaluates population, applies champion weights, and updates balance time', async () => {
    const lab = new SimulationLab(layerConfigs, { includeAngles: true, includeTrig: true, includeVelocities: true }, evoConfig);

    const stats = await lab.stepGenerationTurbo();
    expect(stats.generation).toBe(1);
    expect(stats.bestGenome).toBeDefined();
    expect(stats.bestGenome!.length).toBe(lab.network.getTotalWeights());
    expect(lab.network.getWeights().length).toBe(lab.network.getTotalWeights());

    // Balance duration and telemetry are updated
    expect(lab.simTime).toBeCloseTo(lab.getGenerationTime(), 2);
    expect(lab.physicsStepsPerSec).toBeGreaterThan(0);
  });

  it('ensures swarm individuals accumulate fitness even when focusChampionOnly is active', () => {
    const lab = new SimulationLab(layerConfigs, { includeAngles: true, includeTrig: true, includeVelocities: true }, evoConfig);
    lab.isRunning = true;
    lab.focusChampionOnly = true; // User focused visually on champion

    // Run 50 steps
    for (let i = 0; i < 50; i++) {
      lab.update(16);
    }

    // Swarm states must still have accumulated fitness and not remained zero
    const swarm = (lab as any).swarmStates;
    expect(swarm.length).toBeGreaterThan(0);
    const nonZeroFitnessCount = swarm.filter((s: any) => s.fitness !== 0).length;
    expect(nonZeroFitnessCount).toBeGreaterThan(0);
  });

  it('ensures isTurbo mode cleanly halts update() physics stepping to avoid race conditions', () => {
    const lab = new SimulationLab(layerConfigs, { includeAngles: true, includeTrig: true, includeVelocities: true }, evoConfig);
    lab.isRunning = true;
    lab.setTurbo(true);

    const stepBefore = lab.getCurrentGenStep();
    lab.update(16);
    const stepAfter = lab.getCurrentGenStep();

    // In turbo mode, update() must not run physical steps on main thread
    expect(stepAfter).toBe(stepBefore);
  });
});
