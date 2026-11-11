/**
 * Pedagogical Missions Engine (Guided Learning Path)
 * Provides progressive didactic challenges from fundamental control theory
 * to advanced neuroevolution robustness.
 */

import { LayerConfig, SensorPipelineConfig } from '../core/neural/types.ts';
import { FurutaParams } from '../core/physics/types.ts';
import { EvolutionConfig } from '../core/evolution/types.ts';

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  difficulty: 'Iniciante' | 'Intermédio' | 'Avançado' | 'Mestre';
  theory: string;
  goalDescription: string;
  successCondition: (balanceTime: number, voltage: number, generation: number) => boolean;
  hint: string;
  suggestedPreset: string;
  sensorOverrides?: Partial<SensorPipelineConfig>;
  physicsOverrides?: Partial<FurutaParams>;
  evolutionOverrides?: Partial<EvolutionConfig>;
}

export const MISSIONS: Mission[] = [
  {
    id: 'mission_1',
    title: 'Missão 1: A Barreira Linear',
    subtitle: 'Por que controladores puramente lineares falham no swing-up',
    difficulty: 'Iniciante',
    theory: `Na teoria de controlo clássico, aproximar um sistema por linearização (séries de Taylor em torno de alpha = 0) funciona apenas para pequenas oscilações. No entanto, para levantar o pêndulo a partir de repouso (alpha = pi), a dinâmica do seno e forças centrífugas é fortemente não-linear. Uma rede puramente linear é uma transformação afim que não consegue criar a "bomba de energia" necessária.`,
    goalDescription: 'Experimente treinar com a arquitetura Linear e veja a incapacidade de subir. Depois mude para MLP (Tanh) ou SIREN para quebrar a barreira!',
    successCondition: (balanceTime) => balanceTime >= 2.0,
    hint: 'Mude a arquitetura para "MLP Clássico" ou "SIREN" na aba de Redes Neurais e veja a diferença!',
    suggestedPreset: 'linear',
    sensorOverrides: {
      includeAngles: true,
      includeTrig: true,
      includeVelocities: true,
      noiseStd: 0.0,
      latencyMs: 0
    }
  },
  {
    id: 'mission_2',
    title: 'Missão 2: Domando o Caos (Swing-up Completo)',
    subtitle: 'Acumulação de energia cinética e travagem precisa no topo',
    difficulty: 'Intermédio',
    theory: `O pêndulo começa pendurado para baixo (alpha = pi). Para subir, o braço horizontal precisa oscilar em ressonância com a frequência natural do pêndulo (w = sqrt(g / lp)) para injetar energia cinética e, no instante em que atinge o ápice vertical (alpha = 0), aplicar uma travagem com contra-torque súbito.`,
    goalDescription: 'Evolua uma rede capaz de oscilar para ganhar balanço e equilibrar o pêndulo no topo por mais de 3 segundos consecutivos.',
    successCondition: (balanceTime) => balanceTime >= 3.0,
    hint: 'Use Crossover BLX-alpha com Mutação Cauchy para descobrir o padrão ressonante de bombeamento.',
    suggestedPreset: 'mlp'
  },
  {
    id: 'mission_3',
    title: 'Missão 3: O Sensor Cego (Ruído e Latência)',
    subtitle: 'Superando 30ms de atraso e ruído de encoders óticos',
    difficulty: 'Avançado',
    theory: `Em ambiente industrial real, conversores ADC, barramentos CAN e encoders de quadratura inserem atrasos temporais (latência de 20 a 50ms) e ruído estocástico. Controladores reativos simples tornam-se instáveis porque respondem ao passado. Redes com memória (como GRU) ou representações periódicas (SIREN) filtram o atraso retendo o estado de velocidades no seu vetor oculto.`,
    goalDescription: 'Equilibre o pêndulo sob 30ms de latência e ruído de encoder por mais de 2.5 segundos.',
    successCondition: (balanceTime) => balanceTime >= 2.5,
    hint: 'Ative a arquitetura "Célula Recorrente GRU" na aba de Redes Neurais.',
    suggestedPreset: 'gru',
    sensorOverrides: {
      includeAngles: true,
      includeTrig: true,
      includeVelocities: true,
      noiseStd: 0.04,
      quantizationBits: 10, // 1024 pulses/rev
      latencyMs: 30
    }
  },
  {
    id: 'mission_4',
    title: 'Missão 4: O Desafio dos Pesados',
    subtitle: 'Troca de material para Latão Naval (3.1x mais denso)',
    difficulty: 'Avançado',
    theory: `Ao trocar o material da haste para Latão (8500 kg/m^3 vs 2700 kg/m^3 do Alumínio), a massa e o momento de inércia triplicam. Isto diminui a aceleração angular natural e exige correntes muito maiores do motor DC, aproximando o atuador do limite de saturação de torque.`,
    goalDescription: 'Equilibre a haste pesada de Latão Naval por pelo menos 3 segundos.',
    successCondition: (balanceTime) => balanceTime >= 3.0,
    hint: 'Aumente o peso da recompensa de equilíbrio e utilize mutações mais fortes para explorar torques no limite da saturação.',
    suggestedPreset: 'diamond',
    physicsOverrides: {
      pendulumMaterial: 'brass'
    }
  },
  {
    id: 'mission_5',
    title: 'Missão 5: Fortaleza contra Perturbações',
    subtitle: 'Resistência dinâmica a choques externos manuais e rajadas',
    difficulty: 'Mestre',
    theory: `Um bom sistema de controlo não deve apenas equilibrar em condições ideais de laboratório, mas rejeitar perturbações impulsivas externas (impactos mecânicos ou vento) mantendo a bacia de atração estável.`,
    goalDescription: 'Equilibre por mais de 4 segundos enquanto aplica perturbações com o rato (clique na haste no modo 3D).',
    successCondition: (balanceTime) => balanceTime >= 4.0,
    hint: 'Uma penalização de Jerk bem afinada cria movimentos mais suaves e menos suscetíveis a ressonâncias parasitas.',
    suggestedPreset: 'resnet'
  }
];
