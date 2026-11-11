/**
 * Neural Network Class & Architecture Presets
 * Zero-garbage-collection forward inference, weight vector serialization,
 * and live synaptic activation extraction.
 */

import { LayerConfig, NetworkPreset, ActivationType } from './types.ts';
import { ILayer, DenseLayer, ResNetBlock, GRULayer } from './layer.ts';

export class NeuralNetwork {
  private layers: ILayer[] = [];
  private totalWeights = 0;
  private weightBuffer: Float32Array;
  private inputDim: number;
  private outputDim: number;

  constructor(layerConfigs: LayerConfig[]) {
    this.buildFromConfigs(layerConfigs);
    this.inputDim = layerConfigs[0]?.inFeatures ?? 1;
    this.outputDim = layerConfigs[layerConfigs.length - 1]?.outFeatures ?? 1;
    this.weightBuffer = new Float32Array(this.totalWeights);
    this.syncWeightsFromLayers();
  }

  public buildFromConfigs(configs: LayerConfig[]): void {
    this.layers = [];
    this.totalWeights = 0;

    for (const cfg of configs) {
      let layer: ILayer;
      if (cfg.type === 'resnet_block') {
        layer = new ResNetBlock(cfg);
      } else if (cfg.type === 'gru') {
        layer = new GRULayer(cfg);
      } else {
        layer = new DenseLayer(cfg);
      }
      this.layers.push(layer);
      this.totalWeights += layer.getWeightCount();
    }

    this.weightBuffer = new Float32Array(this.totalWeights);
    this.syncWeightsFromLayers();
  }

  public getLayers(): readonly ILayer[] {
    return this.layers;
  }

  public getTotalWeights(): number {
    return this.totalWeights;
  }

  public getInputDim(): number {
    return this.inputDim;
  }

  public getOutputDim(): number {
    return this.outputDim;
  }

  /**
   * Reads all weights from layer instances into flat weightBuffer.
   */
  public syncWeightsFromLayers(): void {
    let offset = 0;
    for (const layer of this.layers) {
      offset = layer.getWeights(this.weightBuffer, offset);
    }
  }

  /**
   * Sets flat weight vector across all layers.
   */
  public setWeights(flatWeights: Float32Array): void {
    if (flatWeights.length !== this.totalWeights) {
      throw new Error(`Weight dimension mismatch: expected ${this.totalWeights}, got ${flatWeights.length}`);
    }
    this.weightBuffer.set(flatWeights);
    let offset = 0;
    for (const layer of this.layers) {
      offset = layer.setWeights(this.weightBuffer, offset);
    }
  }

  public getWeights(): Float32Array {
    return this.weightBuffer;
  }

  /**
   * Runs forward pass through all layers.
   * Returns reference to final output buffer.
   */
  public forward(input: Float32Array): Float32Array {
    let current = input;
    for (let i = 0; i < this.layers.length; i++) {
      current = this.layers[i].forward(current);
    }
    return current;
  }

  public reset(): void {
    for (const layer of this.layers) {
      layer.reset();
    }
  }

  /**
   * Exports full network definition and weights to JSON format.
   */
  public toJSON(): object {
    this.syncWeightsFromLayers();
    return {
      configs: this.layers.map(l => l.config),
      weights: Array.from(this.weightBuffer)
    };
  }

  /**
   * Restores network from JSON object.
   */
  public static fromJSON(json: { configs: LayerConfig[]; weights: number[] }): NeuralNetwork {
    const net = new NeuralNetwork(json.configs);
    net.setWeights(new Float32Array(json.weights));
    return net;
  }

  /**
   * Architecture Presets with Didactic Rationale
   */
  public static createPreset(presetId: string, inDim = 6, outDim = 1): LayerConfig[] {
    switch (presetId) {
      case 'linear':
        // Pure linear single-layer baseline
        return [
          { id: 'l1', type: 'dense', inFeatures: inDim, outFeatures: outDim, activation: 'linear', useBias: true }
        ];

      case 'bottleneck':
        // Gargalo (Bottleneck / Compressão): Inicia mais largo, comprime no centro para poucas dimensões e volta a expandir para a saída (Nin -> 16 -> 4 -> 8 -> 1)
        return [
          { id: 'b1', type: 'dense', inFeatures: inDim, outFeatures: 16, activation: 'tanh', useBias: true },
          { id: 'b2', type: 'dense', inFeatures: 16, outFeatures: 4, activation: 'leaky_relu', useBias: true },
          { id: 'b3', type: 'dense', inFeatures: 4, outFeatures: 8, activation: 'tanh', useBias: true },
          { id: 'b4', type: 'dense', inFeatures: 8, outFeatures: outDim, activation: 'tanh', useBias: true }
        ];

      case 'diamond':
        // Diamante (Diamond / Expansão): Inicia mais estreito, expande significativamente no centro para muitos neurónios e afunila de novo para a saída (Nin -> 8 -> 32 -> 8 -> 1)
        return [
          { id: 'd1', type: 'dense', inFeatures: inDim, outFeatures: 8, activation: 'tanh', useBias: true },
          { id: 'd2', type: 'dense', inFeatures: 8, outFeatures: 32, activation: 'leaky_relu', useBias: true },
          { id: 'd3', type: 'dense', inFeatures: 32, outFeatures: 8, activation: 'tanh', useBias: true },
          { id: 'd4', type: 'dense', inFeatures: 8, outFeatures: outDim, activation: 'tanh', useBias: true }
        ];

      case 'resnet':
        // ResNet / Residual Skip-Connection
        return [
          { id: 'r1', type: 'dense', inFeatures: inDim, outFeatures: 24, activation: 'leaky_relu', useBias: true },
          { id: 'r2', type: 'resnet_block', inFeatures: 24, outFeatures: 24, activation: 'leaky_relu', useBias: true },
          { id: 'r3', type: 'dense', inFeatures: 24, outFeatures: outDim, activation: 'tanh', useBias: true }
        ];

      case 'gru':
        // Recurrent Memory Architecture
        return [
          { id: 'g1', type: 'gru', inFeatures: inDim, outFeatures: 20, activation: 'tanh', useBias: true },
          { id: 'g2', type: 'dense', inFeatures: 20, outFeatures: 12, activation: 'leaky_relu', useBias: true },
          { id: 'g3', type: 'dense', inFeatures: 12, outFeatures: outDim, activation: 'tanh', useBias: true }
        ];

      case 'siren':
        // SIREN Sinusoidal Network for periodic physics
        return [
          { id: 's1', type: 'dense', inFeatures: inDim, outFeatures: 24, activation: 'siren', useBias: true },
          { id: 's2', type: 'dense', inFeatures: 24, outFeatures: 24, activation: 'siren', useBias: true },
          { id: 's3', type: 'dense', inFeatures: 24, outFeatures: outDim, activation: 'tanh', useBias: true }
        ];

      case 'mlp':
      default:
        // Classical 2-layer MLP
        return [
          { id: 'm1', type: 'dense', inFeatures: inDim, outFeatures: 24, activation: 'tanh', useBias: true },
          { id: 'm2', type: 'dense', inFeatures: 24, outFeatures: 16, activation: 'tanh', useBias: true },
          { id: 'm3', type: 'dense', inFeatures: 16, outFeatures: outDim, activation: 'tanh', useBias: true }
        ];
    }
  }

  public static readonly PRESETS_METADATA: NetworkPreset[] = [
    {
      id: 'mlp',
      name: 'MLP Clássico (Multilayer Perceptron)',
      description: '2 camadas ocultas com ativação Tanh simétrica.',
      didacticRationale: 'Topologia padrão de controlo contínuo. Tanh oferece saturação suave de torques.',
      layers: []
    },
    {
      id: 'bottleneck',
      name: 'Gargalo / Compressão (Bottleneck)',
      description: 'Inicia mais largo (16), comprime no centro (4) e volta a expandir (8).',
      didacticRationale: 'Força a rede a comprimir o espaço de estados num espaço latente compacto, eliminando ruído espúrio.',
      layers: []
    },
    {
      id: 'diamond',
      name: 'Diamante / Expansão (Diamond)',
      description: 'Inicia mais estreito (8), expande no centro (32) e afunila de novo (8).',
      didacticRationale: 'Aumenta significativamente a dimensionalidade latente para separação não-linear de trajetórias complexas.',
      layers: []
    },
    {
      id: 'resnet',
      name: 'ResNet (Skip-Connections Residuais)',
      description: 'Bloco residual com auto-estrada de gradiente.',
      didacticRationale: 'Permite que a rede aprenda perturbações incrementais sem degradar os sinais das camadas anteriores.',
      layers: []
    },
    {
      id: 'gru',
      name: 'Célula Recorrente GRU (Memória Temporal)',
      description: 'Portas de reset e update com vetor de estado latente.',
      didacticRationale: 'Fundamental para estimar velocidades ocultas quando sensores têm atraso (latência) ou ruído elevado.',
      layers: []
    },
    {
      id: 'siren',
      name: 'SIREN (Ativação Sinusoidal)',
      description: 'Camadas com sin(x) natural para dinâmicas harmónicas.',
      didacticRationale: 'Como o pêndulo oscila com seno e cosseno, a SIREN modela oscilações sem necessidade de aproximações polinomiais por partes.',
      layers: []
    },
    {
      id: 'linear',
      name: 'Linear (Sem Não-Linearidade)',
      description: 'Apenas uma multiplicação de matriz direta.',
      didacticRationale: 'Demonstra a barreira teórica: um controlador linear pode equilibrar no topo se já estiver perto, mas NUNCA consegue fazer o swing-up completo a partir de repouso.',
      layers: []
    }
  ];
}
