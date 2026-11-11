/**
 * Engineering Materials Database and Inertia Calculations
 */

import { MaterialProperties } from './types.ts';

export const MATERIALS: Record<string, MaterialProperties> = {
  aluminum: {
    name: 'Alumínio 6061-T6',
    density: 2700, // kg/m^3
    color: '#d4d8dd',
    roughness: 0.35,
    metalness: 0.9,
    description: 'Leve, resistente, baixa inércia rotacional. Resposta ultrarrápida a torques.'
  },
  brass: {
    name: 'Latão Naval',
    density: 8500, // kg/m^3
    color: '#d4af37',
    roughness: 0.3,
    metalness: 0.85,
    description: 'Elevada densidade, momento de inércia superior. Requer torques mais elevados para estabilização.'
  },
  steel: {
    name: 'Aço Inoxidável 304',
    density: 7850, // kg/m^3
    color: '#b0b3b8',
    roughness: 0.25,
    metalness: 0.95,
    description: 'Material industrial padrão, rigidez mecânica máxima e amortecimento moderado.'
  },
  carbon_fiber: {
    name: 'Fibra de Carbono',
    density: 1600, // kg/m^3
    color: '#222225',
    roughness: 0.5,
    metalness: 0.2,
    description: 'Rigidez altíssima com densidade ultraleve, ideal para controlo reativo de alta frequência.'
  },
  wood: {
    name: 'Madeira (Faia)',
    density: 720, // kg/m^3
    color: '#c29a64',
    roughness: 0.8,
    metalness: 0.05,
    description: 'Material didático leve para demonstrar impacto de baixa inércia e alta resistência aerodinâmica relativa.'
  }
};

/**
 * Calculates mass of a solid cylinder: m = pi * r^2 * L * density
 */
export function calculateCylinderMass(radius: number, length: number, density: number): number {
  const volume = Math.PI * radius * radius * length;
  return volume * density;
}

/**
 * Calculates moment of inertia of a slender cylinder rotating about one end (pivot):
 * J_pivot = (1/3) * m * L^2 + (1/4) * m * r^2
 */
export function calculateRodPivotInertia(mass: number, length: number, radius: number): number {
  return (1 / 3) * mass * length * length + (1 / 4) * mass * radius * radius;
}

/**
 * Calculates moment of inertia of a slender cylinder rotating about its center of mass:
 * J_com = (1/12) * m * L^2 + (1/4) * m * r^2
 */
export function calculateRodComInertia(mass: number, length: number, radius: number): number {
  return (1 / 12) * mass * length * length + (1 / 4) * mass * radius * radius;
}
