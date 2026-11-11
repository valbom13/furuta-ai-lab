/**
 * Neural Network Layers: Dense, ResNet Skip-Connection, and GRU Recurrent Cell.
 * All layers operate strictly with pre-allocated Float32Array buffers.
 */

import { LayerConfig, ActivationType } from './types.ts';
import { TensorOps } from './tensor.ts';
import { applyActivationInPlace } from './activations.ts';

export interface ILayer {
  readonly config: LayerConfig;
  getWeightCount(): number;
  setWeights(source: Float32Array, offset: number): number;
  getWeights(target: Float32Array, offset: number): number;
  forward(input: Float32Array): Float32Array;
  getOutput(): Float32Array;
  reset(): void;
}

/**
 * Standard Fully Connected Dense Layer
 */
export class DenseLayer implements ILayer {
  public readonly config: LayerConfig;
  public readonly weights: Float32Array;
  public readonly bias: Float32Array;
  public readonly output: Float32Array;

  constructor(config: LayerConfig) {
    this.config = config;
    this.weights = new Float32Array(config.outFeatures * config.inFeatures);
    this.bias = new Float32Array(config.outFeatures);
    this.output = new Float32Array(config.outFeatures);
    this.initXavier();
  }

  private initXavier(): void {
    const scale = Math.sqrt(2.0 / (this.config.inFeatures + this.config.outFeatures));
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = (Math.random() * 2 - 1) * scale;
    }
    this.bias.fill(0.01);
  }

  public getWeightCount(): number {
    return this.weights.length + this.bias.length;
  }

  public setWeights(source: Float32Array, offset: number): number {
    let curr = offset;
    this.weights.set(source.subarray(curr, curr + this.weights.length));
    curr += this.weights.length;
    this.bias.set(source.subarray(curr, curr + this.bias.length));
    curr += this.bias.length;
    return curr;
  }

  public getWeights(target: Float32Array, offset: number): number {
    let curr = offset;
    target.set(this.weights, curr);
    curr += this.weights.length;
    target.set(this.bias, curr);
    curr += this.bias.length;
    return curr;
  }

  public forward(input: Float32Array): Float32Array {
    TensorOps.matVecMulAdd(
      this.weights,
      input,
      this.config.useBias ? this.bias : null,
      this.output,
      this.config.outFeatures,
      this.config.inFeatures
    );
    applyActivationInPlace(this.output, this.config.outFeatures, this.config.activation);
    return this.output;
  }

  public getOutput(): Float32Array {
    return this.output;
  }

  public reset(): void {
    this.output.fill(0);
  }
}

/**
 * ResNet Residual Block with Identity/Projection Skip Connection
 * output = Activation( Dense2( Activation( Dense1(input) ) ) + input )
 */
export class ResNetBlock implements ILayer {
  public readonly config: LayerConfig;
  private layer1: DenseLayer;
  private layer2: DenseLayer;
  public readonly output: Float32Array;

  constructor(config: LayerConfig) {
    this.config = config;
    const hiddenDim = config.outFeatures;
    this.layer1 = new DenseLayer({
      id: `${config.id}_res1`,
      type: 'dense',
      inFeatures: config.inFeatures,
      outFeatures: hiddenDim,
      activation: config.activation,
      useBias: config.useBias
    });
    this.layer2 = new DenseLayer({
      id: `${config.id}_res2`,
      type: 'dense',
      inFeatures: hiddenDim,
      outFeatures: config.outFeatures,
      activation: 'linear', // keep linear before skip sum
      useBias: config.useBias
    });
    this.output = new Float32Array(config.outFeatures);
  }

  public getWeightCount(): number {
    return this.layer1.getWeightCount() + this.layer2.getWeightCount();
  }

  public setWeights(source: Float32Array, offset: number): number {
    let curr = this.layer1.setWeights(source, offset);
    curr = this.layer2.setWeights(source, curr);
    return curr;
  }

  public getWeights(target: Float32Array, offset: number): number {
    let curr = this.layer1.getWeights(target, offset);
    curr = this.layer2.getWeights(target, curr);
    return curr;
  }

  public forward(input: Float32Array): Float32Array {
    const h1 = this.layer1.forward(input);
    const h2 = this.layer2.forward(h1);

    // Copy h2 to output
    TensorOps.copy(h2, this.output, this.config.outFeatures);

    // Add skip connection if shapes match, or copy directly
    const minDim = Math.min(input.length, this.config.outFeatures);
    for (let i = 0; i < minDim; i++) {
      this.output[i] += input[i];
    }

    // Final non-linearity after addition
    applyActivationInPlace(this.output, this.config.outFeatures, this.config.activation);
    return this.output;
  }

  public getOutput(): Float32Array {
    return this.output;
  }

  public reset(): void {
    this.layer1.reset();
    this.layer2.reset();
    this.output.fill(0);
  }
}

/**
 * Gated Recurrent Unit (GRU) Cell
 * Maintains hidden state vector across simulation steps, granting temporal memory.
 */
export class GRULayer implements ILayer {
  public readonly config: LayerConfig;
  private hiddenDim: number;
  private inDim: number;

  // Weight matrices: W_z, W_r, W_h for inputs (size hiddenDim * inDim)
  // Recurrent matrices: U_z, U_r, U_h for hidden state (size hiddenDim * hiddenDim)
  // Biases: b_z, b_r, b_h (size hiddenDim)
  public readonly Wz: Float32Array;
  public readonly Uz: Float32Array;
  public readonly bz: Float32Array;

  public readonly Wr: Float32Array;
  public readonly Ur: Float32Array;
  public readonly br: Float32Array;

  public readonly Wh: Float32Array;
  public readonly Uh: Float32Array;
  public readonly bh: Float32Array;

  // Preallocated internal state buffers
  private hState: Float32Array;
  private zGate: Float32Array;
  private rGate: Float32Array;
  private hCandidate: Float32Array;
  private rHidden: Float32Array;
  public readonly output: Float32Array;

  constructor(config: LayerConfig) {
    this.config = config;
    this.inDim = config.inFeatures;
    this.hiddenDim = config.outFeatures;

    const hSize = this.hiddenDim;
    const wSize = hSize * this.inDim;
    const uSize = hSize * hSize;

    this.Wz = new Float32Array(wSize);
    this.Uz = new Float32Array(uSize);
    this.bz = new Float32Array(hSize);

    this.Wr = new Float32Array(wSize);
    this.Ur = new Float32Array(uSize);
    this.br = new Float32Array(hSize);

    this.Wh = new Float32Array(wSize);
    this.Uh = new Float32Array(uSize);
    this.bh = new Float32Array(hSize);

    this.hState = new Float32Array(hSize);
    this.zGate = new Float32Array(hSize);
    this.rGate = new Float32Array(hSize);
    this.hCandidate = new Float32Array(hSize);
    this.rHidden = new Float32Array(hSize);
    this.output = new Float32Array(hSize);

    this.initWeights();
  }

  private initWeights(): void {
    const scale = Math.sqrt(2.0 / (this.inDim + this.hiddenDim));
    const arrays = [this.Wz, this.Uz, this.Wr, this.Ur, this.Wh, this.Uh];
    for (const arr of arrays) {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = (Math.random() * 2 - 1) * scale;
      }
    }
  }

  public getWeightCount(): number {
    return (
      this.Wz.length + this.Uz.length + this.bz.length +
      this.Wr.length + this.Ur.length + this.br.length +
      this.Wh.length + this.Uh.length + this.bh.length
    );
  }

  public setWeights(source: Float32Array, offset: number): number {
    let curr = offset;
    const targets = [
      this.Wz, this.Uz, this.bz,
      this.Wr, this.Ur, this.br,
      this.Wh, this.Uh, this.bh
    ];
    for (const t of targets) {
      t.set(source.subarray(curr, curr + t.length));
      curr += t.length;
    }
    return curr;
  }

  public getWeights(target: Float32Array, offset: number): number {
    let curr = offset;
    const sources = [
      this.Wz, this.Uz, this.bz,
      this.Wr, this.Ur, this.br,
      this.Wh, this.Uh, this.bh
    ];
    for (const s of sources) {
      target.set(s, curr);
      curr += s.length;
    }
    return curr;
  }

  public forward(input: Float32Array): Float32Array {
    const H = this.hiddenDim;
    const I = this.inDim;

    // 1. Update gate: z = sigmoid(Wz * x + Uz * h + bz)
    TensorOps.matVecMulAdd(this.Wz, input, this.bz, this.zGate, H, I);
    for (let r = 0; r < H; r++) {
      let sum = 0;
      for (let c = 0; c < H; c++) {
        sum += this.Uz[r * H + c] * this.hState[c];
      }
      this.zGate[r] += sum;
    }
    applyActivationInPlace(this.zGate, H, 'sigmoid');

    // 2. Reset gate: r = sigmoid(Wr * x + Ur * h + br)
    TensorOps.matVecMulAdd(this.Wr, input, this.br, this.rGate, H, I);
    for (let r = 0; r < H; r++) {
      let sum = 0;
      for (let c = 0; c < H; c++) {
        sum += this.Ur[r * H + c] * this.hState[c];
      }
      this.rGate[r] += sum;
    }
    applyActivationInPlace(this.rGate, H, 'sigmoid');

    // 3. Candidate: h_cand = tanh(Wh * x + Uh * (r * h) + bh)
    for (let i = 0; i < H; i++) {
      this.rHidden[i] = this.rGate[i] * this.hState[i];
    }
    TensorOps.matVecMulAdd(this.Wh, input, this.bh, this.hCandidate, H, I);
    for (let r = 0; r < H; r++) {
      let sum = 0;
      for (let c = 0; c < H; c++) {
        sum += this.Uh[r * H + c] * this.rHidden[c];
      }
      this.hCandidate[r] += sum;
    }
    applyActivationInPlace(this.hCandidate, H, 'tanh');

    // 4. Hidden state update: h = (1 - z) * h + z * h_cand
    for (let i = 0; i < H; i++) {
      const z = this.zGate[i];
      this.hState[i] = (1.0 - z) * this.hState[i] + z * this.hCandidate[i];
      this.output[i] = this.hState[i];
    }

    return this.output;
  }

  public getOutput(): Float32Array {
    return this.output;
  }

  public reset(): void {
    this.hState.fill(0);
    this.output.fill(0);
  }
}
