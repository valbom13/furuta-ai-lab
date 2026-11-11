/**
 * Modular Cart-Pole Inverted Pendulum Dynamics
 * 
 * Standard linear inverted pendulum on a motorized cart.
 * State: [x, alpha, xDot, alphaDot]
 * - x: Cart position along rail (m)
 * - alpha: Pole angle from upright (rad, 0 = upright)
 */

import { PhysicalState, CartPoleParams, PhysicalSystem } from './types.ts';
import { RK4Integrator } from './integrator.ts';

export class CartPole implements PhysicalSystem {
  public readonly id = 'cartpole';
  public readonly name = 'Pêndulo Invertido Linear (Cart-Pole)';

  private params: CartPoleParams;
  private integrator: RK4Integrator;
  private stateBuffer: Float64Array;
  private obsBuffer: Float64Array;
  private readonly cachedState: PhysicalState;
  private externalForce = 0;
  private externalPoleTorque = 0;
  private currentAppliedForce = 0;
  private readonly computeDerivativesBound: (s: Float64Array, out: Float64Array) => void;

  constructor(customParams?: Partial<CartPoleParams>) {
    this.stateBuffer = new Float64Array(4);
    this.obsBuffer = new Float64Array(6);
    this.cachedState = { theta: 0, alpha: 0, thetaDot: 0, alphaDot: 0 };
    this.integrator = new RK4Integrator(4);
    this.computeDerivativesBound = this.computeDerivatives.bind(this);

    this.params = {
      cartMass: 1.0,        // kg
      poleMass: 0.15,       // kg
      poleLength: 0.5,      // m (half-length com = 0.25)
      cartFriction: 0.1,    // N*s/m
      poleFriction: 0.001,  // N*m*s/rad
      gravity: 9.81,
      maxForce: 20.0,       // N
      trackLimit: 2.0,      // +- 2m
      ...customParams
    };

    this.reset();
  }

  public reset(initialState?: Partial<PhysicalState>): void {
    this.stateBuffer[0] = initialState?.theta ?? 0.0; // Cart position x
    this.stateBuffer[1] = initialState?.alpha ?? (Math.PI + (Math.random() - 0.5) * 0.1);
    this.stateBuffer[2] = initialState?.thetaDot ?? 0.0;
    this.stateBuffer[3] = initialState?.alphaDot ?? 0.0;
    this.externalForce = 0;
    this.externalPoleTorque = 0;
  }

  public getState(): Readonly<PhysicalState> {
    this.cachedState.theta = this.stateBuffer[0];
    this.cachedState.alpha = this.stateBuffer[1];
    this.cachedState.thetaDot = this.stateBuffer[2];
    this.cachedState.alphaDot = this.stateBuffer[3];
    return this.cachedState;
  }

  public getMaxControl(): number {
    return this.params.maxForce;
  }

  public applyImpulse(magnitude: number, onSecondary?: boolean): void {
    if (onSecondary) {
      this.externalPoleTorque += magnitude;
    } else {
      this.externalForce += magnitude;
    }
  }

  private computeDerivatives(s: Float64Array, out: Float64Array): void {
    const alpha = s[1];
    const xDot = s[2];
    const alphaDot = s[3];

    const sinA = Math.sin(alpha);
    const cosA = Math.cos(alpha);

    const mc = this.params.cartMass;
    const mp = this.params.poleMass;
    const l = this.params.poleLength * 0.5; // center of mass
    const g = this.params.gravity;
    const bc = this.params.cartFriction;
    const bp = this.params.poleFriction;

    // Nonlinear cartpole standard equations of motion:
    const mTotal = mc + mp;
    const inertiaPole = (4.0 / 3.0) * mp * l * l;
    const coupling = mp * l * cosA;

    const rhs1 = this.currentAppliedForce - bc * xDot + mp * l * sinA * alphaDot * alphaDot;
    const rhs2 = mp * g * l * sinA - bp * alphaDot + this.externalPoleTorque;

    const det = mTotal * inertiaPole - coupling * coupling;
    const invDet = 1.0 / Math.max(det, 1e-9);

    const xDdot = (inertiaPole * rhs1 - coupling * rhs2) * invDet;
    const alphaDdot = (-coupling * rhs1 + mTotal * rhs2) * invDet;

    out[0] = xDot;
    out[1] = alphaDot;
    out[2] = xDdot;
    out[3] = alphaDdot;
  }

  public step(controlInput: number, dt: number): void {
    const fClamped = Math.max(-this.params.maxForce, Math.min(this.params.maxForce, controlInput));
    this.currentAppliedForce = fClamped + this.externalForce;

    this.integrator.step(this.stateBuffer, dt, this.computeDerivativesBound);

    this.externalForce = 0;
    this.externalPoleTorque = 0;

    // Track bounds hard stop
    if (Math.abs(this.stateBuffer[0]) > this.params.trackLimit) {
      this.stateBuffer[0] = Math.sign(this.stateBuffer[0]) * this.params.trackLimit;
      this.stateBuffer[2] = 0; // Elastic/inelastic bounce
    }
  }


  public getObservation(noiseStd = 0.0): Float64Array {
    this.obsBuffer[0] = this.stateBuffer[0] + (noiseStd > 0 ? (Math.random() - 0.5) * 2 * noiseStd : 0);
    this.obsBuffer[1] = Math.sin(this.stateBuffer[1]);
    this.obsBuffer[2] = Math.cos(this.stateBuffer[1]);
    this.obsBuffer[3] = this.stateBuffer[2] + (noiseStd > 0 ? (Math.random() - 0.5) * 2 * noiseStd : 0);
    this.obsBuffer[4] = this.stateBuffer[3] + (noiseStd > 0 ? (Math.random() - 0.5) * 2 * noiseStd : 0);
    return this.obsBuffer;
  }

  public getKineticEnergy(): number {
    const xDot = this.stateBuffer[2];
    const alphaDot = this.stateBuffer[3];
    const mc = this.params.cartMass;
    const mp = this.params.poleMass;
    const l = this.params.poleLength * 0.5;
    const cosA = Math.cos(this.stateBuffer[1]);
    const inertiaPole = (4.0 / 3.0) * mp * l * l;
    return 0.5 * (mc + mp) * xDot * xDot + mp * l * xDot * alphaDot * cosA + 0.5 * inertiaPole * alphaDot * alphaDot;
  }

  public getPotentialEnergy(): number {
    const alpha = this.stateBuffer[1];
    const l = this.params.poleLength * 0.5;
    return this.params.poleMass * this.params.gravity * l * Math.cos(alpha);
  }

  public getTotalEnergy(): number {
    return this.getKineticEnergy() + this.getPotentialEnergy();
  }
}
