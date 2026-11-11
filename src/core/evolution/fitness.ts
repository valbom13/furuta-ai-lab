/**
 * Multi-Objective Fitness Evaluation
 * Balances inverted stability, energy efficiency, mechanical jerk, and centering.
 */

import { FitnessWeights } from './types.ts';
import { PhysicalState } from '../physics/types.ts';

export class FitnessEvaluator {
  private weights: FitnessWeights;

  constructor(weights?: Partial<FitnessWeights>) {
    this.weights = {
      uprightReward: 1.0,
      balanceBonus: 2.0,
      voltagePenalty: 0.05,
      jerkPenalty: 0.01,
      centerPenalty: 0.1,
      survivalReward: 0.1,
      ...weights
    };
  }

  public updateWeights(weights: Partial<FitnessWeights>): void {
    Object.assign(this.weights, weights);
  }

  public getWeights(): Readonly<FitnessWeights> {
    return this.weights;
  }

  /**
   * Computes the incremental step reward during physical simulation.
   * 
   * @param state Current physical state [theta, alpha, thetaDot, alphaDot]
   * @param voltage Applied motor control voltage (-V_max to +V_max)
   * @param prevVoltage Voltage applied in previous timestep (for jerk calculation)
   * @param dt Timestep duration (0.005s)
   */
  public evaluateStep(
    state: Readonly<PhysicalState>,
    voltage: number,
    prevVoltage: number,
    dt: number
  ): { reward: number; isUpright: boolean; energy: number; jerk: number } {
    const alpha = state.alpha;
    const theta = state.theta;

    // cos(alpha): +1 when perfectly upright (alpha = 0), -1 when hanging straight down (alpha = pi)
    const cosAlpha = Math.cos(alpha);
    const uprightScore = (cosAlpha + 1.0) * 0.5; // normalized to [0, 1]

    // Strict upright balance threshold: |alpha| < 15 degrees (~0.26 rad)
    const isUpright = Math.abs(alpha) < 0.26;
    const balanceBonus = isUpright ? this.weights.balanceBonus : 0.0;

    // Energy consumption penalty: V^2
    const energy = voltage * voltage * dt;
    const energyPen = this.weights.voltagePenalty * energy;

    // Jerk penalty: sudden rate of change in voltage (dV/dt)^2
    const dV = (voltage - prevVoltage) / Math.max(dt, 1e-4);
    const jerk = dV * dV * dt * 1e-4;
    const jerkPen = this.weights.jerkPenalty * jerk;

    // Arm centering penalty: keep rotary arm near theta = 0
    const centerPen = this.weights.centerPenalty * Math.min(1.0, theta * theta * 0.1);

    // Survival step reward
    const survival = this.weights.survivalReward;

    const reward = (this.weights.uprightReward * uprightScore) +
                   balanceBonus +
                   survival -
                   energyPen -
                   jerkPen -
                   centerPen;

    return {
      reward: Math.max(-10.0, reward),
      isUpright,
      energy,
      jerk
    };
  }
}

