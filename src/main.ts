/**
 * Application Entry Point
 * Initializes 3D Three.js scene, physics simulation lab, instanced swarm,
 * synaptic visualizer, and dashboard controller.
 */

import { LabScene } from './rendering/scene.ts';
import { FurutaMesh } from './rendering/furuta_mesh.ts';
import { CartPoleMesh } from './rendering/cartpole_mesh.ts';
import { CraneMesh } from './rendering/crane_mesh.ts';
import { InstancedSwarm } from './rendering/instanced_swarm.ts';
import { MouseInteraction } from './rendering/mouse_interaction.ts';
import { SynapticCanvas } from './ui/synaptic_canvas.ts';
import { Dashboard } from './ui/dashboard.ts';
import { SimulationLab } from './core/simulator.ts';
import { NeuralNetwork } from './core/neural/network.ts';
import { SensorPipeline } from './core/neural/sensors.ts';
import { EvolutionConfig } from './core/evolution/types.ts';

function main() {
  const container = document.getElementById('viewport-container');
  if (!container) throw new Error('Viewport container element not found');

  // 1. Three.js Scene Setup
  const labScene = new LabScene(container);

  // 2. 3D Modular Models
  const furutaMesh = new FurutaMesh();
  labScene.scene.add(furutaMesh.rootGroup);

  const cartpoleMesh = new CartPoleMesh();
  cartpoleMesh.rootGroup.visible = false;
  labScene.scene.add(cartpoleMesh.rootGroup);

  const craneMesh = new CraneMesh();
  craneMesh.rootGroup.visible = false;
  labScene.scene.add(craneMesh.rootGroup);

  // 3. Instanced Ghost Swarm Renderer
  const swarmRenderer = new InstancedSwarm(300);
  labScene.scene.add(swarmRenderer.group);

  // 4. Default Configurations
  const defaultSensors = {
    includeAngles: true,
    includeTrig: true,
    includeVelocities: true,
    noiseStd: 0.0,
    quantizationBits: 0,
    latencyMs: 0
  };

  const tempSensors = new SensorPipeline(defaultSensors);
  const initialInDim = tempSensors.computeOutputDim(); // 8: [theta, alpha, sin(a), cos(a), sin(t), cos(t), thetaDot, alphaDot]
  const initialLayers = NeuralNetwork.createPreset('mlp', initialInDim, 1);

  // Temporary network to get exact weight count
  const tempNet = new NeuralNetwork(initialLayers);
  const totalWeights = tempNet.getTotalWeights();

  const evolutionConfig: EvolutionConfig = {
    algorithm: 'ga',
    populationSize: 100,
    genomeLength: totalWeights,
    eliteCount: 3,
    inputDim: initialInDim,
    selectionMethod: 'tournament',
    tournamentSize: 3,
    crossoverMethod: 'blx_alpha',
    crossoverRate: 0.8,
    blxAlpha: 0.5,
    mutationMethod: 'cauchy',
    mutationRate: 0.1,
    mutationStrength: 0.2,
    cauchyScale: 0.15,
    fitnessWeights: {
      uprightReward: 1.0,
      balanceBonus: 2.0,
      voltagePenalty: 0.05,
      jerkPenalty: 0.01,
      centerPenalty: 0.1,
      survivalReward: 0.1
    },
    islandCount: 4,
    migrationInterval: 5,
    migrationRate: 0.1,
    mapElitesResolution: 20,
    evaluationSteps: 1200,
    dt: 0.005
  };

  // 5. Instantiate Simulation Lab
  const simLab = new SimulationLab(initialLayers, defaultSensors, evolutionConfig);

  // 6. Synaptic Canvas Setup
  const synCanvasEl = document.getElementById('synaptic-canvas') as HTMLCanvasElement;
  const synapticCanvas = new SynapticCanvas(synCanvasEl, simLab.network);

  // 7. Mouse Raycast Shocks & Impulses
  new MouseInteraction(labScene, simLab);

  // 8. Master Dashboard Controller
  const dashboard = new Dashboard(
    simLab,
    synapticCanvas,
    furutaMesh,
    cartpoleMesh,
    craneMesh,
    swarmRenderer
  );

  // 9. Main Animation Loop
  let lastTime = performance.now();
  let frameCount = 0;
  let lastFpsCheck = lastTime;

  function animate(now: number) {
    requestAnimationFrame(animate);

    const deltaMs = Math.min(50, now - lastTime);
    lastTime = now;

    // Measure FPS
    frameCount++;
    if (now - lastFpsCheck >= 1000) {
      const fpsEl = document.getElementById('hud-fps');
      if (fpsEl) fpsEl.textContent = `${frameCount} FPS`;
      frameCount = 0;
      lastFpsCheck = now;
    }

    // Step physics & simulation
    simLab.update(deltaMs);

    // Update 3D Visual Positions
    const state = simLab.physics.getState();
    if (simLab.currentSystemId === 'cartpole') {
      cartpoleMesh.updateState(state.theta, state.alpha);
    } else if (simLab.currentSystemId === 'crane') {
      craneMesh.updateState(state.theta, state.alpha);
    } else {
      furutaMesh.updateState(state.theta, state.alpha);
    }

    // Update Ghost Swarm Instanced Mesh
    if (!simLab.focusChampionOnly) {
      swarmRenderer.update(simLab.swarmStates);
    }

    // Update Synaptic Canvas & HUD
    synapticCanvas.render(simLab.lastObservation ?? undefined);
    dashboard.updateHUD();

    // Render 3D Scene
    labScene.render();
  }

  requestAnimationFrame(animate);
}

window.addEventListener('DOMContentLoaded', main);
