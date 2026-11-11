/**
 * Sensor Pipeline & Hardware Signal Processing
 * Simulates physical optical encoders, trigonometric transforms,
 * latency delay ring buffers, and sensor noise injection.
 */

import { PhysicalState } from '../physics/types.ts';
import { SensorPipelineConfig } from './types.ts';

export class SensorPipeline {
  private config: SensorPipelineConfig;
  private readonly delayBuffer: Float64Array[];
  private delayIndex = 0;
  private maxDelaySteps = 50; // at 200Hz, 50 steps = 250ms max buffer
  private outputBuffer: Float32Array;

  constructor(config?: Partial<SensorPipelineConfig>) {
    this.config = {
      includeAngles: true,
      includeTrig: true,
      includeVelocities: true,
      noiseStd: 0.0,
      quantizationBits: 0,
      latencyMs: 0,
      ...config
    };

    // Preallocate delay buffer ring
    this.delayBuffer = Array.from({ length: this.maxDelaySteps }, () => new Float64Array(4));
    this.outputBuffer = new Float32Array(this.computeOutputDim());
  }

  public updateConfig(config: Partial<SensorPipelineConfig>): void {
    Object.assign(this.config, config);
    const newDim = this.computeOutputDim();
    if (this.outputBuffer.length !== newDim) {
      this.outputBuffer = new Float32Array(newDim);
    }
  }

  public getConfig(): Readonly<SensorPipelineConfig> {
    return this.config;
  }

  public computeOutputDim(): number {
    let dim = 0;
    if (this.config.includeAngles) dim += 2; // [theta, alpha]
    if (this.config.includeTrig) dim += 4;   // [sin(alpha), cos(alpha), sin(theta), cos(theta)]
    if (this.config.includeVelocities) dim += 2; // [thetaDot, alphaDot]
    return Math.max(1, dim);
  }

  public reset(): void {
    this.delayIndex = 0;
    for (const buf of this.delayBuffer) {
      buf.fill(0);
    }
  }

  /**
   * Generates normally-distributed Gaussian noise using Box-Muller transform.
   */
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Quantizes continuous angle according to optical encoder resolution (pulses per revolution).
   */
  private quantizeAngle(angle: number, pulsesPerRev: number): number {
    if (pulsesPerRev <= 0) return angle;
    const resolution = (2.0 * Math.PI) / pulsesPerRev;
    return Math.round(angle / resolution) * resolution;
  }

  /**
   * Processes physical state through optical encoders, noise, latency, and trigonometric transforms.
   * Returns Float32Array ready for neural network input.
   * dt: simulation timestep (e.g. 0.005s)
   */
  public process(state: Readonly<PhysicalState>, dt = 0.005): Float32Array {
    // 1. Push current raw state to latency ring buffer
    const currentBuf = this.delayBuffer[this.delayIndex];
    currentBuf[0] = state.theta;
    currentBuf[1] = state.alpha;
    currentBuf[2] = state.thetaDot;
    currentBuf[3] = state.alphaDot;

    // 2. Compute delayed index based on latencyMs
    const delaySteps = Math.min(this.maxDelaySteps - 1, Math.round((this.config.latencyMs / 1000.0) / dt));
    let readIndex = this.delayIndex - delaySteps;
    if (readIndex < 0) readIndex += this.maxDelaySteps;

    const delayed = this.delayBuffer[readIndex];

    // Advance ring buffer pointer
    this.delayIndex = (this.delayIndex + 1) % this.maxDelaySteps;

    // 3. Encoder Quantization & Noise injection
    const pulses = this.config.quantizationBits > 0 ? (1 << this.config.quantizationBits) : 0;
    const noise = this.config.noiseStd;

    let theta = delayed[0];
    let alpha = delayed[1];
    let thetaDot = delayed[2];
    let alphaDot = delayed[3];

    if (pulses > 0) {
      theta = this.quantizeAngle(theta, pulses);
      alpha = this.quantizeAngle(alpha, pulses);
    }

    if (noise > 0) {
      theta += this.gaussianRandom() * noise;
      alpha += this.gaussianRandom() * noise;
      thetaDot += this.gaussianRandom() * (noise * 2.0);
      alphaDot += this.gaussianRandom() * (noise * 2.0);
    }

    // 4. Populate output vector
    let idx = 0;
    if (this.config.includeAngles) {
      this.outputBuffer[idx++] = theta;
      this.outputBuffer[idx++] = alpha;
    }
    if (this.config.includeTrig) {
      this.outputBuffer[idx++] = Math.sin(alpha);
      this.outputBuffer[idx++] = Math.cos(alpha);
      this.outputBuffer[idx++] = Math.sin(theta);
      this.outputBuffer[idx++] = Math.cos(theta);
    }
    if (this.config.includeVelocities) {
      this.outputBuffer[idx++] = thetaDot;
      this.outputBuffer[idx++] = alphaDot;
    }

    return this.outputBuffer;
  }
}
