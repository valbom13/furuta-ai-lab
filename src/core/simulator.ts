/**
 * Real-Time Swarm & Focus Simulation Coordinator
 * Executes live physical steps, updates instanced transforms,
 * and extracts telemetry for UI HUD & Synaptic Canvas.
 */

import { FurutaPendulum } from './physics/furuta.ts';
import { CartPole } from './physics/cartpole.ts';
import { GantryCrane } from './physics/crane.ts';
import { NeuralNetwork } from './neural/network.ts';
import { SensorPipeline } from './neural/sensors.ts';
import { FitnessEvaluator } from './evolution/fitness.ts';
import { GeneticEngine } from './evolution/engine.ts';
import { WorkerPool } from './workers/worker_pool.ts';
import { PhysicalSystem, FurutaParams } from './physics/types.ts';
import { LayerConfig, SensorPipelineConfig } from './neural/types.ts';
import { EvolutionConfig, GenerationStats, Individual } from './evolution/types.ts';

export interface SwarmMemberState {
  theta: number;
  alpha: number;
  thetaDot: number;
  alphaDot: number;
  fitness: number;
  voltage: number;
  isUpright: boolean;
}

export class SimulationLab {
  // Subsystems
  public physics: PhysicalSystem;
  public currentSystemId: 'furuta' | 'cartpole' | 'crane' = 'furuta';
  public readonly network: NeuralNetwork;
  public readonly sensors: SensorPipeline;
  public readonly evaluator: FitnessEvaluator;
  public readonly evolution: GeneticEngine;
  public readonly workerPool: WorkerPool;

  // Swarm physical states (for instanced rendering)
  public swarmStates: SwarmMemberState[] = [];
  private swarmPhysicsInstances: PhysicalSystem[] = [];
  private swarmNetworks: NeuralNetwork[] = [];

  // Playback state
  public isRunning = false;
  public isTurbo = false;
  public speedMultiplier = 1.0;
  public focusChampionOnly = false;

  // Real-time telemetry
  public currentVoltage = 0;
  public currentReward = 0;
  public currentEnergy = 0;
  public balanceDuration = 0;
  public simTime = 0;
  public lastFps = 60;
  public physicsStepsPerSec = 0;
  public lastObservation: Float32Array | null = null;
  private stepCounter = 0;
  private lastStatsTime = performance.now();

  // Active generation tracking
  private currentGenStep = 0;
  private maxGenSteps = 1200; // 6.0 seconds at 200Hz
  private resetToken = 0;
  private previewStepCounter = 0;

  constructor(
    layerConfigs: LayerConfig[],
    sensorConfig: Partial<SensorPipelineConfig>,
    evolutionConfig: EvolutionConfig,
    physicsParams?: Partial<FurutaParams>
  ) {
    this.physics = new FurutaPendulum(physicsParams);
    this.network = new NeuralNetwork(layerConfigs);
    this.sensors = new SensorPipeline(sensorConfig);
    this.evaluator = new FitnessEvaluator(evolutionConfig.fitnessWeights);
    this.evolution = new GeneticEngine(evolutionConfig);
    this.workerPool = new WorkerPool();

    this.maxGenSteps = evolutionConfig.evaluationSteps || 1200;
    this.initSwarm(evolutionConfig.populationSize);
  }

  public setGenerationTime(seconds: number): void {
    const dt = 0.005; // 200 Hz
    this.maxGenSteps = Math.max(200, Math.round(seconds / dt));
    this.evolution.updateConfig({ evaluationSteps: this.maxGenSteps });
  }

  public getGenerationTime(): number {
    return this.maxGenSteps * 0.005;
  }

  public getMaxGenSteps(): number {
    return this.maxGenSteps;
  }

  public getCurrentGenStep(): number {
    return this.currentGenStep;
  }

  public createPhysicalSystemInstance(id: 'furuta' | 'cartpole' | 'crane'): PhysicalSystem {
    if (id === 'cartpole') {
      return new CartPole();
    } else if (id === 'crane') {
      return new GantryCrane();
    }
    return new FurutaPendulum();
  }

  public setPhysicalSystem(id: 'furuta' | 'cartpole' | 'crane'): void {
    this.currentSystemId = id;
    this.physics = this.createPhysicalSystemInstance(id);
    this.initSwarm(this.evolution.getConfig().populationSize);
    this.resetCurrentGeneration();
  }

  public initSwarm(size: number): void {
    const pop = this.evolution.getPopulation();
    const count = Math.min(size, pop.length);
    const configs = this.network.getLayers().map(l => l.config);
    const totalWeights = this.network.getTotalWeights();

    this.swarmStates = [];
    this.swarmPhysicsInstances = [];
    this.swarmNetworks = [];

    for (let i = 0; i < count; i++) {
      const p = this.createPhysicalSystemInstance(this.currentSystemId);
      p.reset();
      const net = new NeuralNetwork(configs);
      if (pop[i]?.genome && pop[i].genome.length === totalWeights) {
        net.setWeights(pop[i].genome);
      }

      this.swarmPhysicsInstances.push(p);
      this.swarmNetworks.push(net);
      this.swarmStates.push({
        theta: p.getState().theta,
        alpha: p.getState().alpha,
        thetaDot: p.getState().thetaDot,
        alphaDot: p.getState().alphaDot,
        fitness: 0,
        voltage: 0,
        isUpright: false
      });
    }
  }

  public setSpeed(speed: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(10.0, speed));
  }

  public setTurbo(turbo: boolean): void {
    this.isTurbo = turbo;
  }

  public resetCurrentGeneration(): void {
    this.currentGenStep = 0;
    this.balanceDuration = 0;
    this.simTime = 0;
    this.currentVoltage = 0;
    this.previewStepCounter = 0;
    this.physics.reset();
    this.sensors.reset();
    this.network.reset();

    for (let i = 0; i < this.swarmPhysicsInstances.length; i++) {
      this.swarmPhysicsInstances[i].reset();
      this.swarmNetworks[i].reset();
      if (this.swarmStates[i]) {
        this.swarmStates[i].fitness = 0;
        this.swarmStates[i].voltage = 0;
        this.swarmStates[i].isUpright = false;
        const st = this.swarmPhysicsInstances[i].getState();
        this.swarmStates[i].theta = st.theta;
        this.swarmStates[i].alpha = st.alpha;
        this.swarmStates[i].thetaDot = st.thetaDot;
        this.swarmStates[i].alphaDot = st.alphaDot;
      }
    }
  }

  /**
   * Reconfigures network topology, resizes genomes, resets evolution to generation 0,
   * and refreshes swarm networks and instances.
   */
  public updateNetwork(layerConfigs: LayerConfig[]): void {
    this.resetToken++;
    this.network.buildFromConfigs(layerConfigs);
    const newTotalWeights = this.network.getTotalWeights();

    this.evolution.updateConfig({ genomeLength: newTotalWeights });
    this.evolution.reset();

    this.workerPool.resetWorkers();
    this.initSwarm(this.evolution.getConfig().populationSize);

    const pop = this.evolution.getPopulation();
    if (pop.length > 0 && pop[0]?.genome && pop[0].genome.length === newTotalWeights) {
      this.network.setWeights(pop[0].genome);
    }

    this.resetCurrentGeneration();
  }

  /**
   * Performs a comprehensive reset of physical state, generation counters,
   * genetic engine population (back to gen 0 with fresh random genomes),
   * and all real-time telemetry.
   */
  public fullReset(): void {
    this.resetToken++;
    this.isTurbo = false;
    this.isRunning = false;
    this.evolution.reset();
    this.workerPool.resetWorkers();
    this.initSwarm(this.evolution.getConfig().populationSize);

    const pop = this.evolution.getPopulation();
    if (pop.length > 0 && pop[0]?.genome && pop[0].genome.length === this.network.getTotalWeights()) {
      this.network.setWeights(pop[0].genome);
    }

    this.physics.reset({ theta: 0, alpha: Math.PI, thetaDot: 0, alphaDot: 0 });
    this.sensors.reset();
    this.network.reset();

    this.currentGenStep = 0;
    this.balanceDuration = 0;
    this.simTime = 0;
    this.currentVoltage = 0;
    this.currentReward = 0;
    this.currentEnergy = 0;
    this.physicsStepsPerSec = 0;
    this.lastObservation = null;
    this.previewStepCounter = 0;

    for (let i = 0; i < this.swarmPhysicsInstances.length; i++) {
      this.swarmPhysicsInstances[i].reset({ theta: 0, alpha: Math.PI, thetaDot: 0, alphaDot: 0 });
      this.swarmNetworks[i].reset();
      if (this.swarmStates[i]) {
        this.swarmStates[i].fitness = 0;
        this.swarmStates[i].voltage = 0;
        this.swarmStates[i].isUpright = false;
        this.swarmStates[i].theta = 0;
        this.swarmStates[i].alpha = Math.PI;
        this.swarmStates[i].thetaDot = 0;
        this.swarmStates[i].alphaDot = 0;
      }
    }
  }

  public applyPerturbation(torque: number): void {
    this.physics.applyImpulse(torque, true);
    for (const p of this.swarmPhysicsInstances) {
      p.applyImpulse(torque, true);
    }
  }

  /**
   * Main animation tick (called from requestAnimationFrame).
   * Runs appropriate number of physical 200Hz steps (dt = 0.005s) based on elapsed time and speed.
   */
  public update(frameDeltaMs: number): void {
    if (!this.isRunning || this.isTurbo) return;

    const dt = 0.005; // 200 Hz physical resolution
    const maxSubSteps = Math.min(20, Math.ceil((frameDeltaMs / 1000.0) * 200 * this.speedMultiplier));

    for (let step = 0; step < maxSubSteps; step++) {
      this.stepPhysics(dt);
      this.stepCounter++;

      // Check if generation finished
      this.currentGenStep++;
      if (this.currentGenStep >= this.maxGenSteps) {
        this.finishGeneration();
        if (!this.isRunning) break;
      }
    }

    // Telemetry throughput measurement
    const now = performance.now();
    const elapsed = now - this.lastStatsTime;
    if (elapsed >= 500) {
      this.physicsStepsPerSec = Math.round((this.stepCounter / elapsed) * 1000);
      this.stepCounter = 0;
      this.lastStatsTime = now;
    }
  }

  /**
   * Advances one physical step for champion and swarm.
   */
  private stepPhysics(dt: number): void {
    const maxVoltage = this.physics.getMaxControl();
    const neatEngine = this.evolution.getNeatEngine();
    const isNeat = this.evolution.getConfig().algorithm === 'neat';
    const bestInd = this.evolution.getBestIndividual();

    // 1. Step Champion
    const state = this.physics.getState();
    const obs = this.sensors.process(state, dt);
    this.lastObservation = obs;

    let controlSignal = 0;
    if (isNeat && neatEngine && bestInd?.neatGenome) {
      const neatOut = neatEngine.evaluate(bestInd.neatGenome, obs);
      controlSignal = neatOut[0];
    } else {
      const out = this.network.forward(obs);
      controlSignal = out[0];
    }
    const voltage = controlSignal * maxVoltage;

    const evalRes = this.evaluator.evaluateStep(state, voltage, this.currentVoltage, dt);
    this.currentVoltage = voltage;
    this.currentReward = evalRes.reward;
    this.currentEnergy += evalRes.energy;
    if (evalRes.isUpright) {
      this.balanceDuration += dt;
    }

    this.physics.step(voltage, dt);
    this.simTime += dt;

    // 2. Step Swarm so every individual accumulates fitness for evolution
    if (!this.isTurbo) {
      const count = this.swarmPhysicsInstances.length;
      const pop = this.evolution.getPopulation();
      for (let i = 0; i < count; i++) {
        const swPhysics = this.swarmPhysicsInstances[i];
        const swNet = this.swarmNetworks[i];
        const swState = swPhysics.getState();

        // Observation
        const swObs = this.sensors.process(swState, dt);
        let swControl = 0;
        if (isNeat && neatEngine && pop[i]?.neatGenome) {
          const neatOut = neatEngine.evaluate(pop[i].neatGenome!, swObs);
          swControl = neatOut[0];
        } else {
          const swOut = swNet.forward(swObs);
          swControl = swOut[0];
        }
        const swVolt = swControl * maxVoltage;

        const swEval = this.evaluator.evaluateStep(swState, swVolt, this.swarmStates[i].voltage, dt);
        this.swarmStates[i].fitness += swEval.reward;
        this.swarmStates[i].voltage = swVolt;
        this.swarmStates[i].isUpright = swEval.isUpright;

        swPhysics.step(swVolt, dt);

        this.swarmStates[i].theta = swPhysics.getState().theta;
        this.swarmStates[i].alpha = swPhysics.getState().alpha;
        this.swarmStates[i].thetaDot = swPhysics.getState().thetaDot;
        this.swarmStates[i].alphaDot = swPhysics.getState().alphaDot;
      }
    }
  }


  /**
   * Called when current generation completes its simulation steps.
   */
  public finishGeneration(): GenerationStats {
    // If we ran in swarm mode on main thread, copy swarm fitness to population
    const pop = this.evolution.getPopulation();
    if (!this.isTurbo && this.swarmStates.length > 0) {
      for (let i = 0; i < this.swarmStates.length; i++) {
        if (pop[i]) {
          pop[i].fitness = this.swarmStates[i].fitness;
        }
      }
    }

    const stats = this.evolution.nextGeneration();

    // Update champion network weights with best individual
    const bestInd = this.evolution.getBestIndividual();
    const championGenome = bestInd?.genome ?? stats.bestGenome;
    if (championGenome && championGenome.length === this.network.getTotalWeights()) {
      this.network.setWeights(championGenome);
    }

    // Refresh swarm networks with new generation genomes
    const newPop = this.evolution.getPopulation();
    for (let i = 0; i < this.swarmNetworks.length; i++) {
      if (newPop[i]?.genome && newPop[i].genome.length === this.swarmNetworks[i].getTotalWeights()) {
        this.swarmNetworks[i].setWeights(newPop[i].genome);
      }
    }
    if (this.swarmNetworks.length > 0 && championGenome && championGenome.length === this.swarmNetworks[0].getTotalWeights()) {
      this.swarmNetworks[0].setWeights(championGenome);
    }

    this.resetCurrentGeneration();
    return stats;
  }

  /**
   * Executes a whole generation in headless Turbo mode using the multi-threaded worker pool.
   */
  public async stepGenerationTurbo(): Promise<GenerationStats> {
    const token = this.resetToken;
    const pop = this.evolution.getPopulation();
    const layerConfigs = this.network.getLayers().map(l => l.config);
    const startTime = performance.now();

    await this.workerPool.evaluatePopulation(
      pop,
      layerConfigs,
      this.sensors.getConfig(),
      this.physics instanceof FurutaPendulum ? this.physics.getParams() : {},
      this.evaluator.getWeights(),
      this.maxGenSteps,
      0.005,
      this.currentSystemId
    );

    // Abort cleanly if simulation was reset or network was reconfigured during evaluation
    if (token !== this.resetToken) {
      return {
        generation: this.evolution.getGeneration(),
        bestFitness: 0,
        meanFitness: 0,
        worstFitness: 0,
        bestBalanceTime: 0,
        bestGenome: this.evolution.getBestIndividual()?.genome ?? new Float32Array(0),
        diversity: 0
      };
    }

    const stats = this.evolution.nextGeneration();
    const bestInd = this.evolution.getBestIndividual();
    const championGenome = bestInd?.genome ?? stats.bestGenome;
    if (championGenome && championGenome.length === this.network.getTotalWeights()) {
      this.network.setWeights(championGenome);
    }

    // Refresh swarm
    const newPop = this.evolution.getPopulation();
    for (let i = 0; i < this.swarmNetworks.length; i++) {
      if (newPop[i]?.genome && newPop[i].genome.length === this.swarmNetworks[i].getTotalWeights()) {
        this.swarmNetworks[i].setWeights(newPop[i].genome);
      }
    }
    if (this.swarmNetworks.length > 0 && championGenome && championGenome.length === this.swarmNetworks[0].getTotalWeights()) {
      this.swarmNetworks[0].setWeights(championGenome);
    }

    // Reset swarm fitness tracking for next generation
    for (let i = 0; i < this.swarmStates.length; i++) {
      if (this.swarmStates[i]) {
        this.swarmStates[i].fitness = 0;
        this.swarmStates[i].voltage = 0;
        this.swarmStates[i].isUpright = false;
      }
    }

    // Telemetry updates for HUD and synaptic canvas while in Turbo
    const elapsed = performance.now() - startTime;
    this.physicsStepsPerSec = Math.round((pop.length * this.maxGenSteps) / Math.max(0.001, elapsed / 1000));
    this.simTime = this.getGenerationTime();
    this.balanceDuration = bestInd ? bestInd.rawBalanceTime : stats.bestBalanceTime;

    // Run continuous live physics preview with champion and swarm so 3D model, Phase Portrait, and Synaptic Canvas animate!
    const previewSteps = 20;
    this.previewStepCounter = (this.previewStepCounter || 0) + previewSteps;
    if (this.previewStepCounter >= this.maxGenSteps) {
      this.physics.reset();
      this.sensors.reset();
      this.network.reset();
      for (let i = 0; i < this.swarmPhysicsInstances.length; i++) {
        this.swarmPhysicsInstances[i].reset();
      }
      this.previewStepCounter = 0;
    }

    const isNeat = this.evolution.getConfig().algorithm === 'neat';
    const neatEngine = this.evolution.getNeatEngine();
    const maxVolt = this.physics.getMaxControl();

    for (let s = 0; s < previewSteps; s++) {
      const champState = this.physics.getState();
      const champObs = this.sensors.process(champState, 0.005);
      this.lastObservation = champObs;
      let controlSignal = 0;
      if (isNeat && neatEngine && bestInd?.neatGenome) {
        controlSignal = neatEngine.evaluate(bestInd.neatGenome, champObs)[0];
      } else {
        controlSignal = this.network.forward(champObs)[0];
      }
      const champVolt = controlSignal * maxVolt;
      this.currentVoltage = champVolt;
      this.physics.step(champVolt, 0.005);

      const swarmPreviewCount = Math.min(25, this.swarmPhysicsInstances.length);
      for (let i = 0; i < swarmPreviewCount; i++) {
        const swP = this.swarmPhysicsInstances[i];
        const swN = this.swarmNetworks[i];
        const swObs = this.sensors.process(swP.getState(), 0.005);
        let swSig = 0;
        if (isNeat && neatEngine && newPop[i]?.neatGenome) {
          swSig = neatEngine.evaluate(newPop[i].neatGenome!, swObs)[0];
        } else {
          swSig = swN.forward(swObs)[0];
        }
        const swV = swSig * maxVolt;
        swP.step(swV, 0.005);
        if (this.swarmStates[i]) {
          const st = swP.getState();
          this.swarmStates[i].theta = st.theta;
          this.swarmStates[i].alpha = st.alpha;
          this.swarmStates[i].thetaDot = st.thetaDot;
          this.swarmStates[i].alphaDot = st.alphaDot;
          this.swarmStates[i].voltage = swV;
        }
      }
    }

    return stats;
  }
}
