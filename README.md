# 🏎️ Furuta AI Mechanical Lab
### *Simulador Físico Mecatrónico Industrial & Laboratório Didático de Neuroevolução*

[![CI/CD GitHub Pages](https://github.com/valbom13/furuta-ai-lab/actions/workflows/deploy.yml/badge.svg)](https://github.com/valbom13/furuta-ai-lab)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Vitest-33%2F33%20Passed-success.svg)](https://vitest.dev/)

> **Live Demo Online**: [https://valbom13.github.io/furuta-ai-lab/](https://valbom13.github.io/furuta-ai-lab/)  
> **Código Fonte**: [https://github.com/valbom13/furuta-ai-lab](https://github.com/valbom13/furuta-ai-lab)

Um simulador científico e mecatrónico de alto rendimento executado a **100% no navegador (Client-Side)**. O projeto combina integração numérica de mecânica não-linear com treino evolutivo de redes neuronais em tempo real, atingindo mais de **70.000 passos físicos + inferência neural acoplados por segundo** via Web Workers.

---

## 🎯 Destaques de Engenharia

### 1. Física Industrial de Grau Laboratorial (`RK4 @ 200 Hz`)
* **Modelo Não-Linear de Euler-Lagrange**: Dinâmica analítica completa do **Pêndulo Rotativo de Furuta (Quanser)** com termos de acoplamento inercial $M(q)$, forças de Coriolis e centrífugas $C(q, \dot{q})$, e vetor de gravidade $G(q)$.
* **Arquitetura Modular Polimórfica**: Suporte intercambiável em tempo real para 3 sistemas físicos:
  1. *Pêndulo Rotativo de Furuta* (Rotação contínua de 360°)
  2. *Carrinho Linear (Cart-Pole Industrial)*
  3. *Ponte Rolante (Gantry Crane Anti-Swing)*
* **Atuador Eletromecânico Real**: Motor DC modelado com resistência de armadura, constante de contra-eletromotriz (*Back-EMF* $K_b$), saturação de torque e travagem regenerativa.
* **Atrito Industrial**: Modelo misto com atrito viscoso nos rolamentos e atrito de Coulomb (seco) suavizado por $\tanh$.
* **Conservação de Energia Validada**: Deriva de energia mecânica total ($E = T + V$) inferior a $0.1\%$ ao longo de 10.000 passos no integrador Runge-Kutta 4ª ordem.

### 2. Laboratório de Redes Neuronais Vetorizado (`Zero-GC TypedArrays`)
* **Tensores Otimizados**: Operações matriciais com `Float32Array` contínuo sem alocações no loop de simulação.
* **Topologias Suportadas**:
  - *MLP Clássico* (Feedforward)
  - *Gargalo / Compressão* (Bottleneck $N \to 16 \to 4 \to 8 \to 1$)
  - *Diamante / Expansão* (Diamond $N \to 8 \to 32 \to 8 \to 1$)
  - *ResNet* (Skip-Connections residuais)
  - *Células Recorrentes GRU* (Gated Recurrent Unit com memória temporal para latência)
  - *Linear Puro* (Para estudo de aproximações locais LQR)
* **Biblioteca de Ativações**: ReLU, LeakyReLU, GeLU, ELU, Tanh, Sigmoid, Linear e **Sine (SIREN)** para dinâmicas harmónicas periódicas.
* **Pipeline de Sensores Industriais**: Codificação trigonométrica ($\sin\alpha, \cos\alpha$), buffer de atraso temporal (10–50 ms), ruído estocástico gaussiano e quantização de encoders óticos (8 a 12 bits).

### 3. Suite Completa de Neuroevolução
* **GA Clássico de Pesos**: Seleção (Torneio, Roleta, Ranking Linear, Truncamento), Crossover (BLX-$\alpha$, Aritmético, Ponto Único, Uniforme) e Mutações (Cauchy para fuga de mínimos locais, Gaussiana adaptativa, Polinomial de Deb).
* **OpenAI-ES**: Otimização contínua por distribuição gaussiana multivariada e estimativa de pseudo-gradiente.
* **NEAT**: Complexificação estrutural incremental com adição dinâmica de neurónios e sinapses.
* **Modelo de Ilhas & MAP-Elites**: Subpopulações paralelas com migração em anel e grelhas de diversidade comportamental 2D.

### 4. Visualização 3D de Alto Desempenho (Three.js)
* **Enxame Fantasma (Ghost Swarm)**: 100+ pêndulos renderizados simultaneamente através de uma única chamada de desenho à GPU (`THREE.InstancedMesh`).
* **Interação Física Manual**: Raycasting 3D permitindo clicar e empurrar o pêndulo com o rato para testar estabilidade ativa e resiliência a choques.
* **Diagrama Sináptico Pulsante**: Renderização Canvas 2D em tempo real com fluxo elétrico de ativação e magnitude de pesos.

---

## 🧪 Bateria de Testes Automatizados

O projeto inclui uma suite rigorosa de testes unitários com **Vitest**:

```bash
npm test
```

- ✅ `test/physics.test.ts`: Conservação de energia mecânica, dinâmicas de motor DC e inércia por material.
- ✅ `test/neural.test.ts`: Operações vetoriais de tensores, forward passes e células GRU.
- ✅ `test/evolution.test.ts`: Integridade matemática de seleção, crossovers, mutações e NEAT.
- ✅ `test/benchmark.test.ts`: Rendimento numérico comprovado superior a 70.000 passos/segundo.
- ✅ `test/inspector_and_time.test.ts`: Controlo temporal de gerações e integridade dos 38 tópicos didáticos.
- ✅ `test/algo_compatibility.test.ts`: Estabilidade e consistência entre todas as estratégias de treino.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)

### Inicialização Rápida (Windows)
Basta dar **duplo clique no ficheiro**:
```bat
iniciar.bat
```

### Inicialização por Terminal
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Compilar para produção
npm run build
```

---

## 📦 Estrutura do Código

```
rede-neural/
├── .github/workflows/deploy.yml # Pipeline de CI/CD para GitHub Pages
├── src/
│   ├── core/
│   │   ├── physics/             # Euler-Lagrange, Integrador RK4, Furuta, Cart-Pole, Motor DC
│   │   ├── neural/              # Tensores Float32Array, Camadas (Dense, GRU, Skip), Ativações
│   │   ├── evolution/           # Algoritmos Genéticos, OpenAI-ES, NEAT, Ilhas, MAP-Elites
│   │   └── workers/             # Web Workers para processamento paralelo multi-core
│   ├── rendering/               # Three.js InstancedMesh, iluminação e raycasting com rato
│   ├── ui/                      # Dashboard reativo, diagrama sináptico, HUD e missões
│   └── main.ts                  # Ponto de entrada da aplicação
├── test/                        # 33 testes unitários e benchmarks
├── index.html                   # Interface do laboratório
├── iniciar.bat                  # Inicializador para Windows
└── vite.config.ts               # Configuração do Vite com base relativa
```
