# Especificação de Design: Laboratório Didático de Redes Neuronais e Física Industrial (Pêndulo de Furuta)

## 1. Resumo de Alinhamento (Understanding Summary)
* **Objetivo**: Criar um simulador científico e didático de alto desempenho no navegador para aprendizagem intuitiva e profunda de Inteligência Artificial mecânica (Redes Neuronais + Algoritmos Genéticos/Evolutivos) com física realista de grau industrial.
* **Desafio Físico Central**: Pêndulo Rotativo de Furuta (estilo bancada Quanser de mecatrónica), com arquitetura modular preparada para suportar Cart-Pole linear e Ponte Rolante industrial.
* **Prioridades Máximas**: Realismo físico absoluto e taxa máxima de processamento numérico têm rigorosamente a mesma prioridade máxima.
* **Público-Alvo**: Estudantes, engenheiros, entusiastas e curiosos que desejem aprender do zero, de forma intuitiva e visual, o que cada técnica de redes e evolução causa na prática.
* **Não-Objetivos**: Não é um jogo arcade simplificado; não recorre a bibliotecas "caixa-preta" de ML; não depende de servidores externos ou GPUs na nuvem.

---

## 2. Pressupostos e Requisitos Não-Funcionais
* **Plataforma**: 100% Client-Side Web (TypeScript, Three.js com `THREE.InstancedMesh`, Web Workers paralelos, Vite).
* **Desempenho**:
  - Renderização 3D estável a 60 FPS na thread principal.
  - Simulação física em Web Workers a 200 Hz fixos com integrador Runge-Kutta de 4ª ordem (RK4).
  - Tensores e arrays de física com zero alocação de lixo no loop de treino (`Float64Array` e `Float32Array` pré-alocados).
  - Transferência de dados por `Transferable ArrayBuffers` sem overhead de clonagem JSON.
* **Segurança e Persistência**: Execução estritamente local; importação e exportação de genomas e redes em ficheiros JSON.
* **Robustez**: Deteção de instabilidade numérica ($NaN$/Infinity) com reinicialização controlada e penalização de fitness.

---

## 3. Registo de Decisões (Decision Log)

| Decisão | Escolha Final | Alternativas Avaliadas | Racional / Justificação |
| :--- | :--- | :--- | :--- |
| **Desafio Físico** | Pêndulo de Furuta Modular | F1 com pneus Pacejka, Foguetão SpaceX, Robô Bípede | Padrão ouro em laboratórios de controlo, sem fim de curso linear, dinâmica não linear rica de Coriolis e forças centrífugas. |
| **Plataforma** | Web (TypeScript + Three.js) | Python Desktop, Godot 4 | Zero atrito de instalação, máxima acessibilidade e UI reativa moderna. |
| **Arquitetura de Processamento** | Multi-Thread Worker Pool + InstancedMesh | Wasm/Rust, Mono-thread Canvas | Garante 60 FPS contínuos na UI enquanto o CPU corre a física no máximo em paralelo sem complexidade externa de build toolchains. |
| **Modo de Visualização** | Enxame Fantasma (Ghost Swarm) + Modo Foco | Apenas Campeão, Matriz Multi-Viewport | Permite ver a seleção natural de 100+ indivíduos ao mesmo tempo e testar manualmente perturbações com o rato. |
| **Suite de Evolução** | Abrangente (GA Clássico, ES, NEAT, Ilhas, MAP-Elites) | GA básico de pesos | Máxima profundidade didática para comparar estratégias e evitar mínimos locais. |
| **Aba de Redes Neurais** | Construtor Modular + Presets + Diagrama Pulsante | Configuração em JSON estático | Permite experimentar topologias (Dense, Skip, GRU), ativações (ReLU, Sine/SIREN) e ver sinapses a pulsar ao vivo. |
| **Metodologia de Aprendizagem** | Sandbox Livre + Missões Guiadas + Inspetor Teórico | Apenas Sandbox, Apenas Glossário | Permite a quem parte do zero entender o impacto de cada hiperparâmetro através de desafios práticos. |

---

## 4. Arquitetura do Sistema e Componentes

### 4.1. Camada de Física Mecânica (`src/core/physics/`)
* **Modelo Dinâmico**: Equações de Euler-Lagrange para 2 graus de liberdade ($\theta$: ângulo do braço horizontal, $\alpha$: ângulo do pêndulo).
* **Matrizes Dinâmicas**:
  - Matriz de Inércia $M(q)$
  - Matriz de Coriolis e Forças Centrífugas $C(q, \dot{q})$
  - Vetor Gravítico $G(q)$
  - Vetor de Forças Generalizadas $\tau$ (torque do motor DC com Back-EMF e saturação)
* **Atrito**: Atrito viscoso nos rolamentos ($b_1, b_2$) e atrito estático/Coulomb.
* **Integrador**: Runge-Kutta 4ª ordem (RK4) com $\Delta t = 0.005\text{s}$ (200 Hz).
* **Acoplamento Visual $\to$ Físico**: Parâmetros geométricos e materiais (alumínio, latão, aço, comprimento, raio) recalculam instantaneamente $m$, $J$, e centro de massa.

### 4.2. Camada Neural (`src/core/neural/`)
* **Representação de Tensores**: `Float32Array` contínuo com operações matriciais vetorizadas.
* **Topologias Suportadas**:
  - Feedforward clássico / Perceptron multicamada.
  - Arquiteturas Diamante / Gargalo (Bottleneck).
  - ResNet / Conexões Skip residuais.
  - Células Recorrentes / GRU com vetores de estado oculto (memória temporal).
* **Biblioteca de Ativações**:
  - ReLU, LeakyReLU, GeLU, ELU, Tanh, Sigmoid, Linear.
  - **Sine / SIREN**: Otimizada para física periódica e oscilações trigonométricas.
* **Pipeline de Sensores (I/O)**:
  - Codificação trigonométrica opcional ($\sin\alpha, \cos\alpha$).
  - Velocidades angulares estimadas ou puras.
  - Injeção de ruído gaussiano e quantização de encoders óticos (ex.: 1024 pulsos/volta).
  - Buffer de latência temporal (simulando atrasos mecânicos de 10 a 50 ms).

### 4.3. Motor de Evolução (`src/core/evolution/`)
* **GA Clássico**:
  - Seleção: Torneio com pressão ajustável, Roleta, Ranking Linear, Elitismo.
  - Crossover: Aritmético, BLX-$\alpha$ (Blend), Ponto Único, Uniforme.
  - Mutação: Gaussiana adaptativa, Cauchy (distribuição de cauda pesada), Polinomial.
* **Estratégias Evolutivas**:
  - OpenAI-ES / CMA-ES simplificado para otimização contínua de parâmetros.
* **NEAT**:
  - Mutações estruturais de adição de nós e sinapses com números de inovação histórica.
* **Modelo de Ilhas**:
  - Subpopulações com topologias de migração em anel.
* **MAP-Elites**:
  - Grelha comportamental bidimensional para manutenção de nichos de alta diversidade.
* **Construtor de Fitness**:
  - Recompensa angular vertical ($\cos\alpha$), penalização de voltagem/energia ($\int V^2 dt$), penalização de trepidação (*jerk*), centralização do braço horizontal.

### 4.4. Interface e Visualização 3D (`src/rendering/` e `src/ui/`)
* **Visualizador 3D**: Three.js renderizando a bancada experimental com sombras suaves, iluminação de estúdio e câmara orbital interativa.
* **Enxame Fantasma**: `THREE.InstancedMesh` desenhando 100+ pêndulos sem quedas de framerate, aplicando gradiente de opacidade e realçando a cores o melhor indivíduo.
* **Interatividade**: Raycasting com o rato para aplicar impulsos de força dinâmicos na haste e testar a estabilidade da rede em tempo real.
* **Diagrama Sináptico Pulsante**: Renderizador Canvas 2D mostrando o fluxo de corrente e intensidade dos neurónios em tempo real.
* **Inspetor Teórico Contextual**: Sistema de tooltips informativos com intuição prática, fórmulas matemáticas e implicações físicas de cada botão e slider.
* **Sistema de Missões Guiadas**: Trilha pedagógica com desafios progressivos (da barreira linear à resiliência sob vento).

---

## 5. Estratégia de Testes e Validação
1. **Conservação de Energia em Sistema Conservativo**: Testar o integrador RK4 com atrito e voltagem a zero; a energia mecânica $E = T + V$ deve manter-se constante ao longo de 10.000 iterações.
2. **Benchmark Numérico de Web Workers**: Garantir execução mínima de 20.000 passos de física/segundo em modo Turbo.
3. **Validação Numérica de Ativações e Tensores**: Testes unitários para garantir precisão das funções matriciais e derivadas.
