/**
 * Activation Functions & Didactic Inspector Metadata
 * Optimized for vectorized Float32Array execution with zero GC.
 */

import { ActivationType } from './types.ts';

export interface ActivationMeta {
  name: string;
  formula: string;
  range: string;
  didacticExplanation: string;
  bestFor: string;
  risk: string;
}

export const ACTIVATION_METADATA: Record<ActivationType, ActivationMeta> = {
  relu: {
    name: 'ReLU (Rectified Linear Unit)',
    formula: 'f(x) = \\max(0, x)',
    range: '[0, +\\infty)',
    didacticExplanation: 'Simples e computacionalmente barata. Elimina valores negativos, gerando ativações esparsas.',
    bestFor: 'Camadas intermédias em redes profundas, convergência rápida.',
    risk: 'Problema do "Dying ReLU": neurónios que recebem entradas negativas constantes morrem para sempre.'
  },
  leaky_relu: {
    name: 'Leaky ReLU',
    formula: 'f(x) = x \\text{ se } x > 0, 0.01x \\text{ c.c.}',
    range: '(-\\infty, +\\infty)',
    didacticExplanation: 'Variação da ReLU com um declive suave (0.01) para números negativos, evitando que neurónios morram.',
    bestFor: 'Sistemas com oscilações bipolares onde gradientes negativos são cruciais.',
    risk: 'Pode introduzir deriva lenta em pesos não restringidos.'
  },
  gelu: {
    name: 'GeLU (Gaussian Error Linear Unit)',
    formula: 'f(x) = x \\cdot \\Phi(x) \\approx 0.5x(1 + \\tanh(\\sqrt{2/\\pi}(x + 0.044715 x^3)))',
    range: '[-0.17, +\\infty)',
    didacticExplanation: 'Suavização probabilística da ReLU usada em Transformers (GPT, BERT). Pondera a entrada pelo seu valor na distribuição normal.',
    bestFor: 'Modelagem suave de trajetórias contínuas sem descontinuidades de derivada.',
    risk: 'Maior custo computacional que ReLU simples.'
  },
  elu: {
    name: 'ELU (Exponential Linear Unit)',
    formula: 'f(x) = x \\text{ se } x > 0, e^x - 1 \\text{ c.c.}',
    range: '(-1, +\\infty)',
    didacticExplanation: 'Suaviza a transição negativa assintoticamente para -1, aproximando o gradiente médio a zero.',
    bestFor: 'Acelerar o treino trazendo ativações médias para mais próximo de zero.',
    risk: 'Cálculo de exponenciais mais lento que multiplicações diretas.'
  },
  tanh: {
    name: 'Tangente Hiperbólica (Tanh)',
    formula: 'f(x) = \\tanh(x) = \\frac{e^x - e^{-x}}{e^x + e^{-x}}',
    range: '(-1, +1)',
    didacticExplanation: 'Centrada em zero, com saturação suave. Mapeia diretamente a comandos motores simétricos (ex.: torque horário vs anti-horário).',
    bestFor: 'Camada de saída de atuadores ou células de memória recorrente.',
    risk: 'Saturação de gradiente em valores extremos (|x| > 3).'
  },
  sigmoid: {
    name: 'Sigmóide (Logística)',
    formula: 'f(x) = \\frac{1}{1 + e^{-x}}',
    range: '(0, 1)',
    didacticExplanation: 'Comprime valores para uma probabilidade estrita entre 0 e 1.',
    bestFor: 'Portas de ativação (gates de GRU/LSTM) e probabilidades.',
    risk: 'Não é centrada em zero; satura facilmente nas extremidades.'
  },
  siren: {
    name: 'SIREN (Sinusoidal Representation Network)',
    formula: 'f(x) = \\sin(\\omega_0 \\cdot x), \\quad \\omega_0 = 1.0',
    range: '[-1, 1]',
    didacticExplanation: 'Função de ativação sinusoidal contínua. As suas derivadas também são senóides, tornando-a teoricamente ideal para modelar oscilações mecânicas periódicas e campos harmónicos.',
    bestFor: 'Sistemas oscilatórios físicos, pêndulos, vibrações e coordenadas angulares periódicas.',
    risk: 'Múltiplos mínimos locais; sensível à escala de inicialização de pesos.'
  },
  linear: {
    name: 'Linear (Identidade)',
    formula: 'f(x) = x',
    range: '(-\\infty, +\\infty)',
    didacticExplanation: 'Sem transformação não-linear. Útil para entender que redes puramente lineares não conseguem resolver o swing-up não-linear.',
    bestFor: 'Demonstração didática da barreira linear e camadas de regressão sem limites.',
    risk: 'Incapaz de resolver problemas dinâmicos não-lineares por si só.'
  }
};

/**
 * In-place vector activation application on Float32Array.
 */
export function applyActivationInPlace(data: Float32Array, length: number, type: ActivationType): void {
  switch (type) {
    case 'relu':
      for (let i = 0; i < length; i++) {
        const v = data[i];
        data[i] = v > 0 ? v : 0;
      }
      break;

    case 'leaky_relu':
      for (let i = 0; i < length; i++) {
        const v = data[i];
        data[i] = v > 0 ? v : 0.01 * v;
      }
      break;

    case 'gelu': {
      const sqrt2OverPi = 0.7978845608;
      for (let i = 0; i < length; i++) {
        const x = data[i];
        data[i] = 0.5 * x * (1.0 + Math.tanh(sqrt2OverPi * (x + 0.044715 * x * x * x)));
      }
      break;
    }

    case 'elu':
      for (let i = 0; i < length; i++) {
        const x = data[i];
        data[i] = x > 0 ? x : Math.exp(x) - 1.0;
      }
      break;

    case 'tanh':
      for (let i = 0; i < length; i++) {
        data[i] = Math.tanh(data[i]);
      }
      break;

    case 'sigmoid':
      for (let i = 0; i < length; i++) {
        data[i] = 1.0 / (1.0 + Math.exp(-data[i]));
      }
      break;

    case 'siren':
      for (let i = 0; i < length; i++) {
        data[i] = Math.sin(data[i]);
      }
      break;

    case 'linear':
    default:
      // Identity - no transformation
      break;
  }
}
