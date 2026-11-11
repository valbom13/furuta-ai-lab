/**
 * Neural Network Types and Definitions
 */

export type ActivationType =
  | 'relu'
  | 'leaky_relu'
  | 'gelu'
  | 'elu'
  | 'tanh'
  | 'sigmoid'
  | 'siren'
  | 'linear';

export type LayerType = 'dense' | 'resnet_block' | 'gru';

export interface LayerConfig {
  id: string;
  type: LayerType;
  inFeatures: number;
  outFeatures: number;
  activation: ActivationType;
  useBias: boolean;
}

export interface NetworkPreset {
  id: string;
  name: string;
  description: string;
  didacticRationale: string;
  layers: LayerConfig[];
}

export interface SensorPipelineConfig {
  includeAngles: boolean;         // [theta, alpha]
  includeTrig: boolean;           // [sin(alpha), cos(alpha), sin(theta), cos(theta)]
  includeVelocities: boolean;     // [thetaDot, alphaDot]
  noiseStd: number;               // Gaussian sensor noise standard deviation
  quantizationBits: number;       // Optical encoder resolution: 0 (disabled), 8, 10 (1024), 12 (4096)
  latencyMs: number;              // Simulated sensor transmission delay (ms): 0 to 50ms
}

export interface SynapsePulse {
  fromNeuron: number;
  toNeuron: number;
  layerIndex: number;
  intensity: number;
  progress: number; // 0 to 1
}
