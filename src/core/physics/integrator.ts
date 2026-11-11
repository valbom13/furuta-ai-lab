/**
 * Runge-Kutta 4th Order (RK4) Numerical Integrator
 * Designed with pre-allocated Float64Array buffers for zero garbage collection.
 */

export type DerivativeFn = (state: Float64Array, outDerivatives: Float64Array) => void;

export class RK4Integrator {
  private readonly dimension: number;
  private readonly k1: Float64Array;
  private readonly k2: Float64Array;
  private readonly k3: Float64Array;
  private readonly k4: Float64Array;
  private readonly tempState: Float64Array;

  constructor(dimension: number) {
    this.dimension = dimension;
    this.k1 = new Float64Array(dimension);
    this.k2 = new Float64Array(dimension);
    this.k3 = new Float64Array(dimension);
    this.k4 = new Float64Array(dimension);
    this.tempState = new Float64Array(dimension);
  }

  /**
   * Advances the system state by dt using standard 4th-order Runge-Kutta.
   * Modifies `state` in-place without any heap allocation.
   */
  public step(state: Float64Array, dt: number, computeDerivatives: DerivativeFn): void {
    const dim = this.dimension;
    const halfDt = dt * 0.5;
    const sixthDt = dt / 6.0;

    // k1 = f(t, y)
    computeDerivatives(state, this.k1);

    // k2 = f(t + dt/2, y + dt/2 * k1)
    for (let i = 0; i < dim; i++) {
      this.tempState[i] = state[i] + halfDt * this.k1[i];
    }
    computeDerivatives(this.tempState, this.k2);

    // k3 = f(t + dt/2, y + dt/2 * k2)
    for (let i = 0; i < dim; i++) {
      this.tempState[i] = state[i] + halfDt * this.k2[i];
    }
    computeDerivatives(this.tempState, this.k3);

    // k4 = f(t + dt, y + dt * k3)
    for (let i = 0; i < dim; i++) {
      this.tempState[i] = state[i] + dt * this.k3[i];
    }
    computeDerivatives(this.tempState, this.k4);

    // y_{n+1} = y_n + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
    for (let i = 0; i < dim; i++) {
      state[i] += sixthDt * (this.k1[i] + 2.0 * this.k2[i] + 2.0 * this.k3[i] + this.k4[i]);
    }
  }
}
