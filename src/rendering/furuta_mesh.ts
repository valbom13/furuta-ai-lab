/**
 * Quanser-Style Furuta Rotary Inverted Pendulum 3D Model
 * High-detail physical mesh with hierarchical kinematic pivots.
 */

import * as THREE from 'three';
import { MATERIALS } from '../core/physics/materials.ts';

export class FurutaMesh {
  public readonly rootGroup: THREE.Group;

  // Kinematic pivot hierarchy
  private armPivot: THREE.Group;      // Rotates around Y axis by theta
  private pendulumPivot: THREE.Group; // Attached at tip of arm, rotates around local X/Z by alpha

  // Geometries and meshes for dynamic resizing & material swapping
  private armMesh!: THREE.Mesh;
  private pendulumMesh!: THREE.Mesh;
  private pendulumTipMesh!: THREE.Mesh;

  private armLength: number;
  private armRadius: number;
  private pendLength: number;
  private pendRadius: number;

  constructor(armLength = 0.216, armRadius = 0.008, pendLength = 0.337, pendRadius = 0.005) {
    this.armLength = armLength;
    this.armRadius = armRadius;
    this.pendLength = pendLength;
    this.pendRadius = pendRadius;

    this.rootGroup = new THREE.Group();
    this.armPivot = new THREE.Group();
    this.pendulumPivot = new THREE.Group();

    this.buildStaticChassis();
    this.buildKinematics();
  }

  private buildStaticChassis(): void {
    // 1. Cast-iron heavy circular base plate
    const baseGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.025, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1a2130,
      roughness: 0.6,
      metalness: 0.8
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.0125;
    base.castShadow = true;
    base.receiveShadow = true;
    this.rootGroup.add(base);

    // 4 Corner mounting screws
    const screwGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.01, 16);
    const screwMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.2, metalness: 0.9 });
    const screwDist = 0.095;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const screw = new THREE.Mesh(screwGeo, screwMat);
      screw.position.set(Math.cos(angle) * screwDist, 0.027, Math.sin(angle) * screwDist);
      this.rootGroup.add(screw);
    }

    // 2. DC Motor Cylindrical Housing
    const motorHeight = 0.12;
    const motorGeo = new THREE.CylinderGeometry(0.045, 0.045, motorHeight, 32);
    const motorMat = new THREE.MeshStandardMaterial({
      color: 0x242d3d,
      roughness: 0.3,
      metalness: 0.85
    });
    const motor = new THREE.Mesh(motorGeo, motorMat);
    motor.position.y = 0.025 + motorHeight / 2;
    motor.castShadow = true;
    motor.receiveShadow = true;
    this.rootGroup.add(motor);

    // 3. Encoder Top Cap & Flange
    const capGeo = new THREE.CylinderGeometry(0.038, 0.042, 0.015, 32);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.3, metalness: 0.5 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.025 + motorHeight + 0.0075;
    this.rootGroup.add(cap);
  }

  private buildKinematics(): void {
    const motorTopY = 0.025 + 0.12 + 0.015;

    // Arm Pivot placed at motor shaft output
    this.armPivot.position.set(0, motorTopY, 0);
    this.rootGroup.add(this.armPivot);

    // Central rotor hub
    const hubGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.03, 24);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.8 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.y = 0.015;
    hub.castShadow = true;
    this.armPivot.add(hub);

    // Rotary Arm (along local X-axis)
    this.rebuildArmGeometry();

    // Pendulum Pivot placed at tip of rotary arm
    this.pendulumPivot.position.set(this.armLength, 0.015, 0);
    this.armPivot.add(this.pendulumPivot);

    // Hinge bearing assembly
    const bearingGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.024, 20);
    bearingGeo.rotateZ(Math.PI / 2);
    const bearingMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.2, metalness: 0.9 });
    const bearing = new THREE.Mesh(bearingGeo, bearingMat);
    bearing.castShadow = true;
    this.pendulumPivot.add(bearing);

    // Optical encoder disk indicator
    const encDiskGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.004, 24);
    encDiskGeo.rotateZ(Math.PI / 2);
    const encDiskMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, roughness: 0.2, metalness: 0.4 });
    const encDisk = new THREE.Mesh(encDiskGeo, encDiskMat);
    encDisk.position.x = 0.014;
    this.pendulumPivot.add(encDisk);

    // Build pendulum rod
    this.rebuildPendulumGeometry();
  }

  public rebuildArmGeometry(materialName = 'aluminum'): void {
    if (this.armMesh) {
      this.armPivot.remove(this.armMesh);
      this.armMesh.geometry.dispose();
    }

    const matProp = MATERIALS[materialName] || MATERIALS.aluminum;
    const armGeo = new THREE.CylinderGeometry(this.armRadius, this.armRadius, this.armLength, 16);
    armGeo.rotateZ(-Math.PI / 2); // Lay horizontal along +X
    armGeo.translate(this.armLength / 2, 0.015, 0);

    const armMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(matProp.color),
      roughness: matProp.roughness,
      metalness: matProp.metalness
    });
    this.armMesh = new THREE.Mesh(armGeo, armMat);
    this.armMesh.castShadow = true;
    this.armPivot.add(this.armMesh);

    if (this.pendulumPivot) {
      this.pendulumPivot.position.set(this.armLength, 0.015, 0);
    }
  }

  public rebuildPendulumGeometry(materialName = 'steel'): void {
    if (this.pendulumMesh) {
      this.pendulumPivot.remove(this.pendulumMesh);
      this.pendulumMesh.geometry.dispose();
    }
    if (this.pendulumTipMesh) {
      this.pendulumPivot.remove(this.pendulumTipMesh);
      this.pendulumTipMesh.geometry.dispose();
    }

    const matProp = MATERIALS[materialName] || MATERIALS.steel;

    // In Furuta coordinates:
    // When alpha = 0 (upright), the pendulum points straight up (+Y).
    // Center of cylinder geometry is translated by +L/2 along Y.
    const pendGeo = new THREE.CylinderGeometry(this.pendRadius, this.pendRadius, this.pendLength, 16);
    pendGeo.translate(0, this.pendLength / 2, 0);

    const pendMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(matProp.color),
      roughness: matProp.roughness,
      metalness: matProp.metalness
    });
    this.pendulumMesh = new THREE.Mesh(pendGeo, pendMat);
    this.pendulumMesh.castShadow = true;
    this.pendulumPivot.add(this.pendulumMesh);

    // Knurled brass counter-balance / tip mass
    const tipGeo = new THREE.CylinderGeometry(this.pendRadius * 2.2, this.pendRadius * 2.2, 0.02, 16);
    tipGeo.translate(0, this.pendLength - 0.01, 0);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.9
    });
    this.pendulumTipMesh = new THREE.Mesh(tipGeo, tipMat);
    this.pendulumTipMesh.castShadow = true;
    this.pendulumPivot.add(this.pendulumTipMesh);
  }

  public updateDimensions(armLength: number, armRadius: number, pendLength: number, pendRadius: number): void {
    this.armLength = armLength;
    this.armRadius = armRadius;
    this.pendLength = pendLength;
    this.pendRadius = pendRadius;
    this.pendulumPivot.position.set(this.armLength, 0.015, 0);
    this.rebuildArmGeometry();
    this.rebuildPendulumGeometry();
  }

  /**
   * Updates 3D visual rotation from physical coordinates.
   * theta: arm angle (around vertical Y)
   * alpha: pendulum angle (around local hinge axis)
   */
  public updateState(theta: number, alpha: number): void {
    // Arm rotates around vertical Y axis
    this.armPivot.rotation.y = theta;

    // Pendulum swings in tangential-vertical plane (around local X axis)
    // alpha = 0: pointing UP (+Y)
    // alpha = pi: pointing DOWN (-Y)
    this.pendulumPivot.rotation.x = -alpha;
  }

  public getPendulumTipWorldPosition(target: THREE.Vector3): THREE.Vector3 {
    if (this.pendulumTipMesh) {
      return this.pendulumTipMesh.getWorldPosition(target);
    }
    return target.set(0, 0, 0);
  }
}
