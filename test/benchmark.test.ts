/**
 * High-Speed Headless Numerical Physics & Neural Inference Benchmark
 * Validates requirement: >= 20,000 physical steps per second in headless mode.
 */

import { describe, it, expect } from 'vitest';
import { FurutaPendulum } from '../src/core/physics/furuta.ts';
import { NeuralNetwork } from '../src/core/neural/network.ts';
import { SensorPipeline } from '../src/core/neural/sensors.ts';

describe('Numerical Benchmark: High-Frequency Physics & Neural Inference', () => {
  it('achieves >= 20,000 coupled physical RK4 + neural forward steps per second', () => {
    const physics = new FurutaPendulum();
    const configs = NeuralNetwork.createPreset('mlp', 6, 1);
    const network = new NeuralNetwork(configs);
    const sensors = new SensorPipeline({
      includeAngles: true,
      includeTrig: true,
      includeVelocities: true,
      noiseStd: 0.0,
      quantizationBits: 0,
      latencyMs: 0
    });

    const dt = 0.005;
    const steps = 30000; // 30,000 steps

    const startTime = performance.now();

    for (let i = 0; i < steps; i++) {
      const state = physics.getState();
      const obs = sensors.process(state, dt);
      const out = network.forward(obs);
      physics.step(out[0] * 12.0, dt);
    }

    const elapsedMs = performance.now() - startTime;
    const stepsPerSecond = (steps / elapsedMs) * 1000;

    console.log(`[Benchmark] Headless physics + neural steps/sec: ${Math.round(stepsPerSecond).toLocaleString()} Hz`);

    // Requirement: minimum 20,000 steps/sec
    expect(stepsPerSecond).toBeGreaterThan(20000);
  });
});
