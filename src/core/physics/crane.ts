/**
 * Modular Overhead Gantry Crane Dynamics
 * 
 * Simulates an industrial crane trolley transporting a suspended payload.
 * Goal: Move trolley to target position while eliminating payload swing oscillation.
 * State: [x, alpha, xDot, alphaDot]
 * - x: Trolley position (m)
 * - alpha: Cable swing angle (rad, 0 = downward rest, target is zero swing)
 */

import { PhysicalState, CraneParams, PhysicalSystem } from './types.ts';
import { RK4Integrator } from './integrator.ts';

export class GantryCrane implements PhysicalSystem {
  public readonly id = 'crane';
  public readonly name = 'Ponte Rolante Industrial (Anti-Swing)';

  private params: CraneParams;
  private integrator: RK4Integrator;
  private stateBuffer: Float64Array;
  private obsBuffer: Float64Array;
  private readonly cachedState: PhysicalState;
  private externalForce = 0;
  private externalPayloadTorque = 0;
  private currentAppliedForce = 0;
  private readonly computeDerivativesBound: (s: Float64Array, out: Float64Array) => void;

  constructor(customParams?: Partial<CraneParams>) {
    this.stateBuffer = new Float64Array(4);
    this.obsBuffer = new Float64Array(6);
    this.cachedState = { theta: 0, alpha: 0, thetaDot: 0, alphaDot: 0 };
    this.integrator = new RK4Integrator(4);
    this.computeDerivativesBound = this.computeDerivatives.bind(this);

    this.params = {
      trolleyMass: 5.0,     // kg
      payloadMass: 1.0,     // kg
      cableLength: 1.0,     // m
      damping: 0.05,        // N*s/m
      gravity: 9.81,
      maxForce: 50.0,       // N
      trackLimit: 3.0,      // +- 3m
      ...customParams
    };

    this.reset();
  }

  public reset(initialState?: Partial<PhysicalState>): void {
    this.stateBuffer[0] = initialState?.theta ?? -1.5; // Start away from origin
    this.stateBuffer[1] = initialState?.alpha ?? (0.3); // Initial swing angle
    this.stateBuffer[2] = initialState?.thetaDot ?? 0.0;
    this.stateBuffer[3] = initialState?.alphaDot ?? 0.0;
    this.externalForce = 0;
    this.externalPayloadTorque = 0;
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
      this.externalPayloadTorque += magnitude;
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

    const M = this.params.trolleyMass;
    const m = this.params.payloadMass;
    const L = this.params.cableLength;
    const g = this.params.gravity;
    const b = this.params.damping;

    // Crane equations of motion:
    const mTotal = M + m;
    const jPayload = m * L * L;
    const coupling = m * L * cosA;

    const rhs1 = this.currentAppliedForce - b * xDot + m * L * sinA * alphaDot * alphaDot;
    const rhs2 = -m * g * L * sinA - (b * 0.1) * alphaDot + this.externalPayloadTorque;

    const det = mTotal * jPayload - coupling * coupling;
    const invDet = 1.0 / Math.max(det, 1e-9);

    const xDdot = (jPayload * rhs1 - coupling * rhs2) * invDet;
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
    this.externalPayloadTorque = 0;

    if (Math.abs(this.stateBuffer[0]) > this.params.trackLimit) {
      this.stateBuffer[0] = Math.sign(this.stateBuffer[0]) * this.params.trackLimit;
      this.stateBuffer[2] = 0;
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
    const M = this.params.trolleyMass;
    const m = this.params.payloadMass;
    const L = this.params.cableLength;
    const cosA = Math.cos(this.stateBuffer[1]);
    return 0.5 * (M + m) * xDot * xDot + m * L * xDot * alphaDot * cosA + 0.5 * m * L * L * alphaDot * alphaDot;
  }

  public getPotentialEnergy(): number {
    const alpha = this.stateBuffer[1];
    const L = this.params.cableLength;
    return -this.params.payloadMass * this.params.gravity * L * Math.cos(alpha);
  }

  public getTotalEnergy(): number {
    return this.getKineticEnergy() + this.getPotentialEnergy();
  }
}
