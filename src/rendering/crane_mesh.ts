/**
 * Modular Industrial Overhead Crane 3D Model
 * Overhead gantry frame, motorized cable trolley, suspended steel wire, and payload box.
 */

import * as THREE from 'three';

export class CraneMesh {
  public readonly rootGroup: THREE.Group;
  private trolley: THREE.Mesh;
  private cablePivot: THREE.Group;
  private cable: THREE.Mesh;
  private payload: THREE.Mesh;
  private cableLength: number;

  constructor(cableLength = 0.8) {
    this.cableLength = cableLength;
    this.rootGroup = new THREE.Group();
    this.rootGroup.visible = false;

    // Gantry Structural Frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.6, roughness: 0.4 });
    const beamGeo = new THREE.BoxGeometry(4.0, 0.04, 0.04);
    const topBeam = new THREE.Mesh(beamGeo, frameMat);
    topBeam.position.y = 1.0;
    topBeam.castShadow = true;
    this.rootGroup.add(topBeam);

    // Left and Right Support Pillars
    const pillarGeo = new THREE.BoxGeometry(0.04, 1.0, 0.04);
    const pillarL = new THREE.Mesh(pillarGeo, frameMat);
    pillarL.position.set(-1.9, 0.5, 0);
    this.rootGroup.add(pillarL);

    const pillarR = new THREE.Mesh(pillarGeo, frameMat);
    pillarR.position.set(1.9, 0.5, 0);
    this.rootGroup.add(pillarR);

    // Trolley
    const trolleyGeo = new THREE.BoxGeometry(0.18, 0.06, 0.12);
    const trolleyMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8, roughness: 0.3 });
    this.trolley = new THREE.Mesh(trolleyGeo, trolleyMat);
    this.trolley.position.y = 0.96;
    this.trolley.castShadow = true;
    this.rootGroup.add(this.trolley);

    // Cable Pivot
    this.cablePivot = new THREE.Group();
    this.cablePivot.position.set(0, -0.03, 0);
    this.trolley.add(this.cablePivot);

    // Flexible Steel Cable
    const cableGeo = new THREE.CylinderGeometry(0.002, 0.002, cableLength, 8);
    cableGeo.translate(0, -cableLength / 2, 0);
    const cableMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
    this.cable = new THREE.Mesh(cableGeo, cableMat);
    this.cablePivot.add(this.cable);

    // Payload Box
    const payloadGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const payloadMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, metalness: 0.7, roughness: 0.3 });
    this.payload = new THREE.Mesh(payloadGeo, payloadMat);
    this.payload.position.y = -cableLength;
    this.payload.castShadow = true;
    this.cablePivot.add(this.payload);
  }

  public updateState(x: number, alpha: number): void {
    this.trolley.position.x = x;
    this.cablePivot.rotation.z = alpha; // Swing angle
  }
}
