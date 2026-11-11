/**
 * Master UI Dashboard Manager
 * Synchronizes DOM controls, event handlers, real-time telemetry HUD,
 * and pedagogical mission orchestration.
 */

import { SimulationLab } from '../core/simulator.ts';
import { FurutaPendulum } from '../core/physics/furuta.ts';
import { SynapticCanvas } from './synaptic_canvas.ts';
import { FurutaMesh } from '../rendering/furuta_mesh.ts';
import { CartPoleMesh } from '../rendering/cartpole_mesh.ts';
import { CraneMesh } from '../rendering/crane_mesh.ts';
import { InstancedSwarm } from '../rendering/instanced_swarm.ts';
import { NeuralNetwork } from '../core/neural/network.ts';
import { MISSIONS } from './missions.ts';
import { TOPICS } from './inspector.ts';
import { MATERIALS } from '../core/physics/materials.ts';
import { LayerConfig, ActivationType } from '../core/neural/types.ts';

export class Dashboard {
  private lab: SimulationLab;
  private synapticCanvas: SynapticCanvas;
  private furutaMesh: FurutaMesh;
  private cartpoleMesh: CartPoleMesh;
  private craneMesh: CraneMesh;
  private swarmRenderer: InstancedSwarm;

  // Phase portrait canvas
  private phaseCanvas: HTMLCanvasElement;
  private phaseCtx: CanvasRenderingContext2D;
  private phaseHistory: { alpha: number; alphaDot: number }[] = [];

  constructor(
    lab: SimulationLab,
    synapticCanvas: SynapticCanvas,
    furutaMesh: FurutaMesh,
    cartpoleMesh: CartPoleMesh,
    craneMesh: CraneMesh,
    swarmRenderer: InstancedSwarm
  ) {
    this.lab = lab;
    this.synapticCanvas = synapticCanvas;
    this.furutaMesh = furutaMesh;
    this.cartpoleMesh = cartpoleMesh;
    this.craneMesh = craneMesh;
    this.swarmRenderer = swarmRenderer;

    this.phaseCanvas = document.getElementById('phase-portrait-canvas') as HTMLCanvasElement;
    this.phaseCtx = this.phaseCanvas.getContext('2d')!;

    this.initTabNavigation();
    this.initPlaybackControls();
    this.initNeuralControls();
    this.initEvolutionControls();
    this.initPhysicsControls();
    this.initMissionsList();
    this.initInspector();
    this.initExportImport();
    this.updateLayerStackUI();
  }

  // --- 1. Tab Navigation ---
  private initTabNavigation(): void {
    const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
    const tabContents = document.querySelectorAll<HTMLElement>('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetContent = document.getElementById(targetId!);
        if (targetContent) targetContent.classList.add('active');

        // Resize synaptic canvas if neural tab is active
        if (targetId === 'tab-neural') {
          setTimeout(() => this.synapticCanvas.resize(), 50);
        }
      });
    });
  }

  // --- 2. Playback & System Controls ---
  private initPlaybackControls(): void {
    const playBtn = document.getElementById('btn-play-pause') as HTMLButtonElement;
    const playIcon = document.getElementById('play-icon')!;
    const playText = document.getElementById('play-text')!;

    playBtn.addEventListener('click', () => {
      this.lab.isRunning = !this.lab.isRunning;
      if (this.lab.isRunning) {
        playIcon.textContent = '⏸';
        playText.textContent = 'Pausar';
        playBtn.classList.add('btn-active');
      } else {
        playIcon.textContent = '▶';
        playText.textContent = 'Iniciar';
        playBtn.classList.remove('btn-active');
        if (this.lab.isTurbo) {
          this.lab.setTurbo(false);
          const turboBtn = document.getElementById('btn-turbo') as HTMLButtonElement;
          if (turboBtn) {
            turboBtn.classList.remove('btn-active');
            turboBtn.textContent = '⚡ Turbo';
          }
        }
      }
    });

    const stepBtn = document.getElementById('btn-step') as HTMLButtonElement;
    stepBtn.addEventListener('click', () => {
      this.lab.update(16);
      this.updateHUD();
    });

    const resetBtn = document.getElementById('btn-reset') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      this.lab.setTurbo(false);
      const turboBtn = document.getElementById('btn-turbo') as HTMLButtonElement;
      if (turboBtn) {
        turboBtn.classList.remove('btn-active');
        turboBtn.textContent = '⚡ Turbo';
      }

      this.lab.isRunning = false;
      playBtn.classList.remove('btn-active');
      playIcon.textContent = '▶';
      playText.textContent = 'Iniciar';

      this.lab.fullReset();
      this.phaseHistory = [];
      if (this.phaseCanvas && this.phaseCtx) {
        this.phaseCtx.fillStyle = '#060910';
        this.phaseCtx.fillRect(0, 0, this.phaseCanvas.width, this.phaseCanvas.height);
      }
      this.synapticCanvas.setNetwork(this.lab.network);
      if (this.lab.evolution.getConfig().algorithm === 'neat') {
        this.synapticCanvas.setNeatGenome(null);
      }
      this.updateHUD();
    });

    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedVal = document.getElementById('speed-val')!;
    speedSlider.addEventListener('input', () => {
      const spd = parseFloat(speedSlider.value);
      this.lab.setSpeed(spd);
      speedVal.textContent = `${spd.toFixed(1)}x`;
    });

    const turboBtn = document.getElementById('btn-turbo') as HTMLButtonElement;
    turboBtn.addEventListener('click', async () => {
      const isTurbo = !this.lab.isTurbo;
      this.lab.setTurbo(isTurbo);
      if (isTurbo) {
        turboBtn.classList.add('btn-active');
        turboBtn.textContent = '⚡ Turbo (Ativo)';
        while (this.lab.isTurbo) {
          await this.lab.stepGenerationTurbo();
          if (!this.lab.isTurbo) break;
          this.updateHUD();
          await new Promise(r => setTimeout(r, 10));
        }
      } else {
        turboBtn.classList.remove('btn-active');
        turboBtn.textContent = '⚡ Turbo';
        this.lab.resetCurrentGeneration();
        this.updateHUD();
      }
    });

    const swarmBtn = document.getElementById('btn-swarm') as HTMLButtonElement;
    swarmBtn.addEventListener('click', () => {
      this.lab.focusChampionOnly = !this.lab.focusChampionOnly;
      this.swarmRenderer.setVisible(!this.lab.focusChampionOnly);
      if (this.lab.focusChampionOnly) {
        swarmBtn.classList.remove('btn-active');
        swarmBtn.textContent = '🎯 Foco Campeão';
      } else {
        swarmBtn.classList.add('btn-active');
        swarmBtn.textContent = '👥 Enxame (100+)';
      }
    });

    // System Selector
    const sysSelect = document.getElementById('system-selector') as HTMLSelectElement;
    sysSelect.addEventListener('change', () => {
      const val = sysSelect.value as 'furuta' | 'cartpole' | 'crane';
      this.lab.setPhysicalSystem(val);
      this.furutaMesh.rootGroup.visible = (val === 'furuta');
      this.cartpoleMesh.rootGroup.visible = (val === 'cartpole');
      this.craneMesh.rootGroup.visible = (val === 'crane');
      this.swarmRenderer.setSystem(val);
      this.updatePhysicsReadout();
    });
  }


  private applyNetworkUpdate(configs: LayerConfig[]): void {
    if (this.lab.isTurbo) {
      this.lab.setTurbo(false);
      const turboBtn = document.getElementById('btn-turbo') as HTMLButtonElement;
      if (turboBtn) {
        turboBtn.classList.remove('btn-active');
        turboBtn.textContent = '⚡ Turbo';
      }
    }
    this.lab.updateNetwork(configs);
    this.synapticCanvas.setNetwork(this.lab.network);
    this.updateLayerStackUI();
    this.updateHUD();
  }

  // --- 3. Neural Network Tab Controls ---
  private initNeuralControls(): void {
    const presetSelect = document.getElementById('network-preset-select') as HTMLSelectElement;
    const presetDesc = document.getElementById('preset-description')!;

    presetSelect.addEventListener('change', () => {
      const presetId = presetSelect.value;
      const inDim = this.lab.sensors.computeOutputDim();
      const newConfigs = NeuralNetwork.createPreset(presetId, inDim, 1);
      this.applyNetworkUpdate(newConfigs);

      const meta = NeuralNetwork.PRESETS_METADATA.find(p => p.id === presetId);
      if (meta) {
        presetDesc.textContent = meta.didacticRationale;
      }
    });

    // Sensor checkboxes
    const chkAngles = document.getElementById('sensor-angles') as HTMLInputElement;
    const chkTrig = document.getElementById('sensor-trig') as HTMLInputElement;
    const chkVels = document.getElementById('sensor-vels') as HTMLInputElement;

    const onSensorsChange = () => {
      this.lab.sensors.updateConfig({
        includeAngles: chkAngles.checked,
        includeTrig: chkTrig.checked,
        includeVelocities: chkVels.checked
      });
      // Rebuild network input dimension
      const inDim = this.lab.sensors.computeOutputDim();
      const currentConfigs = this.lab.network.getLayers().map(l => ({ ...l.config }));
      if (currentConfigs.length > 0) {
        currentConfigs[0].inFeatures = inDim;
        this.applyNetworkUpdate(currentConfigs);
      }
    };

    chkAngles.addEventListener('change', onSensorsChange);
    chkTrig.addEventListener('change', onSensorsChange);
    chkVels.addEventListener('change', onSensorsChange);

    // Sensor Noise Slider
    const noiseSlider = document.getElementById('sensor-noise') as HTMLInputElement;
    const noiseVal = document.getElementById('sensor-noise-val')!;
    noiseSlider.addEventListener('input', () => {
      const val = parseFloat(noiseSlider.value);
      this.lab.sensors.updateConfig({ noiseStd: val });
      noiseVal.textContent = val.toFixed(3);
    });

    // Sensor Quantization
    const quantSelect = document.getElementById('sensor-quantization') as HTMLSelectElement;
    quantSelect.addEventListener('change', () => {
      this.lab.sensors.updateConfig({ quantizationBits: parseInt(quantSelect.value) });
    });

    // Latency
    const latencySlider = document.getElementById('sensor-latency') as HTMLInputElement;
    const latencyVal = document.getElementById('sensor-latency-val')!;
    latencySlider.addEventListener('input', () => {
      const ms = parseInt(latencySlider.value);
      this.lab.sensors.updateConfig({ latencyMs: ms });
      latencyVal.textContent = `${ms} ms`;
    });

    // Add Layer Button
    const addLayerBtn = document.getElementById('btn-add-layer') as HTMLButtonElement;
    addLayerBtn.addEventListener('click', () => {
      const layers = this.lab.network.getLayers().map(l => ({ ...l.config }));
      if (layers.length >= 2) {
        // Insert hidden layer before the final output layer
        const insertIdx = layers.length - 1;
        const prevOut = layers[insertIdx - 1].outFeatures;
        const newLayer: LayerConfig = {
          id: `custom_${Date.now()}`,
          type: 'dense',
          inFeatures: prevOut,
          outFeatures: 16,
          activation: 'tanh',
          useBias: true
        };
        layers.splice(insertIdx, 0, newLayer);
        layers[insertIdx + 1].inFeatures = 16;
      } else if (layers.length === 1) {
        const inDim = layers[0].inFeatures;
        const outDim = layers[0].outFeatures;
        layers[0].outFeatures = 16;
        layers.push({
          id: `custom_${Date.now()}`,
          type: 'dense',
          inFeatures: 16,
          outFeatures: outDim,
          activation: 'tanh',
          useBias: true
        });
      } else {
        const inDim = this.lab.sensors.computeOutputDim();
        layers.push({
          id: `custom_${Date.now()}`,
          type: 'dense',
          inFeatures: inDim,
          outFeatures: 1,
          activation: 'tanh',
          useBias: true
        });
      }
      this.applyNetworkUpdate(layers);
    });
  }

  private updateLayerStackUI(): void {
    const list = document.getElementById('layers-list');
    if (!list) return;

    const layers = this.lab.network.getLayers();

    // In-place update if number of layers is unchanged to avoid destroying input focus and selection
    if (list.children.length === layers.length) {
      layers.forEach((layer, idx) => {
        const item = list.children[idx] as HTMLElement;
        if (!item) return;
        const inDimSpan = item.querySelector('.layer-in-dim');
        if (inDimSpan) inDimSpan.innerHTML = `${layer.config.inFeatures} &rarr;`;
        const tagSpan = item.querySelector('.layer-type-tag');
        if (tagSpan) tagSpan.textContent = layer.config.type.toUpperCase();
        const infoSpan = item.querySelector('.layer-title-info');
        if (infoSpan) infoSpan.textContent = `#${idx + 1} (${layer.config.activation}):`;
        const input = item.querySelector<HTMLInputElement>('.layer-neuron-input');
        if (input && document.activeElement !== input) {
          input.value = String(layer.config.outFeatures);
        }
      });
      return;
    }

    // Track which input has active focus before re-rendering
    const activeEl = document.activeElement;
    const focusedIdx = (activeEl && list.contains(activeEl)) ? activeEl.getAttribute('data-idx') : null;

    list.innerHTML = '';

    layers.forEach((layer, idx) => {
      const item = document.createElement('div');
      item.className = 'layer-item';

      item.innerHTML = `
        <div class="layer-info" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span class="layer-type-tag">${layer.config.type.toUpperCase()}</span>
          <span class="layer-title-info" style="font-size: 11px; font-weight: 500;">#${idx + 1} (${layer.config.activation}):</span>
          <span class="layer-in-dim" style="font-size: 11px; color: var(--text-muted);">${layer.config.inFeatures} &rarr;</span>
          <div style="display: inline-flex; align-items: center; gap: 2px;">
            <input
              type="number"
              class="layer-neuron-input select-control"
              data-idx="${idx}"
              min="1"
              max="128"
              step="1"
              value="${layer.config.outFeatures}"
              style="width: 52px; padding: 2px 4px; font-size: 11px; text-align: center;"
              title="Número de neurónios (digite ou clique nas setas para ajustar 1 a 1)"
            />
            <div style="display: flex; flex-direction: column; gap: 1px;">
              <button type="button" class="btn btn-step-up" data-idx="${idx}" style="padding: 0 4px; font-size: 8px; line-height: 8px; height: 11px; background: rgba(255,255,255,0.1);" title="Aumentar 1 neurónio">▲</button>
              <button type="button" class="btn btn-step-down" data-idx="${idx}" style="padding: 0 4px; font-size: 8px; line-height: 8px; height: 11px; background: rgba(255,255,255,0.1);" title="Diminuir 1 neurónio">▼</button>
            </div>
          </div>
          <span style="font-size: 11px; color: var(--text-muted);">neurónios</span>
        </div>
        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="btn btn-remove-layer" data-idx="${idx}" style="padding: 2px 6px; font-size: 10px; color: var(--accent-rose);" title="Remover Camada">✕</button>
        </div>
      `;

      list.appendChild(item);
    });

    const changeNeuronCount = (idx: number, newVal: number) => {
      let val = Math.max(1, Math.min(128, Math.round(newVal)));
      const currentConfigs = this.lab.network.getLayers().map(l => ({ ...l.config }));
      if (currentConfigs[idx].outFeatures === val) return;

      currentConfigs[idx].outFeatures = val;
      if (idx + 1 < currentConfigs.length) {
        currentConfigs[idx + 1].inFeatures = val;
      }
      this.applyNetworkUpdate(currentConfigs);
    };

    list.querySelectorAll<HTMLInputElement>('.layer-neuron-input').forEach(input => {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      const onValCommit = () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        const idx = parseInt(input.dataset.idx!);
        const val = parseInt(input.value);
        if (!isNaN(val) && val >= 1) {
          changeNeuronCount(idx, val);
        }
      };

      input.addEventListener('input', () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(onValCommit, 400);
      });
      input.addEventListener('change', onValCommit);
      input.addEventListener('blur', onValCommit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          onValCommit();
          input.blur();
        }
      });
    });

    list.querySelectorAll<HTMLButtonElement>('.btn-step-up').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx!);
        const currentCount = this.lab.network.getLayers()[idx]?.config.outFeatures ?? 1;
        changeNeuronCount(idx, currentCount + 1);
      });
    });

    list.querySelectorAll<HTMLButtonElement>('.btn-step-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx!);
        const currentCount = this.lab.network.getLayers()[idx]?.config.outFeatures ?? 1;
        changeNeuronCount(idx, currentCount - 1);
      });
    });

    list.querySelectorAll('.btn-remove-layer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx!);
        const currentConfigs = this.lab.network.getLayers().map(l => ({ ...l.config }));
        if (currentConfigs.length > 1) {
          currentConfigs.splice(idx, 1);
          // Fix input/output matching
          const inDim = this.lab.sensors.computeOutputDim();
          currentConfigs[0].inFeatures = inDim;
          for (let i = 1; i < currentConfigs.length; i++) {
            currentConfigs[i].inFeatures = currentConfigs[i - 1].outFeatures;
          }
          currentConfigs[currentConfigs.length - 1].outFeatures = 1;
          this.applyNetworkUpdate(currentConfigs);
        }
      });
    });

    // Restore focus if the user was typing in an input without selecting all text
    if (focusedIdx !== null) {
      const newInput = list.querySelector<HTMLInputElement>(`.layer-neuron-input[data-idx="${focusedIdx}"]`);
      if (newInput) {
        newInput.focus();
      }
    }
  }

  // --- 4. Evolution Controls ---
  private initEvolutionControls(): void {
    const genTimeSlider = document.getElementById('evo-gen-time') as HTMLInputElement;
    const genTimeVal = document.getElementById('evo-gen-time-val');
    if (genTimeSlider && genTimeVal) {
      genTimeSlider.value = this.lab.getGenerationTime().toFixed(1);
      genTimeVal.textContent = `${this.lab.getGenerationTime().toFixed(1)} s`;
      genTimeSlider.addEventListener('input', () => {
        const sec = parseFloat(genTimeSlider.value);
        this.lab.setGenerationTime(sec);
        genTimeVal.textContent = `${sec.toFixed(1)} s`;
      });
    }

    const algoSelect = document.getElementById('evo-algo') as HTMLSelectElement;
    algoSelect.addEventListener('change', () => {
      const algo = algoSelect.value as any;
      const inDim = this.lab.sensors.computeOutputDim();
      this.lab.evolution.updateConfig({ algorithm: algo, inputDim: inDim });
      this.lab.initSwarm(this.lab.evolution.getConfig().populationSize);
      if (algo === 'neat') {
        const best = this.lab.evolution.getBestIndividual();
        this.synapticCanvas.setNeatGenome(best?.neatGenome ?? null);
      } else {
        this.synapticCanvas.setNeatGenome(null);
      }
    });

    const popSlider = document.getElementById('evo-pop-size') as HTMLInputElement;
    const popVal = document.getElementById('evo-pop-val')!;
    popSlider.addEventListener('input', () => {
      const sz = parseInt(popSlider.value);
      popVal.textContent = `${sz}`;
      this.lab.evolution.updateConfig({ populationSize: sz });
      this.lab.initSwarm(sz);
    });

    const eliteSlider = document.getElementById('evo-elite-count') as HTMLInputElement;
    const eliteVal = document.getElementById('evo-elite-val')!;
    eliteSlider.addEventListener('input', () => {
      const el = parseInt(eliteSlider.value);
      eliteVal.textContent = `${el}`;
      this.lab.evolution.updateConfig({ eliteCount: el });
    });

    const selSelect = document.getElementById('evo-selection') as HTMLSelectElement;
    selSelect.addEventListener('change', () => {
      this.lab.evolution.updateConfig({ selectionMethod: selSelect.value as any });
    });

    const crossSelect = document.getElementById('evo-crossover') as HTMLSelectElement;
    crossSelect.addEventListener('change', () => {
      this.lab.evolution.updateConfig({ crossoverMethod: crossSelect.value as any });
    });

    const crossRateSlider = document.getElementById('evo-cross-rate') as HTMLInputElement;
    const crossRateVal = document.getElementById('evo-cross-rate-val')!;
    crossRateSlider.addEventListener('input', () => {
      const r = parseFloat(crossRateSlider.value);
      crossRateVal.textContent = r.toFixed(2);
      this.lab.evolution.updateConfig({ crossoverRate: r });
    });

    const mutSelect = document.getElementById('evo-mutation') as HTMLSelectElement;
    mutSelect.addEventListener('change', () => {
      this.lab.evolution.updateConfig({ mutationMethod: mutSelect.value as any });
    });

    const mutRateSlider = document.getElementById('evo-mut-rate') as HTMLInputElement;
    const mutRateVal = document.getElementById('evo-mut-rate-val')!;
    mutRateSlider.addEventListener('input', () => {
      const r = parseFloat(mutRateSlider.value);
      mutRateVal.textContent = r.toFixed(2);
      this.lab.evolution.updateConfig({ mutationRate: r });
    });

    const mutStrSlider = document.getElementById('evo-mut-strength') as HTMLInputElement;
    const mutStrVal = document.getElementById('evo-mut-strength-val')!;
    mutStrSlider.addEventListener('input', () => {
      const s = parseFloat(mutStrSlider.value);
      mutStrVal.textContent = s.toFixed(2);
      this.lab.evolution.updateConfig({ mutationStrength: s });
    });

    // Fitness weights
    const fitUpright = document.getElementById('fit-upright') as HTMLInputElement;
    const fitUprightVal = document.getElementById('fit-upright-val')!;
    fitUpright.addEventListener('input', () => {
      const v = parseFloat(fitUpright.value);
      fitUprightVal.textContent = v.toFixed(1);
      this.lab.evaluator.updateWeights({ uprightReward: v });
    });

    const fitBonus = document.getElementById('fit-bonus') as HTMLInputElement;
    const fitBonusVal = document.getElementById('fit-bonus-val')!;
    fitBonus.addEventListener('input', () => {
      const v = parseFloat(fitBonus.value);
      fitBonusVal.textContent = v.toFixed(1);
      this.lab.evaluator.updateWeights({ balanceBonus: v });
    });

    const fitVolt = document.getElementById('fit-volt-pen') as HTMLInputElement;
    const fitVoltVal = document.getElementById('fit-volt-pen-val')!;
    fitVolt.addEventListener('input', () => {
      const v = parseFloat(fitVolt.value);
      fitVoltVal.textContent = v.toFixed(3);
      this.lab.evaluator.updateWeights({ voltagePenalty: v });
    });

    const fitJerk = document.getElementById('fit-jerk-pen') as HTMLInputElement;
    const fitJerkVal = document.getElementById('fit-jerk-pen-val')!;
    if (fitJerk && fitJerkVal) {
      fitJerk.addEventListener('input', () => {
        const v = parseFloat(fitJerk.value);
        fitJerkVal.textContent = v.toFixed(3);
        this.lab.evaluator.updateWeights({ jerkPenalty: v });
      });
    }

    const fitCenter = document.getElementById('fit-center-pen') as HTMLInputElement;
    const fitCenterVal = document.getElementById('fit-center-pen-val')!;
    if (fitCenter && fitCenterVal) {
      fitCenter.addEventListener('input', () => {
        const v = parseFloat(fitCenter.value);
        fitCenterVal.textContent = v.toFixed(2);
        this.lab.evaluator.updateWeights({ centerPenalty: v });
      });
    }
  }

  // --- 5. Physics Controls ---
  private initPhysicsControls(): void {
    const matPend = document.getElementById('mat-pendulum') as HTMLSelectElement;
    matPend.addEventListener('change', () => {
      if (this.lab.physics instanceof FurutaPendulum) {
        this.lab.physics.updateParams({ pendulumMaterial: matPend.value });
        this.furutaMesh.rebuildPendulumGeometry(matPend.value);
        this.updatePhysicsReadout();
      }
    });

    const pendLenSlider = document.getElementById('phy-pend-len') as HTMLInputElement;
    const pendLenVal = document.getElementById('phy-pend-len-val')!;
    pendLenSlider.addEventListener('input', () => {
      const L = parseFloat(pendLenSlider.value);
      pendLenVal.textContent = `${L.toFixed(3)} m`;
      if (this.lab.physics instanceof FurutaPendulum) {
        this.lab.physics.updateParams({ pendulumLength: L });
        this.furutaMesh.updateDimensions(
          this.lab.physics.getParams().armLength,
          this.lab.physics.getParams().armRadius,
          L,
          this.lab.physics.getParams().pendulumRadius
        );
        this.updatePhysicsReadout();
      }
    });

    const pendRadSlider = document.getElementById('phy-pend-rad') as HTMLInputElement;
    const pendRadVal = document.getElementById('phy-pend-rad-val')!;
    pendRadSlider.addEventListener('input', () => {
      const r = parseFloat(pendRadSlider.value) / 1000.0;
      pendRadVal.textContent = `${(r * 1000).toFixed(1)} mm`;
      if (this.lab.physics instanceof FurutaPendulum) {
        this.lab.physics.updateParams({ pendulumRadius: r });
        this.furutaMesh.updateDimensions(
          this.lab.physics.getParams().armLength,
          this.lab.physics.getParams().armRadius,
          this.lab.physics.getParams().pendulumLength,
          r
        );
        this.updatePhysicsReadout();
      }
    });

    const armLenSlider = document.getElementById('phy-arm-len') as HTMLInputElement;
    const armLenVal = document.getElementById('phy-arm-len-val')!;
    if (armLenSlider && armLenVal) {
      armLenSlider.addEventListener('input', () => {
        const L = parseFloat(armLenSlider.value);
        armLenVal.textContent = `${L.toFixed(3)} m`;
        if (this.lab.physics instanceof FurutaPendulum) {
          this.lab.physics.updateParams({ armLength: L });
          const p = this.lab.physics.getParams();
          this.furutaMesh.updateDimensions(L, p.armRadius, p.pendulumLength, p.pendulumRadius);
          this.updatePhysicsReadout();
        }
      });
    }

    // Motor sliders
    const motorV = document.getElementById('motor-max-v') as HTMLInputElement;
    const motorVVal = document.getElementById('motor-max-v-val')!;
    motorV.addEventListener('input', () => {
      const v = parseFloat(motorV.value);
      motorVVal.textContent = `${v} V`;
      if (this.lab.physics instanceof FurutaPendulum) {
        const cur = this.lab.physics.getParams().motor;
        this.lab.physics.updateParams({ motor: { ...cur, maxVoltage: v } });
      }
    });

    const motorRes = document.getElementById('motor-res') as HTMLInputElement;
    const motorResVal = document.getElementById('motor-res-val')!;
    if (motorRes && motorResVal) {
      motorRes.addEventListener('input', () => {
        const r = parseFloat(motorRes.value);
        motorResVal.textContent = `${r.toFixed(1)} Ω`;
        if (this.lab.physics instanceof FurutaPendulum) {
          const cur = this.lab.physics.getParams().motor;
          this.lab.physics.updateParams({ motor: { ...cur, resistance: r } });
        }
      });
    }

    const motorKb = document.getElementById('motor-kb') as HTMLInputElement;
    const motorKbVal = document.getElementById('motor-kb-val')!;
    if (motorKb && motorKbVal) {
      motorKb.addEventListener('input', () => {
        const kb = parseFloat(motorKb.value);
        motorKbVal.textContent = kb.toFixed(3);
        if (this.lab.physics instanceof FurutaPendulum) {
          const cur = this.lab.physics.getParams().motor;
          this.lab.physics.updateParams({ motor: { ...cur, backEmfConstant: kb } });
        }
      });
    }

    const motorTau = document.getElementById('motor-tau-max') as HTMLInputElement;
    const motorTauVal = document.getElementById('motor-tau-max-val')!;
    if (motorTau && motorTauVal) {
      motorTau.addEventListener('input', () => {
        const tau = parseFloat(motorTau.value);
        motorTauVal.textContent = `${tau.toFixed(1)} N·m`;
        if (this.lab.physics instanceof FurutaPendulum) {
          const cur = this.lab.physics.getParams().motor;
          this.lab.physics.updateParams({ motor: { ...cur, maxTorque: tau } });
        }
      });
    }

    // Friction sliders
    const fricVisc = document.getElementById('fric-viscous') as HTMLInputElement;
    const fricViscVal = document.getElementById('fric-viscous-val')!;
    if (fricVisc && fricViscVal) {
      fricVisc.addEventListener('input', () => {
        const b = parseFloat(fricVisc.value);
        fricViscVal.textContent = b.toFixed(4);
        if (this.lab.physics instanceof FurutaPendulum) {
          const cur = this.lab.physics.getParams().friction;
          this.lab.physics.updateParams({ friction: { ...cur, viscousArm: b, viscousPendulum: b } });
        }
      });
    }

    const fricCoul = document.getElementById('fric-coulomb') as HTMLInputElement;
    const fricCoulVal = document.getElementById('fric-coulomb-val')!;
    if (fricCoul && fricCoulVal) {
      fricCoul.addEventListener('input', () => {
        const c = parseFloat(fricCoul.value);
        fricCoulVal.textContent = c.toFixed(4);
        if (this.lab.physics instanceof FurutaPendulum) {
          const cur = this.lab.physics.getParams().friction;
          this.lab.physics.updateParams({ friction: { ...cur, coulombArm: c, coulombPendulum: c } });
        }
      });
    }

    this.updatePhysicsReadout();
  }

  private updatePhysicsReadout(): void {
    const massEl = document.getElementById('calc-pend-mass');
    const inertiaEl = document.getElementById('calc-pend-inertia');
    const comEl = document.getElementById('calc-pend-com');

    if (this.lab.physics instanceof FurutaPendulum) {
      const p = this.lab.physics.getParams();
      if (massEl) massEl.textContent = `${p.pendulumMass.toFixed(3)} kg`;
      if (inertiaEl) inertiaEl.textContent = `${p.pendulumInertia.toFixed(5)} kg·m²`;
      if (comEl) comEl.textContent = `${p.pendulumCom.toFixed(4)} m`;
    } else if (this.lab.currentSystemId === 'cartpole') {
      if (massEl) massEl.textContent = `0.150 kg (Vara)`;
      if (inertiaEl) inertiaEl.textContent = `1.000 kg (Carro)`;
      if (comEl) comEl.textContent = `0.250 m`;
    } else if (this.lab.currentSystemId === 'crane') {
      if (massEl) massEl.textContent = `1.000 kg (Carga)`;
      if (inertiaEl) inertiaEl.textContent = `5.000 kg (Trolley)`;
      if (comEl) comEl.textContent = `1.000 m (Cabo)`;
    }
  }

  // --- 6. Guided Missions List ---
  private initMissionsList(): void {
    const container = document.getElementById('missions-list');
    if (!container) return;

    container.innerHTML = '';
    MISSIONS.forEach(mission => {
      const card = document.createElement('div');
      card.className = 'mission-card';

      card.innerHTML = `
        <span class="mission-difficulty difficulty-${mission.difficulty}">${mission.difficulty}</span>
        <h4 style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 2px;">${mission.title}</h4>
        <div style="font-size: 11px; color: var(--accent-cyan); margin-bottom: 8px;">${mission.subtitle}</div>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">${mission.theory}</p>
        <div style="font-size: 11px; color: #fff; background: rgba(0, 240, 255, 0.08); padding: 6px; border-radius: 4px; margin-bottom: 8px;">
          🎯 <strong>Objetivo:</strong> ${mission.goalDescription}
        </div>
        <button class="btn btn-primary btn-load-mission" data-id="${mission.id}" style="width: 100%; justify-content: center;">
          Carregar Desafio
        </button>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll('.btn-load-mission').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        const mission = MISSIONS.find(m => m.id === id);
        if (mission) {
          this.loadMission(mission);
        }
      });
    });
  }

  private loadMission(mission: (typeof MISSIONS)[0]): void {
    // 1. Overrides
    if (mission.sensorOverrides) this.lab.sensors.updateConfig(mission.sensorOverrides);
    if (mission.physicsOverrides && this.lab.physics instanceof FurutaPendulum) {
      this.lab.physics.updateParams(mission.physicsOverrides);
    }
    if (mission.evolutionOverrides) this.lab.evolution.updateConfig(mission.evolutionOverrides);

    // 2. Preset & Network Reconfiguration
    const inDim = this.lab.sensors.computeOutputDim();
    const configs = NeuralNetwork.createPreset(mission.suggestedPreset, inDim, 1);
    this.applyNetworkUpdate(configs);

    alert(`Missão Carregada: "${mission.title}"\n\nDica Didática: ${mission.hint}`);
  }

  // --- 7. Theoretical Inspector ---
  private initInspector(): void {
    const drawer = document.getElementById('inspector-drawer')!;
    const closeBtn = document.getElementById('inspector-close')!;
    const titleEl = document.getElementById('inspector-title')!;
    const formulaEl = document.getElementById('inspector-formula')!;
    const conceptEl = document.getElementById('inspector-concept')!;
    const examplesEl = document.getElementById('inspector-examples')!;
    const generalEl = document.getElementById('inspector-general')!;
    const simEl = document.getElementById('inspector-simulation')!;
    const tipEl = document.getElementById('inspector-tip')!;

    closeBtn.addEventListener('click', () => {
      drawer.classList.remove('active');
    });

    // Close when clicking outside drawer
    document.addEventListener('click', (e) => {
      if (drawer.classList.contains('active') && !drawer.contains(e.target as Node) && !(e.target as HTMLElement).classList.contains('info-badge')) {
        drawer.classList.remove('active');
      }
    });

    document.querySelectorAll('.info-badge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const topicKey = (badge as HTMLElement).dataset.topic;
        if (!topicKey || !TOPICS[topicKey]) return;

        const topic = TOPICS[topicKey];
        titleEl.textContent = `${topic.title} [${topic.category}]`;
        formulaEl.textContent = topic.formula || 'Sem fórmula fechada';
        conceptEl.innerHTML = topic.concept || topic.intuition || '';
        examplesEl.innerHTML = topic.examples;
        generalEl.innerHTML = topic.generalExpectation || topic.highValueImpact || '';
        simEl.innerHTML = topic.simulationSpecific || topic.lowValueImpact || '';
        tipEl.innerHTML = topic.proTip ? `💡 <strong>Dica Didática:</strong> ${topic.proTip}` : '';

        drawer.classList.add('active');
      });
    });
  }

  // --- 8. Export / Import ---
  private initExportImport(): void {
    const exportBtn = document.getElementById('btn-export') as HTMLButtonElement;
    const importBtn = document.getElementById('btn-import') as HTMLButtonElement;
    const fileInput = document.getElementById('import-file-input') as HTMLInputElement;

    exportBtn.addEventListener('click', () => {
      const best = this.lab.evolution.getBestIndividual();
      const json = {
        timestamp: new Date().toISOString(),
        networkConfig: this.lab.network.toJSON(),
        bestIndividual: best,
        physicsParams: this.lab.physics instanceof FurutaPendulum ? this.lab.physics.getParams() : {}
      };

      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `furuta_champion_gen${this.lab.evolution.getGeneration()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
      if (!fileInput.files || fileInput.files.length === 0) return;
      const file = fileInput.files[0];
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.networkConfig) {
          const restoredNet = NeuralNetwork.fromJSON(data.networkConfig);
          this.lab.updateNetwork(restoredNet.getLayers().map(l => l.config));
          this.lab.network.setWeights(restoredNet.getWeights());
          this.synapticCanvas.setNetwork(this.lab.network);
          this.updateLayerStackUI();
          this.updateHUD();
          alert('Genoma importado e aplicado com sucesso!');
        }
      } catch (err) {
        alert('Erro ao carregar ficheiro JSON.');
      }
    });
  }

  // --- Real-time HUD and Phase Portrait Updates ---
  public updateHUD(): void {
    const state = this.lab.physics.getState();
    const stats = this.lab.evolution.getBestIndividual();

    const genEl = document.getElementById('hud-generation');
    const genProgEl = document.getElementById('hud-gen-progress');
    const fitEl = document.getElementById('hud-fitness');
    const balEl = document.getElementById('hud-balance-time');
    const voltEl = document.getElementById('hud-voltage');
    const hzEl = document.getElementById('hud-physics-hz');

    if (genEl) genEl.textContent = `${this.lab.evolution.getGeneration()}`;
    if (genProgEl) genProgEl.textContent = `${this.lab.simTime.toFixed(1)} / ${this.lab.getGenerationTime().toFixed(1)} s`;
    if (fitEl) fitEl.textContent = (stats?.fitness ?? 0).toFixed(1);
    if (balEl) {
      const bestBal = stats?.rawBalanceTime ?? 0;
      const balVal = this.lab.isRunning ? this.lab.balanceDuration : (bestBal > 0 ? bestBal : this.lab.balanceDuration);
      balEl.textContent = `${balVal.toFixed(2)} s`;
    }
    if (voltEl) voltEl.textContent = `${this.lab.currentVoltage.toFixed(2)} V`;
    if (hzEl) hzEl.textContent = `${this.lab.physicsStepsPerSec} Hz`;

    // Keep synaptic canvas in sync with active NEAT genome when in NEAT mode
    if (this.lab.evolution.getConfig().algorithm === 'neat') {
      this.synapticCanvas.setNeatGenome(stats?.neatGenome ?? null);
    }

    // Update Phase Portrait Plot
    this.updatePhasePortrait(state.alpha, state.alphaDot);
  }

  private updatePhasePortrait(alpha: number, alphaDot: number): void {
    if (!this.phaseCanvas || !this.phaseCtx) return;

    this.phaseHistory.push({ alpha, alphaDot });
    if (this.phaseHistory.length > 120) {
      this.phaseHistory.shift();
    }

    const ctx = this.phaseCtx;
    const w = this.phaseCanvas.width = 200;
    const h = this.phaseCanvas.height = 120;

    ctx.fillStyle = '#060910';
    ctx.fillRect(0, 0, w, h);

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Trajectory
    if (this.phaseHistory.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;

      const alphaScale = (w / 2) / Math.PI; // [-pi, pi] -> [0, w]
      const velScale = (h / 2) / 15.0;      // [-15, 15] rad/s -> [0, h]

      for (let i = 0; i < this.phaseHistory.length; i++) {
        const pt = this.phaseHistory[i];
        const x = w / 2 + pt.alpha * alphaScale;
        const y = h / 2 - pt.alphaDot * velScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Current head point
      const current = this.phaseHistory[this.phaseHistory.length - 1];
      const curX = w / 2 + current.alpha * alphaScale;
      const curY = h / 2 - current.alphaDot * velScale;
      ctx.beginPath();
      ctx.arc(curX, curY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88';
      ctx.fill();
    }
  }
}
