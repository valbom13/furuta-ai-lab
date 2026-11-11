/**
 * Neuroevolution of Augmenting Topologies (NEAT)
 * Dynamic network topology mutation, historical innovation tracking,
 * and feedforward evaluation.
 */

export type NeatNodeType = 'input' | 'hidden' | 'output';

export interface NeatNodeGene {
  id: number;
  type: NeatNodeType;
}

export interface NeatConnectionGene {
  inNode: number;
  outNode: number;
  weight: number;
  enabled: boolean;
  innovation: number;
}

export interface NeatGenome {
  id: number;
  nodes: NeatNodeGene[];
  connections: NeatConnectionGene[];
  fitness: number;
}

export class NeatInnovationTracker {
  private currentInnovation = 0;
  private connectionInnovations = new Map<string, number>();

  public getInnovation(inNode: number, outNode: number): number {
    const key = `${inNode}->${outNode}`;
    if (this.connectionInnovations.has(key)) {
      return this.connectionInnovations.get(key)!;
    }
    this.currentInnovation++;
    this.connectionInnovations.set(key, this.currentInnovation);
    return this.currentInnovation;
  }
}

export class NeatEngine {
  private tracker: NeatInnovationTracker;
  private nextNodeId = 0;
  private inDim: number;
  private outDim: number;

  constructor(inDim = 6, outDim = 1) {
    this.tracker = new NeatInnovationTracker();
    this.inDim = inDim;
    this.outDim = outDim;
  }

  /**
   * Creates a minimal starting genome: all inputs connected directly to outputs.
   */
  public createMinimalGenome(id: number): NeatGenome {
    const nodes: NeatNodeGene[] = [];
    let nId = 0;

    for (let i = 0; i < this.inDim; i++) {
      nodes.push({ id: nId++, type: 'input' });
    }
    for (let i = 0; i < this.outDim; i++) {
      nodes.push({ id: nId++, type: 'output' });
    }
    this.nextNodeId = Math.max(this.nextNodeId, nId);

    const connections: NeatConnectionGene[] = [];
    for (let i = 0; i < this.inDim; i++) {
      for (let o = 0; o < this.outDim; o++) {
        const outNodeId = this.inDim + o;
        connections.push({
          inNode: i,
          outNode: outNodeId,
          weight: (Math.random() * 2 - 1) * 0.5,
          enabled: true,
          innovation: this.tracker.getInnovation(i, outNodeId)
        });
      }
    }

    return { id, nodes, connections, fitness: 0 };
  }

  /**
   * Mutates genome: weight mutation, add connection, or add node.
   */
  public mutate(genome: NeatGenome): void {
    const pWeight = 0.8;
    const pAddConn = 0.1;
    const pAddNode = 0.10;

    // 1. Mutate weights
    if (Math.random() < pWeight) {
      for (const conn of genome.connections) {
        if (Math.random() < 0.2) {
          if (Math.random() < 0.9) {
            conn.weight += (Math.random() * 2 - 1) * 0.2; // small tweak
          } else {
            conn.weight = (Math.random() * 2 - 1) * 1.0; // new value
          }
        }
      }
    }

    // 2. Add connection
    if (Math.random() < pAddConn) {
      this.mutateAddConnection(genome);
    }

    // 3. Add node
    if (Math.random() < pAddNode) {
      this.mutateAddNode(genome);
    }
  }

  private mutateAddConnection(genome: NeatGenome): void {
    const nodeA = genome.nodes[Math.floor(Math.random() * genome.nodes.length)];
    const nodeB = genome.nodes[Math.floor(Math.random() * genome.nodes.length)];

    // Cannot connect output to input or node to itself
    if (nodeA.id === nodeB.id || nodeA.type === 'output' || nodeB.type === 'input') return;

    // Check if connection already exists
    const exists = genome.connections.some(c => c.inNode === nodeA.id && c.outNode === nodeB.id);
    if (!exists) {
      genome.connections.push({
        inNode: nodeA.id,
        outNode: nodeB.id,
        weight: (Math.random() * 2 - 1) * 0.5,
        enabled: true,
        innovation: this.tracker.getInnovation(nodeA.id, nodeB.id)
      });
    }
  }

  private mutateAddNode(genome: NeatGenome): void {
    const activeConns = genome.connections.filter(c => c.enabled);
    if (activeConns.length === 0) return;

    const targetConn = activeConns[Math.floor(Math.random() * activeConns.length)];
    targetConn.enabled = false;

    const newNodeId = this.nextNodeId++;
    genome.nodes.push({ id: newNodeId, type: 'hidden' });

    // inNode -> newNode (weight 1.0)
    genome.connections.push({
      inNode: targetConn.inNode,
      outNode: newNodeId,
      weight: 1.0,
      enabled: true,
      innovation: this.tracker.getInnovation(targetConn.inNode, newNodeId)
    });

    // newNode -> outNode (weight = targetConn.weight)
    genome.connections.push({
      inNode: newNodeId,
      outNode: targetConn.outNode,
      weight: targetConn.weight,
      enabled: true,
      innovation: this.tracker.getInnovation(newNodeId, targetConn.outNode)
    });
  }

  /**
   * Evaluates the graph network on an input vector.
   */
  public evaluate(genome: NeatGenome, input: Float32Array): Float32Array {
    const values = new Map<number, number>();

    // Load inputs
    for (let i = 0; i < this.inDim; i++) {
      values.set(i, input[i]);
    }

    // Topological/iterative forward pass (2 passes for feedforward acyclic or recurrent)
    for (let iter = 0; iter < 2; iter++) {
      for (const conn of genome.connections) {
        if (!conn.enabled) continue;
        const inVal = values.get(conn.inNode) ?? 0;
        const currentOutVal = values.get(conn.outNode) ?? 0;
        values.set(conn.outNode, currentOutVal + inVal * conn.weight);
      }
      // Apply tanh activation to hidden and output nodes
      for (const node of genome.nodes) {
        if (node.type !== 'input') {
          const val = values.get(node.id) ?? 0;
          values.set(node.id, Math.tanh(val));
        }
      }
    }

    const output = new Float32Array(this.outDim);
    for (let o = 0; o < this.outDim; o++) {
      output[o] = values.get(this.inDim + o) ?? 0;
    }
    return output;
  }

  public cloneGenome(g: NeatGenome, newId: number): NeatGenome {
    return {
      id: newId,
      nodes: g.nodes.map(n => ({ ...n })),
      connections: g.connections.map(c => ({ ...c })),
      fitness: g.fitness
    };
  }

  public stepPopulation(
    population: NeatGenome[],
    popSize: number,
    eliteCount: number
  ): NeatGenome[] {
    population.sort((a, b) => b.fitness - a.fitness);
    const nextGen: NeatGenome[] = [];

    // 1. Elitism: preserve top elites
    const nElites = Math.min(popSize, Math.max(1, eliteCount));
    for (let i = 0; i < nElites; i++) {
      nextGen.push(this.cloneGenome(population[i], i));
    }

    // 2. Tournament selection & mutation for remaining offspring
    for (let i = nElites; i < popSize; i++) {
      const k = Math.min(3, population.length);
      let best = population[Math.floor(Math.random() * population.length)];
      for (let t = 1; t < k; t++) {
        const candidate = population[Math.floor(Math.random() * population.length)];
        if (candidate.fitness > best.fitness) {
          best = candidate;
        }
      }

      const child = this.cloneGenome(best, i);
      this.mutate(child);
      child.fitness = 0;
      nextGen.push(child);
    }

    return nextGen;
  }

  public encodeWeights(genome: NeatGenome): Float32Array {
    const weights = new Float32Array(Math.max(1, genome.connections.length));
    for (let i = 0; i < genome.connections.length; i++) {
      weights[i] = genome.connections[i].weight;
    }
    return weights;
  }
}

