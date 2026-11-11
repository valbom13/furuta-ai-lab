/**
 * Modular Cart-Pole 3D Model
 * Linear horizontal guide rail, motorized slider carriage, and pivoting pole.
 */

import * as THREE from 'three';

export class CartPoleMesh {
  public readonly rootGroup: THREE.Group;
  private cart: THREE.Mesh;
  private polePivot: THREE.Group;
  private pole: THREE.Mesh;

  constructor(poleLength = 0.5) {
    this.rootGroup = new THREE.Group();
    this.rootGroup.visible = false;

    // Linear Guide Rail
    const railGeo = new THREE.BoxGeometry(4.0, 0.02, 0.04);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.9, roughness: 0.2 });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.y = 0.15;
    rail.castShadow = true;
    this.rootGroup.add(rail);

    // Motorized Cart
    const cartGeo = new THREE.BoxGeometry(0.2, 0.08, 0.14);
    const cartMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.7, roughness: 0.3 });
    this.cart = new THREE.Mesh(cartGeo, cartMat);
    this.cart.position.y = 0.18;
    this.cart.castShadow = true;
    this.rootGroup.add(this.cart);

    // Pole Pivot
    this.polePivot = new THREE.Group();
    this.polePivot.position.set(0, 0.04, 0.08);
    this.cart.add(this.polePivot);

    // Pole Rod
    const poleGeo = new THREE.CylinderGeometry(0.008, 0.008, poleLength, 16);
    poleGeo.translate(0, poleLength / 2, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 });
    this.pole = new THREE.Mesh(poleGeo, poleMat);
    this.pole.castShadow = true;
    this.polePivot.add(this.pole);
  }

  public updateState(x: number, alpha: number): void {
    this.cart.position.x = x;
    this.polePivot.rotation.z = -alpha;
  }
}
