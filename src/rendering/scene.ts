/**
 * Three.js 3D Industrial Laboratory Scene
 * Studio lighting, realistic laboratory bench, anti-static grid, and camera controls.
 */

import * as THREE from 'three';

export class LabScene {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  private canvasContainer: HTMLElement;

  // Camera Orbit Control state
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private spherical = { radius: 1.2, theta: Math.PI / 4, phi: Math.PI / 3 };

  constructor(container: HTMLElement) {
    this.canvasContainer = container;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17); // Dark cyber industrial slate
    this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.4);

    // 2. Camera
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.05, 50.0);
    this.updateCameraPosition();

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // 4. Studio Lighting
    this.setupLighting();

    // 5. Laboratory Bench Environment
    this.setupEnvironment();

    // 6. Camera Orbit Listeners
    this.setupControls();

    // 7. Resize Observer
    window.addEventListener('resize', this.onResize);
  }

  private setupLighting(): void {
    // Soft ambient light
    const ambient = new THREE.AmbientLight(0xd4e2ff, 0.4);
    this.scene.add(ambient);

    // Main studio key light casting crisp soft shadows
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(1.5, 2.5, 1.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 10;
    keyLight.shadow.bias = -0.0005;
    const d = 1.2;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    this.scene.add(keyLight);

    // Cyan fill light from opposite angle
    const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.6);
    fillLight.position.set(-2, 1.2, -1);
    this.scene.add(fillLight);

    // Warm rim light for metallic edge highlights
    const rimLight = new THREE.DirectionalLight(0xffaa44, 0.5);
    rimLight.position.set(0, -1, -2);
    this.scene.add(rimLight);
  }

  private setupEnvironment(): void {
    // Heavy optical laboratory breadboard table
    const tableGeo = new THREE.BoxGeometry(2.0, 0.08, 1.6);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x121824,
      roughness: 0.4,
      metalness: 0.8
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.04;
    table.receiveShadow = true;
    this.scene.add(table);

    // Laser-etched optical breadboard grid lines
    const grid = new THREE.GridHelper(1.8, 36, 0x00f0ff, 0x1f293d);
    grid.position.y = 0.001;
    this.scene.add(grid);

    // Safety ring perimeter marking
    const ringGeo = new THREE.RingGeometry(0.38, 0.40, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff3366,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    this.scene.add(ring);
  }

  private setupControls(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      // Rotate camera only if left button or right button without alt
      if (e.button === 0 && !e.shiftKey) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.spherical.theta -= deltaX * 0.008;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.02, this.spherical.phi - deltaY * 0.008));

      this.updateCameraPosition();
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.spherical.radius = Math.max(0.4, Math.min(3.0, this.spherical.radius + e.deltaY * 0.0015));
      this.updateCameraPosition();
    }, { passive: false });
  }

  private updateCameraPosition(): void {
    const r = this.spherical.radius;
    const phi = this.spherical.phi;
    const theta = this.spherical.theta;

    this.camera.position.x = r * Math.sin(phi) * Math.sin(theta);
    this.camera.position.y = r * Math.cos(phi) + 0.15;
    this.camera.position.z = r * Math.sin(phi) * Math.cos(theta);

    this.camera.lookAt(0, 0.18, 0);
  }

  public onResize = (): void => {
    if (!this.canvasContainer) return;
    const width = this.canvasContainer.clientWidth;
    const height = Math.max(1, this.canvasContainer.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
