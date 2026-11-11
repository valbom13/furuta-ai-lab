/**
 * Physical Mechanics & Energy Conservation Test Suite
 */

import { describe, it, expect } from 'vitest';
import { FurutaPendulum } from '../src/core/physics/furuta.ts';
import { CartPole } from '../src/core/physics/cartpole.ts';
import { GantryCrane } from '../src/core/physics/crane.ts';
import { DCMotor } from '../src/core/physics/motor.ts';
import { calculateCylinderMass, calculateRodPivotInertia, MATERIALS } from '../src/core/physics/materials.ts';

describe('Physics Engine: Mechanics & Integrator Verification', () => {
  it('conserves total mechanical energy (E = T + V) in unforced conservative system over 10,000 steps', () => {
    // Zero motor torque and zero friction
    const furuta = new FurutaPendulum({
      motor: {
        resistance: 8.4,
        torqueConstant: 0.042,
        backEmfConstant: 0.042,
        maxVoltage: 0.0,
        maxTorque: 0.0,
        gearRatio: 1.0,
        efficiency: 1.0
      },
      friction: {
        viscousArm: 0.0,
        viscousPendulum: 0.0,
        coulombArm: 0.0,
        coulombPendulum: 0.0
      }
    });

    // Release from non-trivial initial position with arm velocity
    furuta.reset({
      theta: 0.2,
      alpha: 0.5, // 0.5 rad (~28 deg) tilt
      thetaDot: 0.5,
      alphaDot: 0.0
    });

    const initialEnergy = furuta.getTotalEnergy();
    expect(Number.isFinite(initialEnergy)).toBe(true);

    const dt = 0.005; // 200 Hz
    const steps = 10000; // 50 seconds of real-time simulation

    let minEnergy = initialEnergy;
    let maxEnergy = initialEnergy;

    for (let i = 0; i < steps; i++) {
      furuta.step(0.0, dt);
      const e = furuta.getTotalEnergy();
      if (e < minEnergy) minEnergy = e;
      if (e > maxEnergy) maxEnergy = e;
    }

    const relativeDrift = Math.abs(maxEnergy - minEnergy) / Math.abs(initialEnergy);

    // RK4 energy drift over 10,000 steps should be under 0.1% (1e-3)
    expect(relativeDrift).toBeLessThan(0.001);
  });

  it('verifies DC motor Back-EMF limits arm terminal velocity to Vin / Kb', () => {
    const motor = new DCMotor(
      {
        resistance: 2.0,
        torqueConstant: 0.05,
        backEmfConstant: 0.05,
        maxVoltage: 10.0,
        maxTorque: 10.0,
        gearRatio: 1.0,
        efficiency: 1.0
      },
      {
        viscousArm: 0.0,
        viscousPendulum: 0.0,
        coulombArm: 0.0,
        coulombPendulum: 0.0
      }
    );

    // At standstill (omega = 0), torque is maximum: Kt * (Vin / R) = 0.05 * (10 / 2) = 0.25 N*m
    const stallTorque = motor.computeTorque(10.0, 0.0);
    expect(stallTorque).toBeCloseTo(0.25, 4);

    // At theoretical terminal speed omega = Vin / Kb = 10 / 0.05 = 200 rad/s:
    // Back-EMF = 10V, current = 0, output torque = 0
    const terminalTorque = motor.computeTorque(10.0, 200.0);
    expect(terminalTorque).toBeCloseTo(0.0, 4);

    // Above terminal speed, back-EMF exceeds Vin and motor acts as regenerative brake (negative torque)
    const brakingTorque = motor.computeTorque(10.0, 250.0);
    expect(brakingTorque).toBeLessThan(0);
  });

  it('correctly recalculates mass and inertia when material switches to Naval Brass', () => {
    const r = 0.005;
    const L = 0.3;
    const massAluminum = calculateCylinderMass(r, L, MATERIALS.aluminum.density);
    const massBrass = calculateCylinderMass(r, L, MATERIALS.brass.density);

    // Brass (8500 kg/m^3) should be ~3.15x heavier than Aluminum (2700 kg/m^3)
    const ratio = massBrass / massAluminum;
    expect(ratio).toBeCloseTo(8500 / 2700, 2);

    const inertiaAl = calculateRodPivotInertia(massAluminum, L, r);
    const inertiaBrass = calculateRodPivotInertia(massBrass, L, r);
    expect(inertiaBrass / inertiaAl).toBeCloseTo(ratio, 2);
  });

  it('conserves mechanical energy in Cart-Pole conservative system over 5,000 steps', () => {
    const cartpole = new CartPole({
      cartFriction: 0.0,
      poleFriction: 0.0,
      maxForce: 0.0,
      trackLimit: 100.0 // prevent bound bounce during conservative drift test
    });

    cartpole.reset({
      theta: 0.0,  // cart x = 0
      alpha: 0.25, // small angle ~14 deg
      thetaDot: 0.0,
      alphaDot: 0.0
    });

    const initialEnergy = cartpole.getTotalEnergy();
    expect(Number.isFinite(initialEnergy)).toBe(true);

    const dt = 0.005;
    let minEnergy = initialEnergy;
    let maxEnergy = initialEnergy;

    for (let i = 0; i < 5000; i++) {
      cartpole.step(0.0, dt);
      const e = cartpole.getTotalEnergy();
      if (e < minEnergy) minEnergy = e;
      if (e > maxEnergy) maxEnergy = e;
    }

    const relativeDrift = Math.abs(maxEnergy - minEnergy) / Math.abs(initialEnergy);
    expect(relativeDrift).toBeLessThan(0.002);
  });

  it('conserves mechanical energy in Gantry Crane conservative system over 5,000 steps', () => {
    const crane = new GantryCrane({
      damping: 0.0,
      maxForce: 0.0,
      trackLimit: 100.0
    });

    crane.reset({
      theta: 0.0,
      alpha: 0.2, // swing angle
      thetaDot: 0.0,
      alphaDot: 0.0
    });

    const initialEnergy = crane.getTotalEnergy();
    expect(Number.isFinite(initialEnergy)).toBe(true);

    const dt = 0.005;
    let minEnergy = initialEnergy;
    let maxEnergy = initialEnergy;

    for (let i = 0; i < 5000; i++) {
      crane.step(0.0, dt);
      const e = crane.getTotalEnergy();
      if (e < minEnergy) minEnergy = e;
      if (e > maxEnergy) maxEnergy = e;
    }

    const relativeDrift = Math.abs(maxEnergy - minEnergy) / Math.abs(initialEnergy);
    expect(relativeDrift).toBeLessThan(0.002);
  });
});
