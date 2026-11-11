/**
 * Genetic Selection Operators
 * Tournament, Roulette Wheel, Linear Rank, and Truncation.
 */

import { Individual, SelectionMethod } from './types.ts';

export class SelectionOperators {
  /**
   * Selects an individual from the population using the configured selection method.
   */
  public static select(
    population: Individual[],
    method: SelectionMethod,
    tournamentSize = 3
  ): Individual {
    switch (method) {
      case 'tournament':
        return this.tournament(population, tournamentSize);
      case 'roulette':
        return this.roulette(population);
      case 'rank':
        return this.rankSelection(population);
      case 'truncation':
      default:
        return this.truncation(population, 0.2);
    }
  }

  /**
   * Tournament Selection: Picks K random individuals and chooses the fittest.
   */
  public static tournament(population: Individual[], k: number): Individual {
    const popSize = population.length;
    let best = population[Math.floor(Math.random() * popSize)];
    for (let i = 1; i < k; i++) {
      const candidate = population[Math.floor(Math.random() * popSize)];
      if (candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    return best;
  }

  /**
   * Roulette Wheel Selection (Fitness Proportionate with shift for negative values).
   */
  public static roulette(population: Individual[]): Individual {
    let minFitness = Infinity;
    for (const ind of population) {
      if (ind.fitness < minFitness) minFitness = ind.fitness;
    }
    const offset = minFitness < 0 ? Math.abs(minFitness) + 1.0 : 0.0;

    let totalSum = 0;
    for (const ind of population) {
      totalSum += ind.fitness + offset;
    }

    if (totalSum <= 0) {
      return population[Math.floor(Math.random() * population.length)];
    }

    const pick = Math.random() * totalSum;
    let running = 0;
    for (const ind of population) {
      running += ind.fitness + offset;
      if (running >= pick) {
        return ind;
      }
    }
    return population[population.length - 1];
  }

  /**
   * Linear Rank Selection: Probability is proportional to ranking rather than raw fitness.
   * Prevents premature convergence when a super-fit individual dominates early.
   * Population is sorted descending by fitness (index 0 = best, index n - 1 = worst).
   */
  public static rankSelection(population: Individual[]): Individual {
    const n = population.length;
    if (n === 0) throw new Error('Cannot select from empty population');
    if (n === 1) return population[0];

    // Ensure sorted descending by fitness (index 0 = best, index n - 1 = worst)
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
    const totalRank = (n * (n + 1)) / 2;
    const pick = Math.random() * totalRank;

    let running = 0;
    for (let i = 0; i < n; i++) {
      running += (n - i); // n for best (index 0), 1 for worst (index n - 1)
      if (running >= pick) {
        return sorted[i];
      }
    }
    return sorted[0];
  }


  /**
   * Truncation Selection: Picks uniformly from the top fraction (e.g. top 20%).
   */
  public static truncation(sortedPopulation: Individual[], topFraction = 0.2): Individual {
    const cutoff = Math.max(1, Math.floor(sortedPopulation.length * topFraction));
    // sortedPopulation should have best at the end or beginning
    // Here we assume sorted descending (best at index 0)
    const pickIdx = Math.floor(Math.random() * cutoff);
    return sortedPopulation[pickIdx];
  }
}
