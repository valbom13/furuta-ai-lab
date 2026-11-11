/**
 * High-Performance Ghost Swarm Renderer
 * Uses THREE.InstancedMesh to render 100+ parallel individuals in a single draw call.
 */

import * as THREE from 'three';
import { SwarmMemberState } from '../core/simulator.ts';

export class InstancedSwarm {
  public readonly group: THREE.Group;
  private armInstancedMesh: THREE.InstancedMesh;
  private pendInstancedMesh: THREE.InstancedMesh;
  private maxCapacity: number;

  private dummy = new THREE.Object3D();
  private colorHelper = new THREE.Color();

  private armLength: number;
  private pendLength: number;
  private motorTopY = 0.16;

  constructor(maxCapacity = 300, armLength = 0.216, pendLength = 0.337) {
    this.maxCapacity = maxCapacity;
    this.armLength = armLength;
    this.pendLength = pendLength;
    this.group = new THREE.Group();

    // 1. Arm Geometry & Ghost Material
    const armGeo = new THREE.CylinderGeometry(0.005, 0.005, armLength, 8);
    armGeo.rotateZ(-Math.PI / 2);
    armGeo.translate(armLength / 2, 0, 0);

    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.3,
      metalness: 0.8,
      depthWrite: false
    });

    this.armInstancedMesh = new THREE.InstancedMesh(armGeo, ghostMat, maxCapacity);
    this.armInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.armInstancedMesh);

    // 2. Pendulum Rod Geometry & Material
    const pendGeo = new THREE.CylinderGeometry(0.0035, 0.0035, pendLength, 8);
    pendGeo.translate(0, pendLength / 2, 0);

    const pendMat = new THREE.MeshStandardMaterial({
      color: 0x7928ca,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0.9,
      depthWrite: false
    });

    this.pendInstancedMesh = new THREE.InstancedMesh(pendGeo, pendMat, maxCapacity);
    this.pendInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.pendInstancedMesh);

    // Hide all instances initially
    this.armInstancedMesh.count = 0;
    this.pendInstancedMesh.count = 0;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public currentSystemId: 'furuta' | 'cartpole' | 'crane' = 'furuta';

  public setSystem(id: 'furuta' | 'cartpole' | 'crane'): void {
    this.currentSystemId = id;
  }

  /**
   * Updates transforms and color highlights for all swarm individuals.
   */
  public update(states: SwarmMemberState[]): void {
    if (!this.group.visible) return;

    const count = Math.min(states.length, this.maxCapacity);
    this.armInstancedMesh.count = count;
    this.pendInstancedMesh.count = count;

    if (count === 0) return;

    // Find best individual for highlighting
    let bestIdx = 0;
    let maxFitness = -Infinity;
    for (let i = 0; i < count; i++) {
      if (states[i].fitness > maxFitness) {
        maxFitness = states[i].fitness;
        bestIdx = i;
      }
    }

    const Lr = this.armLength;
    const sys = this.currentSystemId;

    for (let i = 0; i < count; i++) {
      const s = states[i];
      const theta = s.theta;
      const alpha = s.alpha;

      if (sys === 'cartpole') {
        // Linear cart-pole
        this.dummy.position.set(theta, 0.18, 0);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        this.armInstancedMesh.setMatrixAt(i, this.dummy.matrix);

        this.dummy.position.set(theta, 0.22, 0.08);
        this.dummy.rotation.set(0, 0, -alpha);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        this.pendInstancedMesh.setMatrixAt(i, this.dummy.matrix);
      } else if (sys === 'crane') {
        // Overhead crane
        this.dummy.position.set(theta, 0.96, 0);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        this.armInstancedMesh.setMatrixAt(i, this.dummy.matrix);

        this.dummy.position.set(theta, 0.93, 0);
        this.dummy.rotation.set(0, 0, -alpha);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        this.pendInstancedMesh.setMatrixAt(i, this.dummy.matrix);
      } else {
        // Rotary Furuta pendulum
        this.dummy.position.set(0, this.motorTopY, 0);
        this.dummy.rotation.set(0, theta, 0);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        this.armInstancedMesh.setMatrixAt(i, this.dummy.matrix);

        const pivotX = Lr * Math.cos(theta);
        const pivotZ = -Lr * Math.sin(theta);
        this.dummy.position.set(pivotX, this.motorTopY, pivotZ);
        this.dummy.rotation.set(-alpha, theta, 0, 'YXZ');
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        this.pendInstancedMesh.setMatrixAt(i, this.dummy.matrix);
      }


      // --- 3. Dynamic Color Coding ---
      if (i === bestIdx) {
        // Champion: Golden Emerald glow
        this.colorHelper.setHex(0x00ff88);
      } else if (s.isUpright) {
        // Balanced: Electric Cyan
        this.colorHelper.setHex(0x00f0ff);
      } else {
        // Falling/Swinging: Translucent Violet
        this.colorHelper.setHex(0x7928ca);
      }

      this.armInstancedMesh.setColorAt(i, this.colorHelper);
      this.pendInstancedMesh.setColorAt(i, this.colorHelper);
    }

    this.armInstancedMesh.instanceMatrix.needsUpdate = true;
    this.pendInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this.armInstancedMesh.instanceColor) this.armInstancedMesh.instanceColor.needsUpdate = true;
    if (this.pendInstancedMesh.instanceColor) this.pendInstancedMesh.instanceColor.needsUpdate = true;
  }
}
