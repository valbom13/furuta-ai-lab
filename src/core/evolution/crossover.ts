/**
 * Crossover Operators for Continuous Real-Valued Genomes
 * BLX-alpha, Arithmetic, Single-Point, and Uniform.
 */

import { CrossoverMethod } from './types.ts';

export class CrossoverOperators {
  /**
   * Applies the chosen crossover operator between parentA and parentB into outOffspring.
   */
  public static crossover(
    parentA: Float32Array,
    parentB: Float32Array,
    outOffspring: Float32Array,
    method: CrossoverMethod,
    blxAlpha = 0.5
  ): void {
    const len = parentA.length;
    switch (method) {
      case 'blx_alpha':
        this.blxAlpha(parentA, parentB, outOffspring, len, blxAlpha);
        break;
      case 'arithmetic':
        this.arithmetic(parentA, parentB, outOffspring, len);
        break;
      case 'single_point':
        this.singlePoint(parentA, parentB, outOffspring, len);
        break;
      case 'uniform':
      default:
        this.uniform(parentA, parentB, outOffspring, len);
        break;
    }
  }

  /**
   * BLX-alpha (Blend Crossover):
   * For each gene:
   * cMin = min(p1, p2), cMax = max(p1, p2), I = cMax - cMin
   * gene = uniform(cMin - alpha * I, cMax + alpha * I)
   */
  public static blxAlpha(
    p1: Float32Array,
    p2: Float32Array,
    out: Float32Array,
    len: number,
    alpha = 0.5
  ): void {
    for (let i = 0; i < len; i++) {
      const v1 = p1[i];
      const v2 = p2[i];
      const min = Math.min(v1, v2);
      const max = Math.max(v1, v2);
      const range = max - min;
      const lower = min - alpha * range;
      const upper = max + alpha * range;
      out[i] = lower + Math.random() * (upper - lower);
    }
  }

  /**
   * Arithmetic Crossover:
   * out = gamma * p1 + (1 - gamma) * p2
   */
  public static arithmetic(
    p1: Float32Array,
    p2: Float32Array,
    out: Float32Array,
    len: number
  ): void {
    const gamma = Math.random();
    const oneMinusGamma = 1.0 - gamma;
    for (let i = 0; i < len; i++) {
      out[i] = gamma * p1[i] + oneMinusGamma * p2[i];
    }
  }

  /**
   * Single-Point Crossover:
   * Splits at random index k.
   */
  public static singlePoint(
    p1: Float32Array,
    p2: Float32Array,
    out: Float32Array,
    len: number
  ): void {
    const cut = Math.floor(Math.random() * len);
    out.set(p1.subarray(0, cut), 0);
    out.set(p2.subarray(cut, len), cut);
  }

  /**
   * Uniform Crossover:
   * 50% coin flip per gene.
   */
  public static uniform(
    p1: Float32Array,
    p2: Float32Array,
    out: Float32Array,
    len: number
  ): void {
    for (let i = 0; i < len; i++) {
      out[i] = Math.random() < 0.5 ? p1[i] : p2[i];
    }
  }
}
