/**
 * Headless Simulation Web Worker
 * Runs parallel batched physical simulations and neural network evaluations
 * with zero heap allocations in the inner loop and Transferable ArrayBuffers.
 */

import { FurutaPendulum } from '../physics/furuta.ts';
import { CartPole } from '../physics/cartpole.ts';
import { GantryCrane } from '../physics/crane.ts';
import { PhysicalSystem } from '../physics/types.ts';
import { NeuralNetwork } from '../neural/network.ts';
import { SensorPipeline } from '../neural/sensors.ts';
import { FitnessEvaluator } from '../evolution/fitness.ts';
import { LayerConfig, SensorPipelineConfig } from '../neural/types.ts';
import { FurutaParams } from '../physics/types.ts';
import { FitnessWeights } from '../evolution/types.ts';

export interface WorkerBatchTask {
  workerId: number;
  packedGenomes: Float32Array;
  numGenomes: number;
  genomeLength: number;
  layerConfigs: LayerConfig[];
  sensorConfig: SensorPipelineConfig;
  physicsParams: Partial<FurutaParams>;
  fitnessWeights: Partial<FitnessWeights>;
  steps: number;
  dt: number;
  systemId?: 'furuta' | 'cartpole' | 'crane';
}

export interface WorkerBatchResult {
  workerId: number;
  resultsBuffer: Float32Array; // 6 floats per individual: [fitness, balanceTime, energyUsed, avgJerk, b0, b1]
  numGenomes: number;
}

// In worker environment, listen to messages
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.onmessage = (e: MessageEvent<WorkerBatchTask>) => {
    try {
      const task = e.data;
      const { packedGenomes, numGenomes, genomeLength, layerConfigs, sensorConfig, physicsParams, fitnessWeights, steps, dt, systemId } = task;

      // Instantiate appropriate physical system
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
    const resultsBuffer = new Float32Array(numGenomes * 6);

    for (let g = 0; g < numGenomes; g++) {
      const genome = packedGenomes.subarray(g * genomeLength, (g + 1) * genomeLength);
      if (genome.length === network.getTotalWeights()) {
        network.setWeights(genome);
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
        const out = network.forward(obs);

        // Network output is in [-1, 1] (tanh), scale to voltage
        const voltage = out[0] * maxVoltage;

        const evalResult = evaluator.evaluateStep(state, voltage, prevVoltage, dt);
        totalFitness += evalResult.reward;
        if (evalResult.isUpright) totalUprightSteps++;
        totalEnergy += evalResult.energy;
        totalJerk += evalResult.jerk;

        armVelocitySum += Math.abs(state.thetaDot);

        physics.step(voltage, dt);
        prevVoltage = voltage;
      }

      const balanceTime = totalUprightSteps * dt;
      const avgJerk = totalJerk / Math.max(1, steps);
      const avgArmVel = armVelocitySum / Math.max(1, steps);

      const offset = g * 6;
      resultsBuffer[offset] = totalFitness;
      resultsBuffer[offset + 1] = balanceTime;
      resultsBuffer[offset + 2] = totalEnergy;
      resultsBuffer[offset + 3] = avgJerk;
      resultsBuffer[offset + 4] = totalEnergy;
      resultsBuffer[offset + 5] = avgArmVel;
    }

    const response: WorkerBatchResult = {
      workerId: task.workerId,
      resultsBuffer,
      numGenomes
    };

    // Zero-copy Transferable ArrayBuffer transfer back to host
    (self as any).postMessage(response, [resultsBuffer.buffer]);
  } catch (err) {
    console.error('Worker error during evaluation:', err);
    throw err;
  }
};
}
