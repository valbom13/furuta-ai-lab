/**
 * Physical System Types and Configuration
 */

export interface PhysicalState {
  theta: number;       // Arm angle (rad)
  alpha: number;       // Pendulum angle (rad, 0 = upright, pi = hanging down)
  thetaDot: number;    // Arm angular velocity (rad/s)
  alphaDot: number;    // Pendulum angular velocity (rad/s)
}

export interface MotorConfig {
  resistance: number;       // Armature resistance R (Ohms), e.g. 8.4
  torqueConstant: number;   // Motor torque constant Kt (N*m/A), e.g. 0.042
  backEmfConstant: number;  // Back-EMF constant Kb (V*s/rad), e.g. 0.042
  maxVoltage: number;       // Maximum applied voltage V (V), e.g. 12.0 or 24.0
  maxTorque: number;        // Torque saturation limit (N*m), e.g. 1.5
  gearRatio: number;        // Internal or external gear ratio Kg, e.g. 1.0
  efficiency: number;       // Gearbox/motor efficiency eta, e.g. 0.9
}

export interface FrictionConfig {
  viscousArm: number;       // Viscous damping coefficient b1 (N*m*s/rad)
  viscousPendulum: number;  // Viscous damping coefficient b2 (N*m*s/rad)
  coulombArm: number;       // Static/Coulomb friction torque on arm (N*m)
  coulombPendulum: number;  // Static/Coulomb friction torque on pendulum (N*m)
}

export interface MaterialProperties {
  name: string;
  density: number;          // Density in kg/m^3 (e.g. Aluminum ~2700, Brass ~8500, Steel ~7850)
  color: string;            // Visual hex color
  roughness: number;        // PBR roughness
  metalness: number;        // PBR metalness
  description: string;
}

export interface FurutaParams {
  armLength: number;        // Lr: length of rotary arm (m), e.g. 0.216
  armRadius: number;        // Radius of cylindrical rotary arm (m), e.g. 0.008
  armMass: number;          // mr: mass of rotary arm (kg)
  armInertia: number;       // Jr: moment of inertia of rotary arm (kg*m^2)

  pendulumLength: number;   // Lp: total length of pendulum rod (m), e.g. 0.337
  pendulumRadius: number;   // Radius of cylindrical pendulum rod (m), e.g. 0.005
  pendulumMass: number;     // mp: mass of pendulum rod (kg)
  pendulumCom: number;      // lp: distance from pivot to COM (m), typically Lp / 2
  pendulumInertia: number;  // Jp: moment of inertia about COM (kg*m^2)

  gravity: number;          // g: gravitational acceleration (m/s^2), 9.81
  motor: MotorConfig;
  friction: FrictionConfig;

  armMaterial: string;
  pendulumMaterial: string;
}

export interface CartPoleParams {
  cartMass: number;         // Mass of the cart (kg)
  poleMass: number;         // Mass of the pole (kg)
  poleLength: number;       // Half-length or full length of pole (m)
  cartFriction: number;     // Cart track friction
  poleFriction: number;     // Pole joint friction
  gravity: number;
  maxForce: number;         // Force limit (N)
  trackLimit: number;       // Rail limit (+- m)
}

export interface CraneParams {
  trolleyMass: number;      // Mass of trolley (kg)
  payloadMass: number;      // Mass of suspended payload (kg)
  cableLength: number;      // Cable length (m)
  damping: number;          // Aerodynamic and cable damping
  gravity: number;
  maxForce: number;         // Max trolley motor force (N)
  trackLimit: number;
}

export interface PhysicalSystem {
  readonly id: string;
  readonly name: string;
  reset(initialState?: Partial<PhysicalState>): void;
  step(controlInput: number, dt: number): void;
  getState(): Readonly<PhysicalState>;
  getObservation(noiseStd?: number): Float64Array;
  getKineticEnergy(): number;
  getPotentialEnergy(): number;
  getTotalEnergy(): number;
  applyImpulse(magnitude: number, onSecondary?: boolean): void;
  getMaxControl(): number;
}

