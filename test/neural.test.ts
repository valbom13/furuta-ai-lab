/**
 * Neural Network & Sensor Pipeline Test Suite
 */

import { describe, it, expect } from 'vitest';
import { TensorOps } from '../src/core/neural/tensor.ts';
import { applyActivationInPlace } from '../src/core/neural/activations.ts';
import { NeuralNetwork } from '../src/core/neural/network.ts';
import { GRULayer } from '../src/core/neural/layer.ts';
import { SensorPipeline } from '../src/core/neural/sensors.ts';

describe('Neural Network Engine: Tensors, Activations & Architectures', () => {
  it('correctly executes vectorized matrix-vector multiplication with bias', () => {
    // W = [[1, 2], [3, 4]], x = [0.5, -1.0], b = [0.1, -0.2]
    // out[0] = 1*0.5 + 2*(-1.0) + 0.1 = 0.5 - 2.0 + 0.1 = -1.4
    // out[1] = 3*0.5 + 4*(-1.0) - 0.2 = 1.5 - 4.0 - 0.2 = -2.7
    const W = new Float32Array([1, 2, 3, 4]);
    const x = new Float32Array([0.5, -1.0]);
    const b = new Float32Array([0.1, -0.2]);
    const out = new Float32Array(2);

    TensorOps.matVecMulAdd(W, x, b, out, 2, 2);

    expect(out[0]).toBeCloseTo(-1.4, 4);
    expect(out[1]).toBeCloseTo(-2.7, 4);
  });

  it('verifies non-linear activation functions correctness and bounds', () => {
    const data = new Float32Array([-2.0, 0.0, 2.0]);

    // ReLU: [-2, 0, 2] -> [0, 0, 2]
    applyActivationInPlace(data, 3, 'relu');
    expect(data[0]).toBe(0);
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(2);

    // Tanh: strictly bounded in (-1, 1)
    const tanhData = new Float32Array([-5.0, 0.0, 5.0]);
    applyActivationInPlace(tanhData, 3, 'tanh');
    expect(tanhData[0]).toBeCloseTo(-0.9999, 3);
    expect(tanhData[1]).toBe(0);
    expect(tanhData[2]).toBeCloseTo(0.9999, 3);

    // SIREN (sin): sin(0) = 0, sin(pi/2) = 1, sin(pi) = 0
    const sirenData = new Float32Array([0.0, Math.PI / 2, Math.PI]);
    applyActivationInPlace(sirenData, 3, 'siren');
    expect(sirenData[0]).toBeCloseTo(0, 4);
    expect(sirenData[1]).toBeCloseTo(1, 4);
    expect(sirenData[2]).toBeCloseTo(0, 4);
  });

  it('runs forward pass through ResNet skip connection without shape mismatch', () => {
    const resnetLayers = NeuralNetwork.createPreset('resnet', 6, 1);
    const net = new NeuralNetwork(resnetLayers);
    const input = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);

    const out = net.forward(input);
    expect(out.length).toBe(1);
    expect(Number.isFinite(out[0])).toBe(true);
  });

  it('updates GRU hidden state across sequential timesteps maintaining temporal memory', () => {
    const gru = new GRULayer({
      id: 'gru1',
      type: 'gru',
      inFeatures: 4,
      outFeatures: 8,
      activation: 'tanh',
      useBias: true
    });

    const step1 = new Float32Array([1, 0, 0, 0]);
    const step2 = new Float32Array([0, 0, 0, 0]); // Zero input should still yield non-zero output due to memory

    const out1 = gru.forward(step1);
    const h1Copy = new Float32Array(out1);

    const out2 = gru.forward(step2);

    // Second output must retain information from previous step (not all zeros)
    let nonZeroCount = 0;
    for (let i = 0; i < out2.length; i++) {
      if (Math.abs(out2[i]) > 1e-4) nonZeroCount++;
    }
    expect(nonZeroCount).toBeGreaterThan(0);
  });

  it('supports JSON export and byte-exact weight restoration', () => {
    const configs = NeuralNetwork.createPreset('diamond', 6, 1);
    const originalNet = new NeuralNetwork(configs);

    // Randomize weights
    const weights = originalNet.getWeights();
    for (let i = 0; i < weights.length; i++) {
      weights[i] = (i % 7) * 0.1 - 0.3;
    }
    originalNet.setWeights(weights);

    const json = originalNet.toJSON() as any;
    const restoredNet = NeuralNetwork.fromJSON(json);

    const testInput = new Float32Array([0.5, -0.2, 0.1, 0.8, -0.4, 0.3]);
    const outOriginal = originalNet.forward(testInput)[0];
    const outRestored = restoredNet.forward(testInput)[0];

    expect(outRestored).toBeCloseTo(outOriginal, 6);
  });

  it('correctly simulates optical encoder quantization and latency delay buffer in SensorPipeline', () => {
    const pipeline = new SensorPipeline({
      includeAngles: true,
      includeTrig: true,
      includeVelocities: true,
      noiseStd: 0.0,
      quantizationBits: 8, // 256 pulses/rev
      latencyMs: 20       // 20ms delay = 4 steps at 200Hz (dt = 0.005)
    });

    const state = { theta: 0.123456, alpha: 0.654321, thetaDot: 1.0, alphaDot: 2.0 };
    const dt = 0.005;

    // First steps: ring buffer fills from 0
    let obs = pipeline.process(state, dt);
    expect(obs.length).toBe(8); // 2 angles + 4 trig + 2 vels

    // After 4 steps, the delayed state should match the quantized state
    for (let i = 0; i < 6; i++) {
      obs = pipeline.process(state, dt);
    }

    const resolution = (2 * Math.PI) / 256;
    const expectedAlpha = Math.round(state.alpha / resolution) * resolution;
    expect(obs[1]).toBeCloseTo(expectedAlpha, 4);
  });

  it('separates Gargalo (Bottleneck/Compression) and Diamante (Diamond/Expansion) presets', () => {
    // Bottleneck: starts wider, compresses in center, expands back (Nin -> 16 -> 4 -> 8 -> 1)
    const bottleneck = NeuralNetwork.createPreset('bottleneck', 6, 1);
    expect(bottleneck.length).toBe(4);
    expect(bottleneck[0].outFeatures).toBe(16);
    expect(bottleneck[1].outFeatures).toBe(4);
    expect(bottleneck[2].outFeatures).toBe(8);
    expect(bottleneck[3].outFeatures).toBe(1);

    // Diamond: starts narrower, expands in center, funnels back down (Nin -> 8 -> 32 -> 8 -> 1)
    const diamond = NeuralNetwork.createPreset('diamond', 6, 1);
    expect(diamond.length).toBe(4);
    expect(diamond[0].outFeatures).toBe(8);
    expect(diamond[1].outFeatures).toBe(32);
    expect(diamond[2].outFeatures).toBe(8);
    expect(diamond[3].outFeatures).toBe(1);

    // Verify metadata exists for both
    const metaBottleneck = NeuralNetwork.PRESETS_METADATA.find(p => p.id === 'bottleneck');
    const metaDiamond = NeuralNetwork.PRESETS_METADATA.find(p => p.id === 'diamond');
    expect(metaBottleneck).toBeDefined();
    expect(metaDiamond).toBeDefined();
    expect(metaBottleneck?.name).toContain('Gargalo');
    expect(metaDiamond?.name).toContain('Diamante');
  });
});
