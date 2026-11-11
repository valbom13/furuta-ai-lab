/**
 * Multi-Threaded Web Worker Pool Manager
 * Automatically scales parallel population evaluations across CPU cores.
 */

import { Individual } from '../evolution/types.ts';
import { LayerConfig, SensorPipelineConfig } from '../neural/types.ts';
import { FurutaParams } from '../physics/types.ts';
import { FitnessWeights } from '../evolution/types.ts';
import { WorkerBatchTask, WorkerBatchResult } from './sim.worker.ts';
import { FurutaPendulum } from '../physics/furuta.ts';
import { CartPole } from '../physics/cartpole.ts';
import { GantryCrane } from '../physics/crane.ts';
import { PhysicalSystem } from '../physics/types.ts';
import { NeuralNetwork } from '../neural/network.ts';
import { SensorPipeline } from '../neural/sensors.ts';
import { FitnessEvaluator } from '../evolution/fitness.ts';
import { NeatEngine } from '../evolution/neat.ts';

export class WorkerPool {
  private workerCount: number;
  private workers: Worker[] = [];
  private isBrowserWorkerSupported = false;

  constructor(maxWorkers?: number) {
    const hardwareThreads = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
    this.workerCount = maxWorkers ? Math.min(hardwareThreads, maxWorkers) : Math.max(1, Math.min(hardwareThreads, 8));

    this.initWorkers();
  }

  public initWorkers(): void {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        for (let i = 0; i < this.workerCount; i++) {
          const worker = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
          this.workers.push(worker);
        }
        this.isBrowserWorkerSupported = true;
      } catch (err) {
        console.warn('Worker instantiation failed, falling back to main-thread batching:', err);
        this.isBrowserWorkerSupported = false;
        this.workers = [];
      }
    }
  }

  public resetWorkers(): void {
    this.terminate();
    this.initWorkers();
  }

  public getWorkerCount(): number {
    return this.workerCount;
  }

  /**
   * Evaluates the whole population in parallel across available workers.
   */
  public async evaluatePopulation(
    population: Individual[],
    layerConfigs: LayerConfig[],
    sensorConfig: SensorPipelineConfig,
    physicsParams: Partial<FurutaParams>,
    fitnessWeights: Partial<FitnessWeights>,
    steps = 1000,
    dt = 0.005,
    systemId: 'furuta' | 'cartpole' | 'crane' = 'furuta'
  ): Promise<void> {
    const isNeat = population.length > 0 && !!population[0].neatGenome;
    if (isNeat || !this.isBrowserWorkerSupported || this.workers.length === 0) {
      // Synchronous fallback
      this.evaluateSynchronously(population, layerConfigs, sensorConfig, physicsParams, fitnessWeights, steps, dt, systemId);
      return;
    }

    const n = population.length;
    const numWorkers = this.workers.length;
    const batchSize = Math.ceil(n / numWorkers);
    const gLen = population[0]?.genome.length ?? 0;

    const promises: Promise<WorkerBatchResult>[] = [];

    for (let w = 0; w < numWorkers; w++) {
      const start = w * batchSize;
      const end = Math.min(n, start + batchSize);
      if (start >= end) continue;

      const subPop = population.slice(start, end);
      const numGenomes = subPop.length;
      const packedGenomes = new Float32Array(numGenomes * gLen);
      for (let i = 0; i < numGenomes; i++) {
        packedGenomes.set(subPop[i].genome, i * gLen);
      }

      const task: WorkerBatchTask = {
        workerId: w,
        packedGenomes,
        numGenomes,
        genomeLength: gLen,
        layerConfigs,
        sensorConfig,
        physicsParams,
        fitnessWeights,
        steps,
        dt,
        systemId
      };

      const worker = this.workers[w];
      const p = new Promise<WorkerBatchResult>((resolve, reject) => {
        const handler = (e: MessageEvent<WorkerBatchResult>) => {
          if (e.data.workerId === w) {
            cleanup();
            resolve(e.data);
          }
        };
        const errHandler = (err: ErrorEvent) => {
          cleanup();
          reject(err);
        };
        const cleanup = () => {
          worker.removeEventListener('message', handler);
          worker.removeEventListener('error', errHandler);
        };
        worker.addEventListener('message', handler);
        worker.addEventListener('error', errHandler);
        worker.postMessage(task, [packedGenomes.buffer]);
      });

      promises.push(p);
    }

    try {
      const results = await Promise.all(promises);

      // Apply results back to individuals in population from transferable buffer
      for (const batchRes of results) {
        const start = batchRes.workerId * batchSize;
        const { resultsBuffer, numGenomes } = batchRes;
        for (let j = 0; j < numGenomes; j++) {
          const ind = population[start + j];
          if (!ind) continue;
          const offset = j * 6;
          ind.fitness = resultsBuffer[offset];
          ind.rawBalanceTime = resultsBuffer[offset + 1];
          ind.energyUsed = resultsBuffer[offset + 2];
          ind.avgJerk = resultsBuffer[offset + 3];
          ind.behaviorDescriptor = [resultsBuffer[offset + 4], resultsBuffer[offset + 5]];
        }
      }
    } catch (err) {
      console.warn('Worker evaluation error, falling back to synchronous evaluation:', err);
      this.terminate();
      this.isBrowserWorkerSupported = false;
      this.evaluateSynchronously(population, layerConfigs, sensorConfig, physicsParams, fitnessWeights, steps, dt, systemId);
    }
  }

  /**
   * Synchronous high-speed fallback for testing or single-threaded environments.
   */
  public evaluateSynchronously(
    population: Individual[],
    layerConfigs: LayerConfig[],
    sensorConfig: SensorPipelineConfig,
    physicsParams: Partial<FurutaParams>,
    fitnessWeights: Partial<FitnessWeights>,
    steps: number,
    dt: number,
    systemId: 'furuta' | 'cartpole' | 'crane' = 'furuta'
  ): void {
    let physics: PhysicalSystem;
    if (systemId === 'cartpole') {
      physics = new CartPole();
    } else if (systemId === 'crane') {
      physics = new GantryCrane();
    } else {
      physics = new FurutaPendulum(physicsParams);
    }

    const network = new NeuralNetwork(layerConfigs);
    const sensors = new SensorPipeline(sensorConfig);
    const evaluator = new FitnessEvaluator(fitnessWeights);
    const maxVoltage = physics.getMaxControl();
    const isNeat = population.length > 0 && !!population[0].neatGenome;
    const neatEngine = isNeat ? new NeatEngine(sensors.computeOutputDim(), 1) : null;

    for (const ind of population) {
      if (!isNeat && ind.genome && ind.genome.length === network.getTotalWeights()) {
        network.setWeights(ind.genome);
      }
      network.reset();
      sensors.reset();
      physics.reset();

      let totalFitness = 0;
      let totalUprightSteps = 0;
      let totalEnergy = 0;
      let totalJerk = 0;
      let prevVoltage = 0;
      let armVelocitySum = 0;

      for (let s = 0; s < steps; s++) {
        const state = physics.getState();
        const obs = sensors.process(state, dt);
        let controlSignal = 0;
        if (isNeat && neatEngine && ind.neatGenome) {
          const neatOut = neatEngine.evaluate(ind.neatGenome, obs);
          controlSignal = neatOut[0];
        } else {
          const out = network.forward(obs);
          controlSignal = out[0];
        }
        const voltage = controlSignal * maxVoltage;

        const evalRes = evaluator.evaluateStep(state, voltage, prevVoltage, dt);
        totalFitness += evalRes.reward;
        if (evalRes.isUpright) totalUprightSteps++;
        totalEnergy += evalRes.energy;
        totalJerk += evalRes.jerk;
        armVelocitySum += Math.abs(state.thetaDot);

        physics.step(voltage, dt);
        prevVoltage = voltage;
      }

      ind.fitness = totalFitness;
      ind.rawBalanceTime = totalUprightSteps * dt;
      ind.energyUsed = totalEnergy;
      ind.avgJerk = totalJerk / Math.max(1, steps);
      ind.behaviorDescriptor = [totalEnergy, armVelocitySum / Math.max(1, steps)];
    }
  }

  public terminate(): void {
    for (const w of this.workers) {
      w.terminate();
    }
    this.workers = [];
  }
}
