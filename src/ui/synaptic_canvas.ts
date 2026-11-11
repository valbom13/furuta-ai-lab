/**
 * Live Pulsating Synaptic Activation Diagram
 * Real-time 2D Canvas rendering of network topology, node activations,
 * weight sign/magnitudes, and electrical pulses traveling across synapses.
 */

import { NeuralNetwork } from '../core/neural/network.ts';
import { NeatGenome } from '../core/evolution/neat.ts';

interface SynapseSignal {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  speed: number;
  intensity: number;
  color: string;
}

export class SynapticCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private network: NeuralNetwork;
  private activeNeatGenome: NeatGenome | null = null;
  private signals: SynapseSignal[] = [];
  private pulseTimer = 0;

  constructor(canvas: HTMLCanvasElement, network: NeuralNetwork) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
    this.network = network;

    this.resize();
  }

  public setNetwork(network: NeuralNetwork): void {
    this.network = network;
    this.activeNeatGenome = null;
    this.signals = [];
  }

  public setNeatGenome(genome: NeatGenome | null): void {
    this.activeNeatGenome = genome;
    this.signals = [];
  }


  public resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
    }
  }

  /**
   * Renders one frame of the pulsating synaptic diagram.
   */
  public render(inputActivations?: Float32Array): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    if (this.activeNeatGenome) {
      this.renderNeatGraph(ctx, width, height, inputActivations);
      return;
    }

    const layers = this.network.getLayers();
    if (layers.length === 0) return;


    // Collect layer sizes: Input + All Layer Outputs
    const layerSizes: number[] = [this.network.getInputDim()];
    for (const l of layers) {
      layerSizes.push(l.config.outFeatures);
    }

    const numCols = layerSizes.length;
    const colSpacing = (width - 60) / Math.max(1, numCols - 1);

    // Compute node coordinates: col -> nodeIdx -> {x, y, activation}
    const nodeCoords: { x: number; y: number; val: number }[][] = [];

    for (let c = 0; c < numCols; c++) {
      const count = layerSizes[c];
      const colX = 30 + c * colSpacing;
      const rowSpacing = Math.min(28, (height - 40) / Math.max(1, count));
      const startY = height / 2 - ((count - 1) * rowSpacing) / 2;

      const colNodes: { x: number; y: number; val: number }[] = [];
      const layerOutput = c === 0 ? inputActivations : layers[c - 1].getOutput();

      for (let r = 0; r < count; r++) {
        const val = layerOutput && r < layerOutput.length ? layerOutput[r] : 0.0;
        colNodes.push({
          x: colX,
          y: startY + r * rowSpacing,
          val
        });
      }
      nodeCoords.push(colNodes);
    }

    // 1. Draw Synaptic Connections
    for (let c = 0; c < numCols - 1; c++) {
      const fromNodes = nodeCoords[c];
      const toNodes = nodeCoords[c + 1];

      // Draw connection lines
      for (let i = 0; i < fromNodes.length; i++) {
        for (let j = 0; j < toNodes.length; j++) {
          const n1 = fromNodes[i];
          const n2 = toNodes[j];

          // Simplified weight estimation from activations
          const synVal = n1.val * n2.val;
          const isPos = synVal >= 0;
          const alpha = Math.min(0.4, Math.max(0.04, Math.abs(synVal) * 0.5));

          ctx.beginPath();
          ctx.strokeStyle = isPos ? `rgba(0, 240, 255, ${alpha})` : `rgba(255, 51, 102, ${alpha})`;
          ctx.lineWidth = Math.min(2.5, Math.max(0.5, Math.abs(synVal) * 2));
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }
    }

    // 2. Spawn and Animate Synaptic Pulses
    this.pulseTimer++;
    if (this.pulseTimer % 4 === 0) {
      // Spawn pulse from active input or middle node
      for (let c = 0; c < numCols - 1; c++) {
        const fromNodes = nodeCoords[c];
        const toNodes = nodeCoords[c + 1];
        if (fromNodes.length > 0 && toNodes.length > 0) {
          const randFrom = fromNodes[Math.floor(Math.random() * fromNodes.length)];
          const randTo = toNodes[Math.floor(Math.random() * toNodes.length)];

          if (Math.abs(randFrom.val) > 0.05) {
            this.signals.push({
              fromX: randFrom.x,
              fromY: randFrom.y,
              toX: randTo.x,
              toY: randTo.y,
              progress: 0,
              speed: 0.05 + Math.random() * 0.04,
              intensity: Math.abs(randFrom.val),
              color: randFrom.val >= 0 ? '#00f0ff' : '#ff3366'
            });
          }
        }
      }
    }

    // Update and draw active pulses
    for (let s = this.signals.length - 1; s >= 0; s--) {
      const sig = this.signals[s];
      sig.progress += sig.speed;

      if (sig.progress >= 1.0) {
        this.signals.splice(s, 1);
        continue;
      }

      const curX = sig.fromX + (sig.toX - sig.fromX) * sig.progress;
      const curY = sig.fromY + (sig.toY - sig.fromY) * sig.progress;

      ctx.beginPath();
      ctx.arc(curX, curY, 2.0, 0, Math.PI * 2);
      ctx.fillStyle = sig.color;
      ctx.shadowColor = sig.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 3. Draw Neurons (Glowing Circles)
    for (let c = 0; c < numCols; c++) {
      const colNodes = nodeCoords[c];
      for (let r = 0; r < colNodes.length; r++) {
        const node = colNodes[r];
        const normVal = Math.tanh(node.val); // [-1, 1]
        const intensity = Math.abs(normVal);

        const radius = 4.5 + intensity * 2.5;

        // Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 2, 0, Math.PI * 2);
        const glowColor = normVal >= 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 51, 102, 0.4)';
        ctx.fillStyle = glowColor;
        ctx.fill();

        // Node Body
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = normVal >= 0 ? '#00f0ff' : '#ff3366';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  private renderNeatGraph(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    inputActivations?: Float32Array
  ): void {
    const genome = this.activeNeatGenome!;
    const inputNodes = genome.nodes.filter(n => n.type === 'input');
    const outputNodes = genome.nodes.filter(n => n.type === 'output');
    const hiddenNodes = genome.nodes.filter(n => n.type === 'hidden');

    const nodePositions = new Map<number, { x: number; y: number; val: number }>();

    // Input column (x = 35)
    const inSpacing = Math.min(28, (height - 40) / Math.max(1, inputNodes.length));
    const inStartY = height / 2 - ((inputNodes.length - 1) * inSpacing) / 2;
    inputNodes.forEach((n, idx) => {
      const val = inputActivations && idx < inputActivations.length ? inputActivations[idx] : 0.0;
      nodePositions.set(n.id, { x: 35, y: inStartY + idx * inSpacing, val });
    });

    // Output column (x = width - 35)
    const outSpacing = Math.min(28, (height - 40) / Math.max(1, outputNodes.length));
    const outStartY = height / 2 - ((outputNodes.length - 1) * outSpacing) / 2;
    outputNodes.forEach((n, idx) => {
      nodePositions.set(n.id, { x: width - 35, y: outStartY + idx * outSpacing, val: 0.0 });
    });

    // Hidden nodes column in middle
    if (hiddenNodes.length > 0) {
      const hidSpacing = Math.min(26, (height - 40) / Math.max(1, hiddenNodes.length));
      const hidStartY = height / 2 - ((hiddenNodes.length - 1) * hidSpacing) / 2;
      hiddenNodes.forEach((n, idx) => {
        nodePositions.set(n.id, { x: width / 2, y: hidStartY + idx * hidSpacing, val: 0.0 });
      });
    }

    // Draw active connections
    for (const conn of genome.connections) {
      if (!conn.enabled) continue;
      const p1 = nodePositions.get(conn.inNode);
      const p2 = nodePositions.get(conn.outNode);
      if (!p1 || !p2) continue;

      const isPos = conn.weight >= 0;
      const alpha = Math.min(0.7, Math.max(0.15, Math.abs(conn.weight) * 0.4));
      ctx.beginPath();
      ctx.strokeStyle = isPos ? `rgba(0, 240, 255, ${alpha})` : `rgba(255, 51, 102, ${alpha})`;
      ctx.lineWidth = Math.min(2.5, Math.max(0.6, Math.abs(conn.weight) * 1.5));
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Spawn pulses along NEAT connections
    this.pulseTimer++;
    if (this.pulseTimer % 5 === 0 && genome.connections.length > 0) {
      const activeConns = genome.connections.filter(c => c.enabled);
      if (activeConns.length > 0) {
        const randConn = activeConns[Math.floor(Math.random() * activeConns.length)];
        const p1 = nodePositions.get(randConn.inNode);
        const p2 = nodePositions.get(randConn.outNode);
        if (p1 && p2) {
          this.signals.push({
            fromX: p1.x,
            fromY: p1.y,
            toX: p2.x,
            toY: p2.y,
            progress: 0,
            speed: 0.04 + Math.random() * 0.04,
            intensity: Math.abs(randConn.weight),
            color: randConn.weight >= 0 ? '#00f0ff' : '#ff3366'
          });
        }
      }
    }

    // Update and draw active pulses
    for (let s = this.signals.length - 1; s >= 0; s--) {
      const sig = this.signals[s];
      sig.progress += sig.speed;
      if (sig.progress >= 1.0) {
        this.signals.splice(s, 1);
        continue;
      }
      const curX = sig.fromX + (sig.toX - sig.fromX) * sig.progress;
      const curY = sig.fromY + (sig.toY - sig.fromY) * sig.progress;

      ctx.beginPath();
      ctx.arc(curX, curY, 2.0, 0, Math.PI * 2);
      ctx.fillStyle = sig.color;
      ctx.fill();
    }

    // Draw Nodes
    nodePositions.forEach((pos) => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = pos.val >= 0 ? '#00f0ff' : '#ff3366';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }
}

