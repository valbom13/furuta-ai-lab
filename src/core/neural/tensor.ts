/**
 * High-performance Float32Array Tensor Operations
 * Zero-garbage-collection linear algebra primitives for neural forward passes.
 */

export class TensorOps {
  /**
   * General Matrix-Vector Multiplication with Bias:
   * out = W * x + b
   * 
   * @param weights Matrix W of shape [outFeatures, inFeatures], flattened row-major
   * @param input Vector x of length inFeatures
   * @param bias Vector b of length outFeatures (can be null/empty)
   * @param output Destination vector of length outFeatures (modified in-place)
   */
  public static matVecMulAdd(
    weights: Float32Array,
    input: Float32Array,
    bias: Float32Array | null,
    output: Float32Array,
    outFeatures: number,
    inFeatures: number
  ): void {
    let wIdx = 0;
    for (let r = 0; r < outFeatures; r++) {
      let sum = bias !== null ? bias[r] : 0.0;
      // Loop unrolling for 4x vectorization
      let c = 0;
      const unrollLimit = inFeatures - 3;
      for (; c < unrollLimit; c += 4) {
        sum += weights[wIdx] * input[c] +
               weights[wIdx + 1] * input[c + 1] +
               weights[wIdx + 2] * input[c + 2] +
               weights[wIdx + 3] * input[c + 3];
        wIdx += 4;
      }
      for (; c < inFeatures; c++) {
        sum += weights[wIdx++] * input[c];
      }
      output[r] = sum;
    }
  }

  /**
   * Vector element-wise addition: out[i] += addend[i]
   */
  public static addInPlace(target: Float32Array, addend: Float32Array, length: number): void {
    for (let i = 0; i < length; i++) {
      target[i] += addend[i];
    }
  }

  /**
   * Vector copy: dst[i] = src[i]
   */
  public static copy(src: Float32Array, dst: Float32Array, length: number): void {
    dst.set(src.subarray(0, length));
  }

  /**
   * Dot product of two vectors
   */
  public static dot(a: Float32Array, b: Float32Array, length: number): number {
    let sum = 0.0;
    for (let i = 0; i < length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }
}
