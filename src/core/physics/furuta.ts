/**
 * Furuta Rotary Inverted Pendulum Dynamics
 * 
 * Implements Euler-Lagrange equations of motion for 2-DOF system:
 * - Arm rotation (theta) in horizontal plane
 * - Pendulum rotation (alpha) in vertical plane perpendicular to arm
 * Alpha convention:
 *   alpha = 0: Upright inverted position (unstable target equilibrium)
 *   alpha = pi: Hanging downward position (stable rest equilibrium)
 */

import { PhysicalState, FurutaParams, PhysicalSystem } from './types.ts';
import { DCMotor } from './motor.ts';
import { RK4Integrator } from './integrator.ts';
import { calculateCylinderMass, calculateRodComInertia, calculateRodPivotInertia, MATERIALS } from './materials.ts';

export class FurutaPendulum implements PhysicalSystem {
  public readonly id = 'furuta';
  public readonly name = 'Pêndulo Rotativo de Furuta';

  private params: FurutaParams;
  private motor: DCMotor;
  private integrator: RK4Integrator;

  // State: [theta, alpha, thetaDot, alphaDot]
  private readonly stateBuffer: Float64Array;
  private readonly obsBuffer: Float64Array;
  private readonly cachedState: PhysicalState;
  private externalArmTorque = 0;
  private externalPendulumTorque = 0;
  private currentControlVoltage = 0;
  private readonly computeDerivativesBound: (s: Float64Array, out: Float64Array) => void;

  constructor(customParams?: Partial<FurutaParams>) {
    this.stateBuffer = new Float64Array(4);
    this.obsBuffer = new Float64Array(6); // [theta, sin(alpha), cos(alpha), thetaDot, alphaDot, V_applied]
    this.cachedState = { theta: 0, alpha: 0, thetaDot: 0, alphaDot: 0 };
    this.integrator = new RK4Integrator(4);
    this.computeDerivativesBound = this.computeDerivatives.bind(this);

    this.params = this.createDefaultParams();
    this.motor = new DCMotor(this.params.motor, this.params.friction);
    if (customParams) {
      this.updateParams(customParams);
    } else {
      this.recalculateInertias();
    }
    this.reset();
  }


  public createDefaultParams(): FurutaParams {
    const armMat = MATERIALS.aluminum;
    const pendMat = MATERIALS.steel;

    const armLength = 0.216; // meters
    const armRadius = 0.008; // meters
    const armMass = calculateCylinderMass(armRadius, armLength, armMat.density);
    const armInertia = calculateRodPivotInertia(armMass, armLength, armRadius);

    const pendLength = 0.337; // meters
    const pendRadius = 0.005; // meters
    const pendMass = calculateCylinderMass(pendRadius, pendLength, pendMat.density);
    const pendCom = pendLength / 2.0;
    const pendInertia = calculateRodComInertia(pendMass, pendLength, pendRadius);

    return {
      armLength,
      armRadius,
      armMass,
      armInertia,
      pendulumLength: pendLength,
      pendulumRadius: pendRadius,
      pendulumMass: pendMass,
      pendulumCom: pendCom,
      pendulumInertia: pendInertia,
      gravity: 9.81,
      motor: {
        resistance: 8.4,        // Ohms
        torqueConstant: 0.042,  // N*m/A
        backEmfConstant: 0.042, // V*s/rad
        maxVoltage: 12.0,       // Volts
        maxTorque: 1.5,         // N*m
        gearRatio: 1.0,
        efficiency: 0.95
      },
      friction: {
        viscousArm: 0.0015,
        viscousPendulum: 0.0005,
        coulombArm: 0.002,
        coulombPendulum: 0.0005
      },
      armMaterial: 'aluminum',
      pendulumMaterial: 'steel'
    };
  }

  /**
   * Recalculates masses and moments of inertia when materials or dimensions change.
   */
  public recalculateInertias(): void {
    const armMat = MATERIALS[this.params.armMaterial] || MATERIALS.aluminum;
    const pendMat = MATERIALS[this.params.pendulumMaterial] || MATERIALS.steel;

    this.params.armMass = calculateCylinderMass(this.params.armRadius, this.params.armLength, armMat.density);
    this.params.armInertia = calculateRodPivotInertia(this.params.armMass, this.params.armLength, this.params.armRadius);

    this.params.pendulumMass = calculateCylinderMass(this.params.pendulumRadius, this.params.pendulumLength, pendMat.density);
    this.params.pendulumCom = this.params.pendulumLength / 2.0;
    this.params.pendulumInertia = calculateRodComInertia(this.params.pendulumMass, this.params.pendulumLength, this.params.pendulumRadius);
  }

  public updateParams(partial: Partial<FurutaParams>): void {
    Object.assign(this.params, partial);
    this.recalculateInertias();
    if (this.motor) {
      this.motor.updateConfig(this.params.motor, this.params.friction);
    }
  }

  public getParams(): Readonly<FurutaParams> {
    return this.params;
  }

  /**
   * Resets the system to initial conditions.
   * By default, starts near downward position (alpha = pi) with tiny random perturbation.
   */
  public reset(initialState?: Partial<PhysicalState>): void {
    this.stateBuffer[0] = initialState?.theta ?? 0.0;
    // Default alpha is hanging down (Math.PI) plus slight noise
    this.stateBuffer[1] = initialState?.alpha ?? (Math.PI + (Math.random() - 0.5) * 0.05);
    this.stateBuffer[2] = initialState?.thetaDot ?? 0.0;
    this.stateBuffer[3] = initialState?.alphaDot ?? 0.0;
    this.externalArmTorque = 0;
    this.externalPendulumTorque = 0;
  }

  public getState(): Readonly<PhysicalState> {
    this.cachedState.theta = this.stateBuffer[0];
    this.cachedState.alpha = this.stateBuffer[1];
    this.cachedState.thetaDot = this.stateBuffer[2];
    this.cachedState.alphaDot = this.stateBuffer[3];
    return this.cachedState;
  }

  public getMaxControl(): number {
    return this.params.motor.maxVoltage;
  }

  public getStateBuffer(): Float64Array {
    return this.stateBuffer;
  }

  public applyImpulse(torque: number, onPendulum = true): void {
    if (onPendulum) {
      this.externalPendulumTorque += torque;
    } else {
      this.externalArmTorque += torque;
    }
  }

  /**
   * Evaluates Euler-Lagrange derivatives at state s with velocity-dependent forces.
   */
  private computeDerivatives(s: Float64Array, out: Float64Array): void {
    const alpha = s[1];
    const thetaDot = s[2];
    const alphaDot = s[3];

    // Compute motor torque and friction at intermediate state velocities for 4th-order accuracy
    const motorTorque = this.motor.computeTorque(this.currentControlVoltage, thetaDot);
    const fArm = this.motor.computeFriction(thetaDot, this.params.friction.viscousArm, this.params.friction.coulombArm);
    const fPend = this.motor.computeFriction(alphaDot, this.params.friction.viscousPendulum, this.params.friction.coulombPendulum);

    const totalArmTorque = motorTorque + fArm + this.externalArmTorque;
    const totalPendTorque = fPend + this.externalPendulumTorque;

    const sinAlpha = Math.sin(alpha);
    const cosAlpha = Math.cos(alpha);
    const sin2Alpha = sinAlpha * sinAlpha;

    const Jr = this.params.armInertia;
    const mp = this.params.pendulumMass;
    const Lr = this.params.armLength;
    const lp = this.params.pendulumCom;
    const Jp = this.params.pendulumInertia;
    const g = this.params.gravity;

    const Jarm = Jr + mp * Lr * Lr;
    const Jpend = Jp + mp * lp * lp;
    const mc = mp * Lr * lp;

    // Inertia Matrix M(q)
    const M11 = Jarm + mp * lp * lp * sin2Alpha;
    const M12 = mc * cosAlpha;
    const M21 = M12;
    const M22 = Jpend;

    const detM = M11 * M22 - M12 * M21;

    // Generalized forces RHS
    const F1 = totalArmTorque - 2.0 * mp * lp * lp * sinAlpha * cosAlpha * alphaDot * thetaDot + mc * sinAlpha * alphaDot * alphaDot;
    const F2 = totalPendTorque + mp * lp * lp * sinAlpha * cosAlpha * thetaDot * thetaDot + mp * g * lp * sinAlpha;

    // Accelerations via Cramer's rule / 2x2 inverse
    const invDet = 1.0 / Math.max(detM, 1e-9);
    const thetaDdot = (M22 * F1 - M12 * F2) * invDet;
    const alphaDdot = (-M21 * F1 + M11 * F2) * invDet;

    out[0] = thetaDot;
    out[1] = alphaDot;
    out[2] = thetaDdot;
    out[3] = alphaDdot;
  }

  /**
   * Performs one physical simulation step of duration dt (typically 0.005s = 200Hz).
   */
  public step(controlVoltage: number, dt: number): void {
    this.currentControlVoltage = controlVoltage;
    this.integrator.step(this.stateBuffer, dt, this.computeDerivativesBound);

    // Clear one-shot impulses after step
    this.externalArmTorque = 0;
    this.externalPendulumTorque = 0;

    // Keep alpha wrapped smoothly to [-pi, pi] for numerical representation
    this.normalizeAngles();
  }


  /**
   * Wraps angle alpha into [-PI, PI] and checks for NaNs.
   */
  private normalizeAngles(): void {
    let alpha = this.stateBuffer[1];
    alpha = ((alpha + Math.PI) % (2.0 * Math.PI) + (2.0 * Math.PI)) % (2.0 * Math.PI) - Math.PI;
    this.stateBuffer[1] = alpha;

    // Safety check for numerical stability
    for (let i = 0; i < 4; i++) {
      if (!Number.isFinite(this.stateBuffer[i])) {
        this.reset();
        break;
      }
    }
  }

  /**
   * Returns observation vector: [theta, sin(alpha), cos(alpha), thetaDot, alphaDot, voltage]
   */
  public getObservation(noiseStd = 0.0): Float64Array {
    const theta = this.stateBuffer[0];
    const alpha = this.stateBuffer[1];
    const thetaDot = this.stateBuffer[2];
    const alphaDot = this.stateBuffer[3];

    this.obsBuffer[0] = theta + (noiseStd > 0 ? (Math.random() - 0.5) * 2 * noiseStd : 0);
    this.obsBuffer[1] = Math.sin(alpha);
    this.obsBuffer[2] = Math.cos(alpha);
    this.obsBuffer[3] = thetaDot + (noiseStd > 0 ? (Math.random() - 0.5) * 2 * noiseStd : 0);
    this.obsBuffer[4] = alphaDot + (noiseStd > 0 ? (Math.random() - 0.5) * 2 * noiseStd : 0);
    return this.obsBuffer;
  }

  /**
   * Kinetic Energy: T = 1/2 * thetaDot^2 * (Jarm + mp*lp^2*sin^2(alpha)) + 1/2 * Jpend * alphaDot^2 + mp*Lr*lp*cos(alpha)*thetaDot*alphaDot
   */
  public getKineticEnergy(): number {
    const alpha = this.stateBuffer[1];
    const thetaDot = this.stateBuffer[2];
    const alphaDot = this.stateBuffer[3];

    const sinAlpha = Math.sin(alpha);
    const cosAlpha = Math.cos(alpha);

    const Jr = this.params.armInertia;
    const mp = this.params.pendulumMass;
    const Lr = this.params.armLength;
    const lp = this.params.pendulumCom;
    const Jp = this.params.pendulumInertia;

    const Jarm = Jr + mp * Lr * Lr;
    const Jpend = Jp + mp * lp * lp;
    const mc = mp * Lr * lp;

    const T1 = 0.5 * (Jarm + mp * lp * lp * sinAlpha * sinAlpha) * thetaDot * thetaDot;
    const T2 = 0.5 * Jpend * alphaDot * alphaDot;
    const T3 = mc * cosAlpha * thetaDot * alphaDot;

    return T1 + T2 + T3;
  }

  /**
   * Potential Energy: V = mp * g * lp * cos(alpha)
   * alpha = 0 (upright) => V = +mp*g*lp
   * alpha = pi (down)   => V = -mp*g*lp
   */
  public getPotentialEnergy(): number {
    const alpha = this.stateBuffer[1];
    const mp = this.params.pendulumMass;
    const lp = this.params.pendulumCom;
    const g = this.params.gravity;
    return mp * g * lp * Math.cos(alpha);
  }

  public getTotalEnergy(): number {
    return this.getKineticEnergy() + this.getPotentialEnergy();
  }
}
