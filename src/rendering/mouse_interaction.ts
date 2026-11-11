/**
 * Mouse Raycast Interaction for Dynamic Shock & Perturbation Testing
 * Detects clicks on the pendulum rod and applies physical impulse torques.
 */

import * as THREE from 'three';
import { LabScene } from './scene.ts';
import { SimulationLab } from '../core/simulator.ts';

export class MouseInteraction {
  private labScene: LabScene;
  private simLab: SimulationLab;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private shockRings: THREE.Mesh[] = [];

  constructor(labScene: LabScene, simLab: SimulationLab) {
    this.labScene = labScene;
    this.simLab = simLab;

    this.setupListeners();
  }

  private setupListeners(): void {
    const dom = this.labScene.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.labScene.camera);
      const intersects = this.raycaster.intersectObjects(this.labScene.scene.children, true);

      if (e.shiftKey || e.button === 1) {
        // Shift+Click or Middle Click: trigger impulse shock anywhere
        if (intersects.length > 0) {
          const hit = intersects[0];
          const impulseStrength = (Math.random() > 0.5 ? 1 : -1) * (2.0 + Math.random() * 2.5);
          this.simLab.applyPerturbation(impulseStrength);
          this.createShockwaveEffect(hit.point);
        }
      } else if (e.button === 0) {
        // Left click: ONLY apply shock if directly clicking on the mechanical structure (y > 0.04)
        const hit = intersects.find(i => i.point.y > 0.04);
        if (hit) {
          const impulseStrength = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 2.0);
          this.simLab.applyPerturbation(impulseStrength);
          this.createShockwaveEffect(hit.point);
        }
      }
    });
  }


  private createShockwaveEffect(position: THREE.Vector3): void {
    const ringGeo = new THREE.RingGeometry(0.01, 0.03, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff3366,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.position.y += 0.01;
    this.labScene.scene.add(ring);
    this.shockRings.push(ring);

    // Animate expansion and fade out
    let scale = 1.0;
    const interval = setInterval(() => {
      scale += 0.2;
      ring.scale.set(scale, scale, scale);
      ringMat.opacity -= 0.08;
      if (ringMat.opacity <= 0) {
        clearInterval(interval);
        this.labScene.scene.remove(ring);
        ringGeo.dispose();
        ringMat.dispose();
        const idx = this.shockRings.indexOf(ring);
        if (idx >= 0) this.shockRings.splice(idx, 1);
      }
    }, 16);
  }
}
