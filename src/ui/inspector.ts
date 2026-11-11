/**
 * Contextual Theoretical Inspector
 * Provides comprehensive didactic explanations, formulas, intuitive physical analogies,
 * concrete number/option examples, general theoretical expectations, and exact
 * simulation-specific impacts for ALL parameters in the laboratory.
 */

export interface InspectorTopic {
  title: string;
  category: 'Física & Mecânica' | 'Redes Neuronais' | 'Algoritmos Genéticos' | 'Sensores & Atuadores' | 'Sistema & Simulação';
  concept: string;             // Conceito simples em texto claro
  formula?: string;            // Fórmula matemática / intuição
  examples: string;           // Exemplos de números ou opções a colocar (ex: "Se colocares 0.05...", "Se colocares 0.3...")
  generalExpectation: string; // O que esperar no geral (intuição teórica geral)
  simulationSpecific: string; // O que esperar nesta simulação em específico (Furuta, swing-up, motor, estabilidade)
  proTip?: string;            // Dica de especialista
  // Compatibilidade retroativa com código existente
  intuition?: string;
  highValueImpact?: string;
  lowValueImpact?: string;
}

export const TOPICS: Record<string, InspectorTopic> = {
  // ==========================================
  // 1. SISTEMA & CONTROLOS GLOBAIS
  // ==========================================
  system_selector: {
    title: 'Topologia do Sistema Mecânico',
    category: 'Sistema & Simulação',
    formula: '\\mathbf{M}(\\mathbf{q})\\ddot{\\mathbf{q}} + \\mathbf{C}(\\mathbf{q},\\dot{\\mathbf{q}})\\dot{\\mathbf{q}} + \\mathbf{G}(\\mathbf{q}) = \\mathbf{B}\\mathbf{u}',
    concept: 'Permite alternar a dinâmica mecânica subjacente simulada no laboratório entre três sistemas clássicos da robótica e engenharia de controlo.',
    examples: '• <strong>Furuta (Pêndulo Rotativo):</strong> sistema subatuado não-linear tridimensional acoplado por inércias rotativas.<br>• <strong>Cart-Pole (Pêndulo Linear):</strong> carro com calha horizontal unidimensional clássico de Sutton & Barto.<br>• <strong>Crane (Ponte Rolante):</strong> carga suspensa por cabo onde o objetivo é amortecer o balanço durante transporte.',
    generalExpectation: 'No geral, serve para testar a robustez e capacidade de generalização de um mesmo algoritmo ou rede quando confrontado com matrizes de inércia e graus de liberdade distintos.',
    simulationSpecific: 'No Furuta, a força centrífuga do braço ajuda ou prejudica o swing-up dependendo da rotação. No Cart-Pole, a colisão com os limites da calha pode limitar o movimento. Na Ponte Rolante, o sistema visa suprimir o movimento pendular em vez de mantê-lo invertido.',
    proTip: 'Treina primeiro um controlador no Cart-Pole (mais intuitivo) e depois testa o mesmo algoritmo no Furuta para sentir o desafio do acoplamento não-linear rotativo.'
  },

  sim_speed: {
    title: 'Velocidade de Execução da Simulação',
    category: 'Sistema & Simulação',
    formula: 'N_{\\text{substeps}} = \\min\\left(20, \\left\\lceil \\frac{\\Delta t_{\\text{frame}}}{1000} \\times 200 \\times \\text{Velocidade} \\right\\rceil\\right)',
    concept: 'Multiplicador de aceleração do tempo da simulação visual em relação ao relógio de parede real.',
    examples: '• <strong>0.5x:</strong> câmara lenta; excelente para ver as micro-oscilações no topo ou a inversão da voltagem.<br>• <strong>1.0x (Padrão):</strong> tempo real rigorosamente calibrado a 200 Hz.<br>• <strong>3.0x a 5.0x:</strong> avanço rápido para ver as gerações a passarem depressa sem perder a animação 3D.',
    generalExpectation: 'No geral, acelera ou desacelera a apresentação sem alterar o passo infinitesimal de integração RK4 (dt = 0.005s), mantendo fidelidade física absoluta.',
    simulationSpecific: 'Em velocidades muito altas (>4x), o navegador pode ter ligeira perda de fluidez se a GPU estiver sobrecarregada com os 100 pêndulos do enxame.',
    proTip: 'Se quiseres máxima velocidade sem renderização, ativa antes o modo ⚡ Turbo.'
  },

  turbo_mode: {
    title: 'Modo Turbo (Web Workers Paralelos)',
    category: 'Sistema & Simulação',
    formula: '\\text{Throughput} \\approx N_{\\text{cores CPU}} \\times 75\\,000\\text{ passos/s}',
    concept: 'Desativa o estrangulamento da renderização visual no ecrã e descarrega todo o cálculo físico e de redes neuronais para múltiplos Web Workers a correr em paralelo nas threads do teu CPU.',
    examples: '• <strong>Desligado:</strong> simulação visual a 60 FPS com Three.js.<br>• <strong>Ligado:</strong> processa gerações completas a velocidades vertiginosas de dezenas de milhares de passos por segundo.',
    generalExpectation: 'No geral, permite treinar populações genéticas massivas em poucos segundos ou minutos em vez de esperar dezenas de minutos.',
    simulationSpecific: 'Permite que uma geração inteira de 100 indivíduos com 6 segundos de simulação (1200 passos cada = 120.000 passos físicos) seja avaliada em menos de 1 segundo.',
    proTip: 'Deixa o Turbo ativo durante 15 a 30 gerações para aprender o swing-up, e desativa-o para ver o pêndulo campeão a exibir a manobra em 3D.'
  },

  swarm_mode: {
    title: 'Visualização de Enxame (Swarm)',
    category: 'Sistema & Simulação',
    formula: '\\text{Instâncias Three.js} = N_{\\text{população}} \\le 300',
    concept: 'Alterna entre renderizar apenas o melhor pêndulo (Campeão) ou renderizar toda a população em simultâneo através de instancing acelerado na GPU.',
    examples: '• <strong>Enxame (100+):</strong> vê uma nuvem semitransparente de pêndulos explorando trajetórias diferentes ao mesmo tempo.<br>• <strong>Foco Campeão:</strong> foca unicamente no melhor indivíduo da geração.',
    generalExpectation: 'No geral, o enxame fornece intuição visual imediata sobre a dispersão e diversidade genética da população.',
    simulationSpecific: 'Nas primeiras gerações, o enxame assemelha-se a uma "explosão caótica" de hastes a rodar. Conforme o algoritmo converge, todos os pêndulos passam a mexer-se em harmonia coesa em direção ao topo vertical.',
    proTip: 'Excelente para apresentações didáticas para mostrar a seleção natural em ação visual instantânea.'
  },

  // ==========================================
  // 2. REDES NEURONAIS & SENSORES
  // ==========================================
  network_preset: {
    title: 'Arquitetura Pré-Definida da Rede',
    category: 'Redes Neuronais',
    formula: '\\mathbf{u}(t) = \\pi_\\theta(\\mathbf{s}(t))',
    concept: 'Define o arranjo dos neurónios, camadas e conexões que formam o "cérebro" do controlador que decide o torque do motor.',
    examples: '• <strong>MLP Clássico (Tanh):</strong> 1 ou 2 camadas densas; excelente ponto de partida, estável e previsível.<br>• <strong>Gargalo (Bottleneck / Compressão):</strong> inicia mais largo, comprime no centro para poucas dimensões e volta a expandir para a saída (ex.: N_{in} &rarr; 16 &rarr; 4 &rarr; 8 &rarr; 1), forçando representações latentes compactas e filtrando ruído espúrio.<br>• <strong>Diamante (Diamond / Expansão):</strong> inicia mais estreito, expande significativamente no centro para muitos neurónios e afunila de novo para a saída (ex.: N_{in} &rarr; 8 &rarr; 32 &rarr; 8 &rarr; 1), aumentando enormemente a dimensionalidade latente para separação de trajetórias complexas.<br>• <strong>ResNet (Skip-Connections):</strong> ligações residuais directas que estabilizam redes mais profundas.<br>• <strong>GRU (Memória Recorrente):</strong> neurónios com portas de retenção temporal, indispensáveis se houver atraso nos sensores.<br>• <strong>SIREN (Seno):</strong> ativação periódica senoidal que aprende ressonâncias mecânicas com facilidade.<br>• <strong>Linear (Sem Não-Linearidade):</strong> sem ativações ocultas, mapeamento matricial direto análogo a controlo por realimentação linear de estado (LQR); não aprende o swing-up não-linear por si só, mas estabiliza com excelente precisão perto do topo.',
    generalExpectation: 'No geral, arquiteturas maiores têm mais capacidade expressiva mas demoram mais a ser otimizadas pela evolução genética.',
    simulationSpecific: 'Para o Furuta simples, MLP com 16 a 24 neurónios atinge o swing-up em menos de 15 gerações. Se adicionares latência de 20ms nos sensores, a GRU supera largamente a MLP.',
    proTip: 'Começa sempre com MLP. Se o sistema sofrer com sensores ruidosos ou atrasados, muda para GRU.'
  },

  sensor_angles: {
    title: 'Sensor: Ângulos Diretos (θ, α)',
    category: 'Sensores & Atuadores',
    formula: 's_\\theta = \\theta \\in [-\\pi, \\pi], \\quad s_\\alpha = \\alpha \\in [-\\pi, \\pi]',
    concept: 'Fornece diretamente os valores numéricos dos ângulos do braço horizontal (θ) e da haste pendular (α) em radianos para a rede.',
    examples: '• <strong>Ativado (checked):</strong> a rede recebe os valores de ângulo direto.<br>• <strong>Desativado:</strong> útil se quiseres obrigar a rede a usar estritamente representação sen/cos.',
    generalExpectation: 'No geral, o ângulo direto sofre de uma descontinuidade abrupta na fronteira de -π para +π (wrap-around de 360°), o que cria um degrau violento na função de transferência da rede.',
    simulationSpecific: 'Se a haste der uma volta completa, o salto súbito de +3.14 para -3.14 radianos pode fazer a rede disparar um pico máximo de voltagem indesejado no motor.',
    proTip: 'Mantém sempre ativada também a opção Sen/Cos para evitar problemas com rotações completas de 360°.'
  },

  sensor_trig: {
    title: 'Sensor: Decomposição Trigonométrica (Sen/Cos)',
    category: 'Sensores & Atuadores',
    formula: '\\mathbf{s}_{\\text{trig}} = [\\sin\\theta, \\cos\\theta, \\sin\\alpha, \\cos\\alpha] \\in [-1, 1]^4',
    concept: 'Converte os ângulos circulares num par suave e contínuo de coordenadas cartesianas no círculo trigonométrico, eliminando qualquer salto de 360°.',
    examples: '• <strong>Ativado (Recomendado):</strong> garante continuidade suave e mapeamento topológico contínuo.<br>• <strong>Desativado:</strong> força a rede a lidar com saltos angulares.',
    generalExpectation: 'No geral, funções contínuas são ordens de magnitude mais fáceis de interpolar e aproximar por redes neuronais do que dentes de serra descontínuos.',
    simulationSpecific: 'O topo invertido é exatamente cos(α) = 1 e sin(α) = 0. Isto dá à rede uma referência limpa e perfeitamente simétrica para disparar o controlo de equilíbrio no cume.',
    proTip: 'A esmagadora maioria dos artigos científicos modernos de Reinforcement Learning (ex.: OpenAI Gym, DeepMind Control Suite) usa sempre sen/cos nos pêndulos.'
  },

  sensor_vels: {
    title: 'Sensor: Velocidades Angulares (ω)',
    category: 'Sensores & Atuadores',
    formula: '\\mathbf{s}_{\\text{vel}} = [\\dot{\\theta}, \\dot{\\alpha}] \\in \\mathbb{R}^2',
    concept: 'Informa a rede da rapidez com que o braço e o pêndulo estão a rodar em radianos por segundo.',
    examples: '• <strong>Ativado (Essencial para controlo D):</strong> permite à rede antecipar o futuro e amortecer oscilações.<br>• <strong>Desativado:</strong> a rede fica "cega" à velocidade e só pode deduzi-la se tiver neurónios recorrentes GRU.',
    generalExpectation: 'No geral, sem conhecimento da velocidade, nenhum controlador consegue fornecer amortecimento derivativo e o sistema entra invariavelmente em oscilação descontrolada.',
    simulationSpecific: 'Sem velocidade da haste (α_dot), o pêndulo chega ao topo com demasiada energia cinética e passa direto sem conseguir travar.',
    proTip: 'Se desativares este sensor para criar um desafio, seleciona obrigatoriamente a arquitetura GRU para a rede aprender a estimar a velocidade através da sua memória interna.'
  },

  sensor_noise: {
    title: 'Ruído Gaussiano nos Sensores (σ)',
    category: 'Sensores & Atuadores',
    formula: '\\tilde{s}_i = s_i + \\mathcal{N}(0, \\sigma^2)',
    concept: 'Adiciona ruído estocástico aleatório às medições para simular interferências elétricas e vibrações que ocorrem em robôs reais.',
    examples: '• <strong>0.000:</strong> sensores perfeitos e ideais de laboratório teórico.<br>• <strong>0.010 a 0.020:</strong> ruído moderado típico de encoders e cabos industriais.<br>• <strong>0.050+:</strong> ambiente com ruído elétrico severo.',
    generalExpectation: 'No geral, treinar com ruído atua como regularização matemática, impedindo que os pesos da rede façam sobreajuste (overfitting) a estados exatos da simulação.',
    simulationSpecific: 'Com ruído acima de 0.03, redes MLP ingénuas tendem a vibrar o motor no topo. A rede aprende a ignorar altas frequências e focar na tendência geral.',
    proTip: 'Treinar com σ = 0.01 produz controladores muito mais resilientes quando se aplicam choques e perturbações manuais com o rato.'
  },

  sensor_quantization: {
    title: 'Encoder Ótico (Discretização de Resolução)',
    category: 'Sensores & Atuadores',
    formula: '\\Delta\\theta = \\frac{2\\pi}{2^B}, \\quad \\tilde{\\theta} = \\operatorname{round}\\left(\\frac{\\theta}{\\Delta\\theta}\\right) \\Delta\\theta',
    concept: 'Simula um encoder ótico de pulsos reais, convertendo o ângulo contínuo em degraus discretos finitos de acordo com o número de bits.',
    examples: '• <strong>Contínuo:</strong> precisão infinita de 64-bit IEEE float.<br>• <strong>12-bit (4096 pulsos):</strong> padrão de servomotores industriais de precisão.<br>• <strong>10-bit (1024 pulsos):</strong> encoder comum de automação.<br>• <strong>8-bit (256 pulsos):</strong> encoder barato de baixa resolução.',
    generalExpectation: 'No geral, a quantização cria zonas cegas onde pequenas variações de ângulo produzem variação zero de leitura, seguidas de um salto brusco.',
    simulationSpecific: 'Em 8-bit, a velocidade calculada por diferenças finitas sofre picos falsos, fazendo o motor do Furuta ter trepidação audível no topo.',
    proTip: 'Se usares 8-bit, aumenta a penalização de Jerk no fitness para forçar a rede a filtrar os degraus e manter os comandos suaves.'
  },

  sensor_latency: {
    title: 'Latência e Atraso de Comunicação',
    category: 'Sensores & Atuadores',
    formula: 's_{\\text{in}}(t) = s_{\\text{físico}}(t - \\tau)',
    concept: 'Atraso temporal introduzido pelo processamento do barramento de comunicação (CAN, Ethernet, USB) antes de a rede neuronal receber a leitura.',
    examples: '• <strong>0 ms:</strong> barramento ideal instantâneo.<br>• <strong>10 a 15 ms:</strong> atraso típico de ciclos de controlo reais a 100 Hz.<br>• <strong>30 a 50 ms:</strong> atraso severo de teleoperação ou câmaras de visão computacional.',
    generalExpectation: 'No geral, atraso temporal subtrai fase à margem de estabilidade de Bode (-ωτ), transformando sistemas estáveis em osciladores divergentes.',
    simulationSpecific: 'Com mais de 15 ms de atraso, o pêndulo ao atingir a vertical já caiu para o outro lado antes de a rede perceber que precisava de travar o motor.',
    proTip: 'Combina latência alta com a arquitetura GRU: a memória recorrente aprende a fazer extrapolação preditiva do estado futuro.'
  },

  layer_stack: {
    title: 'Pilha de Camadas Ocultas (Deep Network)',
    category: 'Redes Neuronais',
    formula: '\\mathbf{h}^{(l)} = \\sigma\\left(\\mathbf{W}^{(l)}\\mathbf{h}^{(l-1)} + \\mathbf{b}^{(l)}\\right)',
    concept: 'Número e dimensão das camadas intermediárias que combinam e transformam os sinais dos sensores em abstrações não-lineares até à saída de torque.',
    examples: '• <strong>1 camada de 16 (Tanh):</strong> rápida, leve (~150 pesos), muito fácil de evoluir pelo algoritmo genético.<br>• <strong>2 camadas [24, 16]:</strong> capacidade superior para mapear swing-up e estabilização simultâneos.<br>• <strong>3+ camadas:</strong> genoma com centenas de pesos, requer populações genéticas maiores.',
    generalExpectation: 'No geral, redes mais profundas aproximam funções mais complexas, mas o espaço de busca genético cresce exponencialmente com o número de pesos.',
    simulationSpecific: 'Uma camada simples de 16 neurónios é perfeitamente suficiente para equilibrar o Furuta. Adicionar uma segunda camada permite centrar o braço horizontal com mais precisão.',
    proTip: 'Não comeces logo com redes gigantes. Começa simples: menos pesos significa menos gerações até obter o primeiro pêndulo equilibrado.'
  },

  // ==========================================
  // 3. EVOLUÇÃO & ALGORITMOS GENÉTICOS
  // ==========================================
  gen_time: {
    title: 'Tempo por Geração (Duração de Avaliação)',
    category: 'Algoritmos Genéticos',
    formula: 'N_{\\text{passos}} = \\frac{T_{\\text{gen}}}{\\Delta t} = \\frac{T_{\\text{gen}}}{0.005\\text{ s}}',
    concept: 'Duração física simulada durante a qual cada indivíduo da população tem oportunidade de interagir com o pêndulo antes de ser calculada a sua aptidão (fitness) final.',
    examples: '• <strong>Colocar 2.0s a 3.0s (400 a 600 passos):</strong> avalia unicamente o arranque inicial e bombeamento de energia.<br>• <strong>Colocar 6.0s a 8.0s (Padrão, 1200 a 1600 passos):</strong> tempo ideal para o swing-up completo (~2s) mais sustentação estável no topo (~4s a 6s).<br>• <strong>Colocar 15.0s a 30.0s (3000 a 6000 passos):</strong> teste de resistência extrema contra perturbações a longo prazo.',
    generalExpectation: 'No geral, se o tempo for demasiado curto, os indivíduos nunca têm tempo de chegar ao topo e a seleção favorece apenas quem acelera rápido; se for demasiado longo, indivíduos fracos que caem logo desperdiçam tempo computacional.',
    simulationSpecific: 'O swing-up no Furuta requer cerca de 1.5s a 2.5s para bombear energia e atingir a vertical. Com 6.0s, o pêndulo tem tempo de sobra para demonstrar estabilidade contínua sem gastar CPU em demasia.',
    proTip: 'Usa 5.0s a 6.0s nas primeiras 10 gerações para aprender o swing-up rápido; depois sobe para 10.0s ou 15.0s para afinar a robustez e estabilidade prolongada.'
  },

  evo_algo: {
    title: 'Estratégia de Otimização Evolutiva',
    category: 'Algoritmos Genéticos',
    formula: '\\theta_{g+1} = \\mathcal{A}(\\{\\theta_i, f(\\theta_i)\\})',
    concept: 'Define o algoritmo matemático que governa a reprodução, exploração e aperfeiçoamento dos genomas ao longo das gerações.',
    examples: '• <strong>GA Clássico:</strong> seleção natural, cruzamento e mutação estocástica direta de pesos reais.<br>• <strong>OpenAI-ES:</strong> Estratégias Evolutivas que aproximam o gradiente por perturbações gaussianas paralelas.<br>• <strong>NEAT:</strong> NeuroEvolution of Augmenting Topologies, faz crescer nós e conexões do zero.<br>• <strong>Modelo de Ilhas:</strong> divide a população em arquipélagos isolados com migração periódica.<br>• <strong>MAP-Elites:</strong> preserva uma grelha bidimensional de soluções diversas iluminando comportamentos distintos.',
    generalExpectation: 'No geral, algoritmos de nicho (Ilhas, MAP-Elites) protegem a diversidade contra convergência prematura em mínimos locais.',
    simulationSpecific: 'GA e OpenAI-ES convergem muito rápido no Furuta. O Modelo de Ilhas é o mais seguro para evitar que a população inteira fique presa numa oscilação parcial que nunca atinge o topo.',
    proTip: 'O algoritmo GA Clássico é o mais intuitivo para aprender. O Modelo de Ilhas é o mais poderoso para cenários difíceis.'
  },

  evo_pop_size: {
    title: 'Tamanho da População (N_pop)',
    category: 'Algoritmos Genéticos',
    formula: 'N_{\\text{pop}} \\in [20, 300]',
    concept: 'Número de cérebros/redes neuronais concorrentes gerados e avaliados em cada ciclo geracional.',
    examples: '• <strong>Colocar 30 a 50:</strong> muito rápido, poupa bateria e CPU, mas tem maior risco de convergência prematura num mínimo local.<br>• <strong>Colocar 100 (Padrão):</strong> excelente compromisso de diversidade genética e velocidade fluída a 60 FPS.<br>• <strong>Colocar 200 a 300:</strong> exploração maciça do espaço de pesos, perfeito para usar em conjunto com o modo ⚡ Turbo.',
    generalExpectation: 'No geral, populações maiores exploram hiper-volumes de parâmetros de forma muito mais rica, descobrindo caminhos inovadores na função de fitness.',
    simulationSpecific: 'Com 30 indivíduos, pode acontecer que nenhum pêndulo balance na direção certa na 1ª geração; com 100 indivíduos, é praticamente garantido que 2 ou 3 descubram logo o princípio de bombeamento de balanço.',
    proTip: 'Se o teu computador tiver muitos núcleos de CPU, aumenta para 150-200 e liga o Turbo!'
  },

  evo_elite_count: {
    title: 'Elitismo (Top N Imutáveis)',
    category: 'Algoritmos Genéticos',
    formula: 'P_{g+1}[0 \\dots E-1] = \\operatorname{top}_E(P_g)',
    concept: 'Número dos indivíduos com maior pontuação que passam diretamente para a geração seguinte sem sofrer mutação ou corte.',
    examples: '• <strong>Colocar 1:</strong> apenas o campeão supremo é clonado intocado.<br>• <strong>Colocar 3 (Padrão):</strong> garante que o melhor trio de soluções nunca se perde por mutações azaradas.<br>• <strong>Colocar 8 a 10:</strong> forte conservadorismo, estabiliza a população mas pode reduzir a taxa de inovação.',
    generalExpectation: 'No geral, o elitismo confere a propriedade matemática de monotonicidade: a aptidão máxima histórica nunca decresce de uma geração para a seguinte.',
    simulationSpecific: 'Sem elitismo (E=0), um pêndulo que já equilibrava no topo pode ser destruído por uma mutação desastrosa, voltando ao ponto de partida.',
    proTip: 'Mantém sempre 2 a 4 indivíduos de elite. É a tua rede de segurança.'
  },

  evo_selection: {
    title: 'Método de Seleção de Pais',
    category: 'Algoritmos Genéticos',
    formula: '\\text{Torneio: } \\max(f_1, f_2, f_k), \\quad \\text{Roleta: } P(i) = \\frac{f_i}{\\sum f_j}',
    concept: 'Regra matemática que decide quais os indivíduos que ganham o direito de reproduzir e transmitir os seus pesos aos filhos.',
    examples: '• <strong>Torneio (k=3, Recomendado):</strong> sorteia 3 indivíduos aleatórios e escolhe o melhor deles; pressão seletiva consistente e imune a escala.<br>• <strong>Roleta (Fitness Proporcional):</strong> probabilidade diretamente proporcional à pontuação absoluta.<br>• <strong>Ranking Linear:</strong> ordena por posição cardinal, evitando super-indivíduos precoces.<br>• <strong>Truncamento (Top 20%):</strong> apenas os melhores 20% da tabela podem gerar descendentes.',
    generalExpectation: 'No geral, métodos com pressão seletiva moderada (Torneio k=3) equilibram exploração de novas ideias com explotação dos melhores.',
    simulationSpecific: 'A Roleta pode falhar se um único indivíduo tiver um pico de sorte de fitness e dominar 90% da roleta na 2ª geração, matando a diversidade. O Torneio previne este colapso.',
    proTip: 'O método de Torneio (k=3) é universalmente a escolha mais fiável para controlo de pêndulos.'
  },

  evo_crossover: {
    title: 'Operador de Crossover (Recombinação)',
    category: 'Algoritmos Genéticos',
    formula: 'x_{\\text{filho}} = \\lambda x_A + (1-\\lambda) x_B',
    concept: 'Mecanismo que mistura os pesos sinápticos de dois controladores pais para gerar uma nova solução potencialmente melhor.',
    examples: '• <strong>BLX-α (Blend Crossover, Recomendado):</strong> interpola e expande ligeiramente o intervalo dos pais com base no parâmetro alfa.<br>• <strong>Aritmético:</strong> média ponderada linear clássica dos pesos.<br>• <strong>Ponto Único:</strong> corta o vetor de pesos a meio e troca metades.<br>• <strong>Uniforme:</strong> atira uma moeda ao ar para cada sinapse individual.',
    generalExpectation: 'No geral, para parâmetros reais contínuos (pesos de redes neuronais), operadores de mistura (BLX-α) são muito superiores a cortes discretos que partem representações funcionais.',
    simulationSpecific: 'O BLX-α permite combinar uma rede que é boa a balancear com uma rede que é boa a centrar o braço horizontal, gerando um filho equilibrado.',
    proTip: 'Mantém BLX-α com alpha = 0.5 para obter a melhor taxa de sucesso.'
  },

  evo_cross_rate: {
    title: 'Taxa de Crossover (Probabilidade de Cruzamento)',
    category: 'Algoritmos Genéticos',
    formula: 'P(\\text{crossover}) \\in [0.1, 1.0]',
    concept: 'Percentagem de novos descendentes gerados por combinação de dois progenitores em vez de clonagem de um progenitor único.',
    examples: '• <strong>Colocar 0.20:</strong> apenas 20% dos filhos têm dois pais; evolução dominada por mutação.<br>• <strong>Colocar 0.80 (Padrão):</strong> 80% dos filhos misturam os genes dos pais.<br>• <strong>Colocar 1.00:</strong> 100% dos novos indivíduos resultam de recombinação sexual.',
    generalExpectation: 'No geral, valores entre 0.7 e 0.9 aceleram a propagação de soluções bem-sucedidas por toda a população.',
    simulationSpecific: 'Uma taxa de 0.80 ajuda a fundir rapidamente os circuitos de swing-up e de travagem vertical descobertos por indivíduos diferentes.',
    proTip: 'Se a população estiver a estagnar sem descobrir nada novo, podes baixar a taxa de crossover para 0.5 e subir a força de mutação.'
  },

  evo_mutation: {
    title: 'Distribuição de Mutação Genética',
    category: 'Algoritmos Genéticos',
    formula: 'w\' = w + \\Delta w, \\quad \\Delta w \\sim \\mathcal{D}',
    concept: 'Tipo de perturbação estocástica aplicada aos pesos da rede neuronal para introduzir novidade e variedade biológica.',
    examples: '• <strong>Cauchy (Recomendado):</strong> distribuição de cauda pesada; a maioria das mutações é cirúrgica e pequena, mas gera saltos grandes ocasionais que saltam mínimos locais.<br>• <strong>Gaussiana Adaptativa:</strong> perturbação em curva de sino que encolhe à medida que as gerações avançam.<br>• <strong>Polinomial:</strong> perturbação clássica de Deb para algoritmos genéticos reais.<br>• <strong>Uniforme:</strong> perturbação plana dentro de um intervalo fixo.',
    generalExpectation: 'No geral, a distribuição de Cauchy é superior na otimização de redes neuronais porque evita que o sistema fique preso em platôs de gradiente.',
    simulationSpecific: 'No Furuta, a haste muitas vezes fica a oscilar até metade da altura (mínimo local). A mutação Cauchy aplica o salto de amplitude necessário para alcançar a vertical.',
    proTip: 'Usa sempre Cauchy nas primeiras 15 gerações; podes comutar para Gaussiana Adaptativa na fase final de afinação fina.'
  },

  evo_mut_rate: {
    title: 'Taxa de Mutação (Fração de Genes)',
    category: 'Algoritmos Genéticos',
    formula: 'P(\\text{mutar gene}_i) \\in [0.01, 0.50]',
    concept: 'Probabilidade de cada peso ou viés (bias) individual sofrer uma alteração durante a reprodução.',
    examples: '• <strong>Colocar 0.02 (2%):</strong> mutação muito conservadora, apenas 1 ou 2 pesos mudam por indivíduo.<br>• <strong>Colocar 0.10 (Padrão, 10%):</strong> equilíbrio ideal para redes pequenas e médias (~10 a 20 pesos modificados por filho).<br>• <strong>Colocar 0.35+ (35%+):</strong> mutação agressiva, quase transforma o algoritmo numa pesquisa puramente aleatória.',
    generalExpectation: 'No geral, taxas muito baixas atrasam a descoberta de novos comportamentos; taxas muito altas desfazem estruturas que já funcionavam.',
    simulationSpecific: 'Com 0.10, uma rede que já equilibra a haste consegue explorar pequenos ajustes no ganho do braço sem desestabilizar a postura invertida.',
    proTip: 'A regra empírica da literatura de AGs é 1 / N_genes ou entre 5% e 15% para redes neuronais compactas.'
  },

  evo_mut_strength: {
    title: 'Força da Mutação (Magnitude σ)',
    category: 'Algoritmos Genéticos',
    formula: '\\Delta w = \\sigma \\cdot \\xi, \\quad \\xi \\sim \\text{Cauchy ou Gauss}',
    concept: 'Amplitude ou desvio padrão da perturbação somada ao peso selecionado.',
    examples: '• <strong>Colocar 0.05:</strong> micro-ajustes finos; ideal quando o pêndulo já fica no topo e queres eliminar qualquer resíduo de oscilação.<br>• <strong>Colocar 0.20 (Padrão):</strong> amplitude moderada e equilibrada para exploração.<br>• <strong>Colocar 0.60 a 1.00:</strong> perturbações massivas; útil apenas se a simulação estiver presa num beco sem saída.',
    generalExpectation: 'No geral, controla o raio de busca local no hiper-espaço de parâmetros em torno da solução progenitora.',
    simulationSpecific: 'Se a força for 0.05 no início, o algoritmo pode precisar de 50 gerações para atingir o topo. Com 0.20, atinge a vertical em 10 gerações.',
    proTip: 'Começa com 0.20 ou 0.25 para aprender a subir o pêndulo. Quando os pêndulos começarem a equilibrar, reduz gradualmente para 0.05 para refinar.'
  },

  fit_upright: {
    title: 'Recompensa de Equilíbrio Vertical (Upright)',
    category: 'Algoritmos Genéticos',
    formula: 'R_{\\text{upright}} = w_1 \\cdot \\frac{\\cos(\\alpha) + 1}{2} \\Delta t \\quad \\text{ou} \\quad w_1 \\cdot \\cos(\\alpha) \\Delta t',
    concept: 'Termo de recompensa contínua na função de fitness que premeia o ângulo da haste quanto mais próximo estiver do zénite vertical (α = 0).',
    examples: '• <strong>Colocar 0.5:</strong> atração suave, dando maior peso relativo à economia de energia.<br>• <strong>Colocar 1.0 (Padrão):</strong> atração forte e progressiva para o topo em todos os passos.<br>• <strong>Colocar 3.0 a 5.0:</strong> prioridade absoluta em erguer a haste sem se importar com esforço elétrico.',
    generalExpectation: 'No geral, cria um gradiente suave contínuo que guia a evolução mesmo quando o pêndulo ainda está em baixo a acumular balanço.',
    simulationSpecific: 'Se este valor for 0, o pêndulo não tem qualquer motivo para sair da posição de repouso em baixo e a evolução estagna imediatamente.',
    proTip: 'Mantém 1.0 a 2.0 para manter um gradiente natural constante rumo à vertical.'
  },

  fit_bonus: {
    title: 'Bónus de Topo Crítico (|α| < 15°)',
    category: 'Algoritmos Genéticos',
    formula: 'R_{\\text{bonus}} = w_2 \\cdot \\mathbb{I}(|\\alpha| < 15^\\circ) \\Delta t',
    concept: 'Prémio substancial adicional concedido apenas quando o pêndulo entra na janela cónica estreita de equilíbrio invertido no topo.',
    examples: '• <strong>Colocar 0.0:</strong> sem bónus de topo; a rede ganha apenas a recompensa contínua de cosseno.<br>• <strong>Colocar 2.0 (Padrão):</strong> forte incentivo para capturar a haste e permanecer lá.<br>• <strong>Colocar 5.0:</strong> recompensa colossal; transforma a zona de topo no objetivo supremo da seleção natural.',
    generalExpectation: 'No geral, cria um "poço de potencial" atrativo acentuado no cume, distinguindo indivíduos que apenas cruzam o topo a alta velocidade daqueles que efetivamente travam e equilibram.',
    simulationSpecific: 'Com bónus de topo alto, os indivíduos aprendem a inverter a rotação do motor na fração de segundo exata para "apanhar" o pêndulo no zénite.',
    proTip: 'Se vires que os pêndulos cruzam o topo mas não tentam equilibrar, sobe este valor para 3.5 ou 4.0!'
  },

  fit_volt_pen: {
    title: 'Penalização de Voltagem e Consumo Energético',
    category: 'Algoritmos Genéticos',
    formula: 'P_{\\text{volt}} = -w_3 \\cdot \\left(\\frac{V}{V_{\\max}}\\right)^2 \\Delta t',
    concept: 'Custo quadrático subtraído ao fitness por cada volt de tensão elétrica aplicado aos enrolamentos do motor.',
    examples: '• <strong>Colocar 0.00:</strong> consumo livre; o motor pode operar continuamente no limite máximo de 12V ou 24V.<br>• <strong>Colocar 0.05 (Padrão):</strong> penalização equilibrada de eficiência energética.<br>• <strong>Colocar 0.20+:</strong> penalização severa; o motor é desincentivado de fazer movimentos rápidos.',
    generalExpectation: 'No geral, análogo ao termo quadrático R do regulador LQR clássico, previne saturação contínua e sobreaquecimento térmico do atuador.',
    simulationSpecific: 'Com 0.05, assim que o pêndulo atinge a vertical, o motor baixa a voltagem de 12V para menos de 1V, aplicando apenas micro-correções mínimas.',
    proTip: 'Para o swing-up inicial, mantém a penalização baixa (0.02 a 0.05); se quiseres um controlador super-económico industrial, sobe para 0.10.'
  },

  fit_jerk_pen: {
    title: 'Penalização de Trepidação (Jerk Mecânico)',
    category: 'Algoritmos Genéticos',
    formula: 'P_{\\text{jerk}} = -w_4 \\cdot \\left(\\frac{\\Delta V}{\\Delta t}\\right)^2 \\Delta t',
    concept: 'Penaliza variações abruptas de tensão entre passos consecutivos de integração, suprimindo comutações do tipo "bang-bang".',
    examples: '• <strong>Colocar 0.000:</strong> permite saltos instantâneos de -12V para +12V em 5 milissegundos.<br>• <strong>Colocar 0.010 (Padrão):</strong> produz curvas suaves de aceleração mecânica contínua.<br>• <strong>Colocar 0.050+:</strong> movimentos ultra-amortecidos, mas pode atrasar a resposta em emergências.',
    generalExpectation: 'No geral, minimiza tensões de cisalhamento nos dentes das engrenagens, previne ressonâncias estruturais e aumenta a durabilidade do mecanismo.',
    simulationSpecific: 'Sem penalização de jerk, a rede neuronal tende a comutar a voltagem como um relé ruidoso. Com 0.010, o gráfico de voltagem no HUD torna-se uma curva fluída e harmoniosa.',
    proTip: 'Essencial se ativares sensores com ruído para evitar que a rede amplifique ruído de alta frequência no atuador.'
  },

  fit_center_pen: {
    title: 'Penalização de Desvio Central do Braço (θ)',
    category: 'Algoritmos Genéticos',
    formula: 'P_{\\text{center}} = -w_5 \\cdot \\theta^2 \\Delta t',
    concept: 'Penaliza o afastamento angular do braço horizontal em relação à posição neutra frontal central (θ = 0 radianos).',
    examples: '• <strong>Colocar 0.00:</strong> o braço pode girar infinitamente em círculos ou parar em qualquer ângulo.<br>• <strong>Colocar 0.10 (Padrão):</strong> incentiva o robô a equilibrar mantendo o braço horizontal virado para a frente.<br>• <strong>Colocar 0.35+:</strong> braço muito rígido em torno do centro, mas dificulta a manobra de swing-up.',
    generalExpectation: 'No geral, força o controlador multivariável a resolver duas tarefas antagónicas: estabilizar a haste invertida E regular a posição da base.',
    simulationSpecific: 'No Furuta, sem esta penalização, o robô pode atingir o equilíbrio enquanto gira continuamente a 300 RPM no eixo horizontal. Com 0.10, o braço regressa calmamente a θ = 0.',
    proTip: 'Se os pêndulos tiverem dificuldade no swing-up inicial, baixa temporariamente para 0.02 e volta a subir para 0.10 quando já souberem subir.'
  },

  // ==========================================
  // 4. FÍSICA LAB, MATERIAIS & MECÂNICA
  // ==========================================
  mat_pendulum: {
    title: 'Material e Densidade da Haste',
    category: 'Física & Mecânica',
    formula: 'm_p = \\rho \\cdot \\pi r_p^2 L_p, \\quad J_p = \\frac{1}{3} m_p L_p^2',
    concept: 'Define o material físico com que a haste pendular é construída, alterando a sua massa volumétrica (densidade ρ) e distribuição de inércia rotacional.',
    examples: '• <strong>Alumínio 6061 (2700 kg/m³):</strong> leve, ágil, exige pouca corrente do motor.<br>• <strong>Aço Inox (7850 kg/m³, Padrão):</strong> peso industrial realista, inércia clássica do modelo Quanser.<br>• <strong>Latão Naval (8500 kg/m³):</strong> muito denso e pesado, exige torques fortes de aceleração.<br>• <strong>Fibra de Carbono (1600 kg/m³):</strong> ultraleve e rígido; dinâmica muito rápida.<br>• <strong>Madeira (720 kg/m³):</strong> haste leve com baixa inércia.',
    generalExpectation: 'No geral, materiais mais pesados aumentam o momento de inércia quadrático, exigindo mais energia cinética e torque para vencer a gravidade.',
    simulationSpecific: 'Mudar de Aço para Fibra de Carbono faz o pêndulo subir com quase metade da tensão elétrica, mas torna o equilíbrio no topo mais sensível a perturbações bruscas.',
    proTip: 'Para testar a robustez do teu controlador campeão, troca o material para Latão e vê se a rede consegue adaptar-se sem re-treinar!'
  },

  phy_pend_len: {
    title: 'Comprimento da Haste Pendular (L_p)',
    category: 'Física & Mecânica',
    formula: '\\omega_n = \\sqrt{\\frac{3g}{2L_p}} \\implies T = 2\\pi \\sqrt{\\frac{2L_p}{3g}}',
    concept: 'Distância linear total entre a articulação rotativa do braço e a ponta livre da haste cilíndrica.',
    examples: '• <strong>Colocar 0.18 m a 0.22 m:</strong> haste curta; frequência natural muito rápida; cai quase instantaneamente se o motor falhar.<br>• <strong>Colocar 0.337 m (Padrão Furuta):</strong> dimensão clássica de laboratório.<br>• <strong>Colocar 0.45 m a 0.50 m:</strong> haste longa e lenta; fácil de equilibrar visualmente, mas requer maior aceleração angular do braço.',
    generalExpectation: 'No geral, o período de oscilação cresce com a raiz quadrada do comprimento. Pêndulos curtos exigem largura de banda de controlo mais alta.',
    simulationSpecific: 'Uma haste de 0.20m tem tempo de queda de menos de 150ms a partir do topo; uma haste de 0.50m demora quase o dobro a tombar, dando mais tempo à rede para reagir.',
    proTip: 'Tenta a Missão do "Pêndulo Lápis Curto" para ver como a física rápida desafia a latência do controlador.'
  },

  phy_pend_rad: {
    title: 'Raio da Secção da Haste (r_p)',
    category: 'Física & Mecânica',
    formula: 'm_p \\propto r_p^2, \\quad J_p \\propto r_p^2',
    concept: 'Raio cilíndrico da secção transversal da haste metálica em milímetros.',
    examples: '• <strong>Colocar 2.5 mm a 3.5 mm:</strong> haste fina e esbelta, peso reduzido.<br>• <strong>Colocar 5.0 mm (Padrão):</strong> haste de 1 centímetro de diâmetro.<br>• <strong>Colocar 8.0 mm a 10.0 mm:</strong> barra maciça espessa e pesada.',
    generalExpectation: 'No geral, duplicar o raio quadruplica a massa e a inércia rotacional da haste sem alterar a sua distribuição longitudinal de comprimento.',
    simulationSpecific: 'Com raio de 8mm, a inércia aumentada exige que o motor trabalhe perto do limite de saturação de torque durante a inversão rápida do swing-up.',
    proTip: 'Observa os valores em tempo real na caixa preta do inspetor: a massa e inércia recalculam-se instantaneamente.'
  },

  phy_arm_len: {
    title: 'Comprimento do Braço Horizontal (L_r)',
    category: 'Física & Mecânica',
    formula: 'a_{\\text{tangencial}} = L_r \\cdot \\ddot{\\theta}, \\quad J_r = \\frac{1}{3} m_r L_r^2',
    concept: 'Comprimento do braço rotativo rígido fixado diretamente ao veio de saída do motor DC.',
    examples: '• <strong>Colocar 0.12 m a 0.15 m:</strong> braço curto; exige maior aceleração angular do motor para gerar aceleração linear na ponta.<br>• <strong>Colocar 0.216 m (Padrão Furuta):</strong> geometria de referência.<br>• <strong>Colocar 0.30 m a 0.35 m:</strong> braço longo com grande efeito de alavanca linear.',
    generalExpectation: 'No geral, o braço funciona como um atuador linear curvilíneo: quanto mais longo, maior a aceleração tangencial transmitida à base da haste por cada radiano por segundo ao quadrado do motor.',
    simulationSpecific: 'Com braço comprido (0.32m), um pequeno torque do motor produz grande aceleração na articulação, facilitando erguer a haste mas amplificando forças de Coriolis centrífugas.',
    proTip: 'Se o motor estiver a saturar o torque, aumentar ligeiramente o comprimento do braço fornece maior vantagem mecânica tangencial.'
  },

  motor_max_v: {
    title: 'Tensão Máxima da Fonte DC (V_max)',
    category: 'Sensores & Atuadores',
    formula: 'V_{\\text{in}}(t) \\in [-V_{\\max}, +V_{\\max}], \\quad V_{\\max} \\in [6\\text{V}, 24\\text{V}]',
    concept: 'Voltagem máxima permitida pela eletrónica da ponte H de potência que alimenta a armadura do motor elétrico.',
    examples: '• <strong>Colocar 6 V:</strong> atuador severamente limitado; swing-up muito difícil, exige acumulação meticulosa de ressonância ao longo de várias oscilações.<br>• <strong>Colocar 12 V (Padrão Industrial):</strong> potência ideal para swing-up dinâmico em 2 balanços.<br>• <strong>Colocar 24 V:</strong> alta potência; permite swing-up num único esticão direto sem balanço prévio.',
    generalExpectation: 'No geral, a tensão disponível dita a corrente máxima instantânea e a aceleração inicial que o sistema consegue imprimir ao rotor parado.',
    simulationSpecific: 'Com 6V, controladores com pressa falham o topo porque a velocidade máxima angular do braço fica limitada pela força contra-eletromotriz.',
    proTip: 'Experimenta treinar com 12V e depois baixar para 8V para observar o controlador a adaptar o timing de bombeamento de energia.'
  },

  motor_res: {
    title: 'Resistência de Armadura do Motor (R_a)',
    category: 'Sensores & Atuadores',
    formula: 'I_a = \\frac{V - K_b \\dot{\\theta}}{R_a}, \\quad \\tau = K_t I_a, \\quad P_{\\text{Joule}} = R_a I_a^2',
    concept: 'Resistência elétrica dos enrolamentos de cobre internos do rotor do motor elétrico de corrente contínua.',
    examples: '• <strong>Colocar 3.0 Ω a 5.0 Ω:</strong> resistência muito baixa; motor de alta corrente e aceleração quase instantânea.<br>• <strong>Colocar 8.4 Ω (Padrão Laboratorial):</strong> valor experimental calibrado do motor Quanser.<br>• <strong>Colocar 12.0 Ω a 15.0 Ω:</strong> resistência elevada; estrangula a corrente e limita severamente o torque disponível.',
    generalExpectation: 'No geral, pela Lei de Ohm, uma menor resistência interna permite maior passagem de corrente para a mesma voltagem, gerando mais torque com o motor parado.',
    simulationSpecific: 'Se subires a resistência para 14 Ω, o motor perde força de arranque e terá de oscilar 4 ou 5 vezes para conseguir atingir o topo vertical.',
    proTip: 'Motores industriais de gama alta procuram sempre resistências o mais baixas possível para maximizar a densidade de potência.'
  },

  motor_kb: {
    title: 'Constante Back-EMF e de Torque (K_b / K_t)',
    category: 'Sensores & Atuadores',
    formula: 'V_{\\text{bemf}} = K_b \\cdot \\dot{\\theta} \\implies I_a = \\frac{V_{\\text{in}} - K_b \\dot{\\theta}}{R_a}',
    concept: 'Efeito gerador eletromagnético: quando a armadura do motor gira dentro do campo magnético dos ímanes, produz uma tensão oposta à voltagem aplicada pela rede neuronal.',
    examples: '• <strong>Colocar 0.020 V·s/rad:</strong> pouca contra-tensão gerada; o motor atinge rotações altíssimas sem perda apreciável de torque.<br>• <strong>Colocar 0.042 V·s/rad (Padrão):</strong> equilíbrio ótimo entre aceleração e travagem regenerativa natural.<br>• <strong>Colocar 0.080+ V·s/rad:</strong> forte contra-tensão; o motor atua como um travão viscoso eletromagnético potente.',
    generalExpectation: 'No geral, a força contra-eletromotriz impõe um teto natural à velocidade máxima de rotação do motor em vazio (quando V_in = K_b * omega).',
    simulationSpecific: 'Se Kb for excessivamente alto, o braço não consegue rodar rápido o suficiente para se deslocar por baixo do pêndulo quando este cai velozmente no swing-up.',
    proTip: 'Nas leis da termodinâmica eletromecânica em unidades SI, Kt (em N·m/A) é rigorosamente idêntico a Kb (em V·s/rad).'
  },

  motor_tau_max: {
    title: 'Saturação de Torque Mecânico (τ_max)',
    category: 'Sensores & Atuadores',
    formula: '\\tau_{\\text{efetivo}} = \\operatorname{clip}(\\tau, -\\tau_{\\max}, +\\tau_{\\max})',
    concept: 'Limite superior físico imposto pela saturação do ferro magnético, limite térmico da ponte H e integridade estrutural das engrenagens redutoras.',
    examples: '• <strong>Colocar 0.6 a 0.8 N·m:</strong> torque restrito; impede acelerações brutas e força estratégias subtis de ressonância harmónica.<br>• <strong>Colocar 1.5 N·m (Padrão):</strong> torque amplo e seguro para compensar perturbações repentinas.<br>• <strong>Colocar 2.5 a 3.0 N·m:</strong> atuador potente capaz de estancar o pêndulo instantaneamente.',
    generalExpectation: 'No geral, modela realisticamente o facto de que nenhum motor real consegue produzir torques infinitos, mesmo que a rede ordene voltagens extremas.',
    simulationSpecific: 'Com 0.7 N·m, é impossível levantar a haste num só impulso. O controlador é forçado pela seleção natural a aprender o balanço em pêndulo duplo.',
    proTip: 'Reduz este valor para testar se a rede aprendeu verdadeira inteligência de swing-up harmónico ou se estava apenas a aplicar força bruta.'
  },

  fric_viscous: {
    title: 'Coeficiente de Atrito Viscoso (b)',
    category: 'Física & Mecânica',
    formula: '\\tau_{\\text{visc}} = -b \\cdot \\dot{\\theta}',
    concept: 'Resistência ao movimento linearmente proporcional à velocidade angular, originada pelo corte e cisalhamento do filme de óleo lubrificante nos rolamentos de esferas.',
    examples: '• <strong>Colocar 0.0003:</strong> rolamento cerâmico de precisão aeroespacial; oscilação quase eterna sem perda de energia.<br>• <strong>Colocar 0.0015 (Padrão):</strong> rolamento de esferas industrial lubrificado com massa de baixa fricção.<br>• <strong>Colocar 0.0060+:</strong> rolamento viscoso espesso ou amortecedor hidráulico integrado.',
    generalExpectation: 'No geral, o atrito viscoso dissipa energia cinética na forma de calor continuamente, ajudando à estabilidade passiva mas exigindo energia contínua para manter rotação.',
    simulationSpecific: 'Um atrito viscoso moderado ajuda o pêndulo a assentar mais depressa na vertical quando a rede comete pequenos erros de micro-tensão.',
    proTip: 'Se quiseres um sistema perpétuo onde cada gota de energia aplicada pelo motor é preservada, experimenta baixar para 0.0002.'
  },

  fric_coulomb: {
    title: 'Atrito Seco de Coulomb e Estático (c)',
    category: 'Física & Mecânica',
    formula: '\\tau_{\\text{coulomb}} = -c \\cdot \\operatorname{tanh}\\left(\\frac{\\dot{\\theta}}{\\epsilon}\\right)',
    concept: 'Atrito sólido de contacto entre superfícies metálicas microscópicas, independente da velocidade mas com sentido sempre oposto ao movimento.',
    examples: '• <strong>Colocar 0.0005:</strong> superfícies polidas espelhadas com atrito estático praticamente nulo.<br>• <strong>Colocar 0.0020 (Padrão):</strong> atrito seco realista de rolamentos industriais com vedantes de borracha.<br>• <strong>Colocar 0.0070+:</strong> vedantes de contacto muito apertados ou rolamento com detritos.',
    generalExpectation: 'No geral, cria uma zona morta (deadband) mecânica: se o torque aplicado pelo motor for inferior a c, o eixo fica completamente imóvel preso pelo atrito estático.',
    simulationSpecific: 'Com atrito de Coulomb elevado, a rede não consegue fazer micro-ajustes suaves no topo: tem de dar pequenos impulsos pulsados para vencer o atrito seco.',
    proTip: 'A nossa simulação física usa uma aproximação contínua tanh(omega / epsilon) para garantir convergência suave do integrador RK4 sem singularidades numéricas.'
  },

  // ==========================================
  // 5. TÓPICOS HISTÓRICOS & CONCEITUAIS
  // ==========================================
  rk4: {
    title: 'Integrador Runge-Kutta 4ª Ordem (RK4)',
    category: 'Física & Mecânica',
    formula: 'y_{n+1} = y_n + \\frac{\\Delta t}{6}(k_1 + 2k_2 + 2k_3 + k_4)',
    concept: 'Algoritmo numérico avançado de integração temporal de equações diferenciais ordinárias não-lineares.',
    examples: '• <strong>dt = 0.005s (200 Hz, Padrão):</strong> precisão milimétrica, conserva o hamiltoniano de energia mecânica por dezenas de milhares de passos.<br>• <strong>dt > 0.02s:</strong> passo muito largo; arrisca instabilidade e explosão numérica da energia.<br>• <strong>dt < 0.001s:</strong> precisão extrema mas consome mais ciclos de computação.',
    generalExpectation: 'No geral, avalia a derivada em 4 pontos distintos do intervalo infinitesimal dt (início, dois pontos médios e fim), garantindo um erro de discretização local de quinta ordem O(dt^5).',
    simulationSpecific: 'Permite simular o pêndulo de Furuta a 200 Hz garantindo que a troca entre energia potencial mgh e energia cinética rotacional 1/2 J omega^2 se mantém exata sem deriva artificial.',
    proTip: 'A 200 Hz, o erro numérico acumulado é impercetível mesmo após 30 minutos de simulação contínua.'
  },

  back_emf: {
    title: 'Força Contra-Eletromotriz (Back-EMF)',
    category: 'Sensores & Atuadores',
    formula: 'V_{\\text{bemf}} = K_b \\cdot \\dot{\\theta} \\implies I_a = \\frac{V_{\\text{in}} - K_b \\dot{\\theta}}{R}',
    concept: 'Tensão interna gerada pelo motor que se opõe à corrente fornecida pela fonte de alimentação à medida que a rotação aumenta.',
    examples: '• <strong>Kb = 0.020:</strong> pouca contra-tensão, permitindo rotações vertiginosas do braço.<br>• <strong>Kb = 0.042 (Padrão):</strong> resposta equilibrada e travagem natural.<br>• <strong>Kb = 0.080:</strong> forte travagem eletromecânica geradora.',
    generalExpectation: 'No geral, é o mecanismo físico universal que dita que nenhum motor pode acelerar indefinidamente mesmo na ausência de atrito mecânico.',
    simulationSpecific: 'Protege o pêndulo de centrifugação extrema: à medida que o braço roda mais rápido, o torque disponível cai para zero.',
    proTip: 'Verifica o gráfico de Tensão no HUD: repara como a voltagem líquida cai quando o braço começa a rodar a alta rotação.'
  },

  coulomb_friction: {
    title: 'Atrito de Coulomb (Seco / Estático)',
    category: 'Física & Mecânica',
    formula: '\\tau_{\\text{fric}} = -c \\cdot \\operatorname{sgn}(\\dot{\\theta}) - b \\cdot \\dot{\\theta}',
    concept: 'Resistência ao movimento constante e independente da velocidade que ocorre no contacto entre metais dos rolamentos.',
    examples: '• <strong>c = 0.0005:</strong> movimento livre com atrito estático quase desprezível.<br>• <strong>c = 0.0020 (Padrão):</strong> atrito seco equilibrado.<br>• <strong>c = 0.0070+:</strong> contacto pesado que requer torque mínimo para começar a mover.',
    generalExpectation: 'No geral, trava o sistema quando a velocidade atinge zero e impede pequenas oscilações de continuarem indefinidamente.',
    simulationSpecific: 'Ajuda a haste a permanecer perfeitamente vertical sem vibrar se a rede conseguir colocar a velocidade em zero.',
    proTip: 'A nossa implementação usa tanh(omega / epsilon) para evitar descontinuidades numéricas no zero.'
  },

  siren: {
    title: 'SIREN (Sinusoidal Representation Network)',
    category: 'Redes Neuronais',
    formula: 'f(x) = \\sin(\\omega_0 x)',
    concept: 'Rede neuronal que utiliza a função seno como ativação não-linear em todas as camadas ocultas.',
    examples: '• <strong>ω0 = 1.0:</strong> ativação suave com frequência fundamental periódica.<br>• <strong>ω0 = 5.0 a 10.0:</strong> captura dinâmicas harmónicas rápidas de alta frequência.<br>• <strong>ω0 muito alto:</strong> superfície de perda torna-se caótica.',
    generalExpectation: 'No geral, como as equações diferenciais da física dependem de funções trigonométricas, redes periódicas aprendem ressonâncias com muito menos neurónios que ReLU.',
    simulationSpecific: 'Aprende o ritmo de bombeamento pendular com fluidez admirável no swing-up.',
    proTip: 'Ideal para tarefas onde o controlador precisa sincronizar com a ressonância natural do pêndulo.'
  },

  gru: {
    title: 'Célula Recorrente GRU (Gated Recurrent Unit)',
    category: 'Redes Neuronais',
    formula: 'h_t = (1 - z_t) \\odot h_{t-1} + z_t \\odot \\tilde{h}_t',
    concept: 'Neurónios dotados de memória interna persistente através de portas de atualização (update) e reinício (reset).',
    examples: '• <strong>Latência 0ms:</strong> funciona como um filtro dinâmico temporal.<br>• <strong>Latência 20-40ms:</strong> estima a trajetória e velocidade mesmo com sensores atrasados.<br>• <strong>Sensores sem velocidade:</strong> reconstitui derivadas por histórico de memória.',
    generalExpectation: 'No geral, redes recorrentes são o padrão da indústria para problemas parcialmente observáveis (POMDP).',
    simulationSpecific: 'Permite estabilizar o Furuta mesmo se desativares completamente os sensores de velocidade angular.',
    proTip: 'Essencial para a Missão pedagógica do Sensor Cego!'
  },

  blx_alpha: {
    title: 'Crossover BLX-alpha (Blend Crossover)',
    category: 'Algoritmos Genéticos',
    formula: 'x_i \\in [c_{\\min} - \\alpha I, c_{\\max} + \\alpha I], \\quad I = c_{\\max} - c_{\\min}',
    concept: 'Recombinação genética para vetores de números reais que expande ligeiramente o espaço entre os dois progenitores.',
    examples: '• <strong>α = 0.1 a 0.2:</strong> cruzamento tímido muito focado no meio dos pais.<br>• <strong>α = 0.5 (Padrão de Eshelman & Schaffer):</strong> exploração equilibrada perfeita.<br>• <strong>α = 0.8+:</strong> alta dispersão, aproxima-se de mutação pura.',
    generalExpectation: 'No geral, previne que a população colapse prematuramente para a média sem explorar os arredores imediatos.',
    simulationSpecific: 'Combina ganhos de feedback de velocidade de um pai com ganhos de ângulo do outro sem quebrar o equilíbrio fino.',
    proTip: 'O valor clássico da literatura científica é rigorosamente alpha = 0.5.'
  },

  cauchy: {
    title: 'Mutação Cauchy (Cauda Pesada)',
    category: 'Algoritmos Genéticos',
    formula: 'f(x) = \\frac{1}{\\pi \\gamma \\left[1 + \\left(\\frac{x - x_0}{\\gamma}\\right)^2\\right]}',
    concept: 'Distribuição estatística com caudas assintóticas longas sem variância finita definida.',
    examples: '• <strong>γ = 0.05:</strong> mutações cirúrgicas quase impercetíveis.<br>• <strong>γ = 0.15 (Padrão):</strong> afinações finas na maioria dos genes com saltos raros e providenciais.<br>• <strong>γ = 0.50+:</strong> saltos gigantes frequentes.',
    generalExpectation: 'No geral, a probabilidade de gerar perturbações muito maiores que 3 sigmas é muito mais elevada que na Gaussiana, permitindo escapar a platôs locais.',
    simulationSpecific: 'Desbloqueia os pêndulos quando toda a geração está viciada em balançar apenas até 90 graus sem ousar dar a volta completa.',
    proTip: 'Use Cauchy no início do treino para explorar rapidamente estratégias alternativas de balanço.'
  },

  map_elites: {
    title: 'MAP-Elites (Grelha de Nichos Comportamentais)',
    category: 'Algoritmos Genéticos',
    formula: '\\text{Arquivo}[x, y] = \\arg\\max_{\\text{fitness}} (\\text{Indivíduo})',
    concept: 'Algoritmo de Qualidade-Diversidade (QD) que preenche uma grelha bidimensional de comportamentos guardando o melhor indivíduo de cada nicho.',
    examples: '• <strong>Dimensão 1:</strong> Consumo de Energia Elétrica.<br>• <strong>Dimensão 2:</strong> Amplitude / Variância do Braço Horizontal.<br>• <strong>Resolução 20x20:</strong> arquivo com 400 controladores distintos.',
    generalExpectation: 'No geral, em vez de focar num único vencedor, descobre um catálogo diversificado de soluções de alta qualidade para o mesmo problema.',
    simulationSpecific: 'Produz simultaneamente controladores ultra-económicos lentos e controladores ultra-agressivos rápidos no mesmo treino.',
    proTip: 'Permite descobrir controladores para diferentes perfis operacionais com uma única execução.'
  },

  island: {
    title: 'Modelo de Ilhas (Subpopulações Paralelas)',
    category: 'Algoritmos Genéticos',
    formula: '\\text{Ilha}_i \\xrightarrow{\\text{Migração}} \\text{Ilha}_{(i+1) \\bmod K}',
    concept: 'Distribui a população em arquipélagos isolados com evolução independente e migração periódica dos melhores indivíduos.',
    examples: '• <strong>4 Ilhas com migração a cada 5 gerações (Padrão):</strong> diversidade excelente.<br>• <strong>Taxa de migração 0.05 a 0.10:</strong> sangue novo saudável sem homogeneizar.<br>• <strong>Taxa de migração > 0.40:</strong> perde o benefício do isolamento geográfico.',
    generalExpectation: 'No geral, simula a evolução biológica de arquipélagos como as Ilhas Galápagos de Darwin, retardando a endogamia e convergência prematura.',
    simulationSpecific: 'Uma ilha pode especializar-se no swing-up anti-horário e outra no horário; quando migram, a recombinação cria controladores universais.',
    proTip: 'Excelente quando se quer evitar a convergência prematura para swing-ups parciais.'
  },

  // ==========================================
  // 6. VISÃO GERAL DE SECÇÕES & TELEMETRIA
  // ==========================================
  sensor_pipeline: {
    title: 'Pipeline de Sensores e Condicionamento de Sinais',
    category: 'Sensores & Atuadores',
    formula: '\\mathbf{s}(t) = \\mathcal{Q}_B\\left(\\mathbf{f}_{\\text{trig}}(\\mathbf{x}(t - \\tau)) + \\mathbf{\\eta}\\right), \\quad \\mathbf{\\eta} \\sim \\mathcal{N}(0, \\sigma^2)',
    concept: 'Camada de pré-processamento de sinais físicos que converte o estado contínuo analógico do mecanismo em observações discretizadas, ruidosas e com atraso temporal entregues à rede neuronal.',
    examples: '• <strong>Ideal / Teórico:</strong> sem ruído (σ=0), sem latência (0ms), encoder contínuo e sen/cos ativado.<br>• <strong>Industrial Típico:</strong> ruído σ=0.010, encoder 10-bit (1024 pulsos), latência 10ms.<br>• <strong>Severo / Adverso:</strong> sem velocidades (apenas ângulos), ruído σ=0.035, latência 25ms, encoder 8-bit.',
    generalExpectation: 'No geral, aproxima a simulação do abismo Sim-to-Real (a diferença inevitável entre simulações matemáticas ideais e robôs físicos reais sujeitos a interferências elétricas).',
    simulationSpecific: 'Em ambiente ideal, qualquer MLP equilibra o Furuta rapidamente. Com o pipeline realista ativado, apenas redes robustas com penalização de Jerk e filtragem temporal evitam trepidação destrutiva no motor.',
    proTip: 'Treina sempre primeiro com pipeline ideal e depois ativa gradualmente o ruído e a latência para testar a resiliência do controlador.'
  },

  evo_operators: {
    title: 'Operadores Genéticos e Dinâmica Reprodutiva',
    category: 'Algoritmos Genéticos',
    formula: 'P_{g+1} = \\mathcal{M}_{\\sigma}\\left(\\mathcal{C}_\\alpha\\left(\\mathcal{S}_k(P_g)\\right)\\right)',
    concept: 'Conjunto de mecanismos biológicos inspirados na seleção natural (Seleção dos mais aptos, Recombinação de genomas progenitores e Mutação estocástica de pesos) que guiam a busca heurística.',
    examples: '• <strong>Exploração Rápida:</strong> Torneio k=2, Crossover Uniforme (0.90), Mutação Cauchy (σ=0.30) — ideal para as 5 primeiras gerações.<br>• <strong>Refinamento Fino:</strong> Torneio k=4, BLX-α (0.70), Mutação Gaussiana Adaptativa (σ=0.05) — para afinar a precisão no topo.<br>• <strong>Conservador:</strong> Elitismo alto (5), Crossover Aritmético (0.60), Mutação Polinomial (σ=0.08).',
    generalExpectation: 'No geral, o equilíbrio delicado entre Exploração (descobrir novas manobras de balanço) e Explotação (aperfeiçoar o equilíbrio vertical) dita a velocidade de convergência e evita mínimos locais.',
    simulationSpecific: 'No Furuta, mutações fracas no início deixam a haste presa a oscilar fracamente no fundo. Operadores balanceados permitem descobrir a ressonância harmónica de swing-up em menos de 10 gerações.',
    proTip: 'Se a aptidão estagnar por mais de 5 gerações, aumenta a força de mutação para 0.35 para injetar nova diversidade genética.'
  },

  fitness_weights: {
    title: 'Função de Aptidão (Fitness Multiobjetivo)',
    category: 'Algoritmos Genéticos',
    formula: 'f = \\sum_{t} \\left( w_1 R_{\\text{up}} + w_2 R_{\\text{top}} - w_3 V^2 - w_4 \\dot{V}^2 - w_5 \\theta^2 \\right) \\Delta t',
    concept: 'A bússola matemática que quantifica o quão bom é cada controlador, ponderando recompensas por manter a haste na vertical contra custos de gasto elétrico, aceleração brusca e desvio da base.',
    examples: '• <strong>Agressivo / Competição:</strong> Equilíbrio=3.0, Bónus=5.0, Voltagem=0.01, Jerk=0.00 — sobe a haste a qualquer custo de energia.<br>• <strong>Económico / Industrial:</strong> Equilíbrio=1.0, Bónus=2.0, Voltagem=0.10, Jerk=0.03, Centro=0.20 — movimentos suaves e mínimo aquecimento térmico.<br>• <strong>Estabilização Estrita:</strong> Centro=0.40, Jerk=0.02 — mantém o braço rigorosamente virado para a frente.',
    generalExpectation: 'No geral, o algoritmo genético otimiza estritamente o que a função de fitness mede; qualquer termo omitido resultará em comportamentos parasitários imprevistos pelo projetista.',
    simulationSpecific: 'Se a penalização de centro for zero, o robô pode aprender a equilibrar o pêndulo enquanto gira o braço a 300 RPM em círculos contínuos. Adicionar w_5 > 0.05 obriga o braço a travar na posição neutra.',
    proTip: 'Não coloques a penalização de voltagem muito alta no início, senão os pêndulos descobrem que ficar imóveis no repouso poupa mais energia do que tentar balançar!'
  },

  dc_motor: {
    title: 'Atuador: Dinâmica do Motor DC e Ponte H',
    category: 'Sensores & Atuadores',
    formula: 'V_{\\text{in}} = R_a I_a + K_b \\dot{\\theta}, \\quad \\tau = \\operatorname{clip}(K_t I_a, -\\tau_{\\max}, +\\tau_{\\max})',
    concept: 'Modelo eletromecânico do servomotor de corrente contínua acoplado ao veio horizontal, integrando resistência elétrica dos enrolamentos, força contra-eletromotriz e limite de saturação de torque.',
    examples: '• <strong>Padrão Quanser:</strong> V_max=12V, R=8.4Ω, Kb=0.042, τ_max=1.5 N·m.<br>• <strong>Alta Potência:</strong> V_max=24V, R=4.0Ω, Kb=0.030, τ_max=3.0 N·m (permite swing-up direto num único esticão sem balanço prévio).<br>• <strong>Motor Limitado:</strong> V_max=8V, R=12.0Ω, Kb=0.060, τ_max=0.7 N·m (exige 3 a 4 oscilações ressonantes meticulosas).',
    generalExpectation: 'No geral, a resposta temporal de motores elétricos é limitada pelo tempo de estabelecimento da corrente e pela contra-tensão gerada pela própria velocidade de rotação.',
    simulationSpecific: 'Durante o swing-up, quando a haste desce acelerada pela gravidade, o motor consome picos de corrente na reversão rápida. O torque máximo τ_max impede forças irreais que quebrariam redutores mecânicos.',
    proTip: 'Se quiseres desafiar a IA, reduz a Tensão Máxima para 8V: a rede é obrigada a sincronizar perfeitamente com a frequência natural do pêndulo.'
  },

  friction_model: {
    title: 'Modelo de Atrito: Viscoso e Coulomb (Stribeck)',
    category: 'Física & Mecânica',
    formula: '\\tau_{\\text{atrito}} = -b \\cdot \\dot{\\theta} - c \\cdot \\tanh\\left(\\frac{\\dot{\\theta}}{\\epsilon}\\right)',
    concept: 'Dissipação combinada de energia mecânica nos eixos rotativos: atrito viscoso (hidrodinâmico do filme de lubrificante) e atrito seco de Coulomb (contacto microscópico entre superfícies metálicas).',
    examples: '• <strong>Rolamentos Ideais:</strong> b=0.0003, c=0.0005 — oscilação livre quase perpétua.<br>• <strong>Mancal Industrial Típico:</strong> b=0.0015, c=0.0020 — amortecimento realista e paragem estável no repouso.<br>• <strong>Rolamento Gasto / Atrito Pesado:</strong> b=0.0050, c=0.0070 — zona morta substancial que exige torque mínimo para mover.',
    generalExpectation: 'No geral, o atrito viscoso estabiliza sistemas dinâmicos amortecendo altas velocidades, enquanto o atrito de Coulomb introduz não-linearidade estática que pode prender o mecanismo.',
    simulationSpecific: 'Um atrito de Coulomb moderado (c=0.002) ajuda a manter a haste no topo sem trepidação contínua do motor, pois absorve pequenos impulsos residuais perto da velocidade nula.',
    proTip: 'Experimenta colocar b=0 e c=0 para ver o pêndulo oscilar indefinidamente sem perder amplitude, confirmando a conservação numérica de energia do RK4!'
  },

  calc_physics: {
    title: 'Propriedades Dinâmicas Calculadas da Haste',
    category: 'Física & Mecânica',
    formula: 'm_p = \\rho \\pi r_p^2 L_p, \\quad J_p = \\frac{1}{3} m_p L_p^2, \\quad l_p = \\frac{L_p}{2}',
    concept: 'Massa inercial, momento de inércia em relação ao ponto de rotação e centro de gravidade derivados analiticamente em tempo real a partir da densidade do material escolhido e das dimensões geométricas.',
    examples: '• <strong>Aço (L=0.337m, r=5mm):</strong> m_p = 0.127 kg, J_p = 0.00120 kg·m², l_p = 0.1685 m.<br>• <strong>Alumínio (L=0.337m, r=5mm):</strong> m_p = 0.044 kg, J_p = 0.00041 kg·m² (quase 3x mais leve que o aço!).<br>• <strong>Fibra de Carbono (L=0.200m, r=3mm):</strong> m_p = 0.009 kg, J_p = 0.00004 kg·m² (ultrarrápido, baixa inércia).',
    generalExpectation: 'No geral, o momento de inércia escalar J_p dita a resistência que a haste oferece a acelerações angulares segundo a 2ª Lei de Newton rotacional (τ = J α).',
    simulationSpecific: 'Quanto maior for o momento de inércia J_p, mais lenta é a dinâmica angular e maior o torque que o motor da base necessita de aplicar para reverter a rotação da haste.',
    proTip: 'Ao mudar de material ou comprimento, repara como estes valores numéricos se atualizam imediatamente no painel informativo!'
  },

  synaptic_diagram: {
    title: 'Diagrama Sináptico Pulsante e Ativações',
    category: 'Redes Neuronais',
    formula: 'a_j = \\sigma\\left(\\sum_i W_{ji} x_i + b_j\\right)',
    concept: 'Representação visual vetorial ao vivo do fluxo de informação e intensidade das conexões sinápticas através das camadas da rede neuronal do indivíduo campeão.',
    examples: '• <strong>Conexão Verde / Ciano:</strong> peso sináptico excitatório positivo (W > 0).<br>• <strong>Conexão Vermelha / Rosa:</strong> peso sináptico inibitório negativo (W < 0).<br>• <strong>Espessura do Traço:</strong> magnitude absoluta |W| da conexão.<br>• <strong>Brilho do Neurónio:</strong> taxa instantânea de ativação contínua a(t) ∈ [-1, +1].',
    generalExpectation: 'No geral, permite diagnosticar se a rede está a utilizar todos os seus neurónios ou se certas sinapses colapsaram para saturação estática (neurónios "mortos").',
    simulationSpecific: 'Repara como os neurónios piscam vigorosamente em sincronia com o balanço do pêndulo durante o swing-up, e estabilizam num brilho suave quase estático assim que a haste entra em equilíbrio vertical.',
    proTip: 'Se vires neurónios que nunca acendem ou ficam sempre no brilho máximo, a rede pode estar com pesos sobressaturados.'
  },

  phase_portrait: {
    title: 'Espaço de Estados e Retrato de Fase (α vs ω)',
    category: 'Física & Mecânica',
    formula: '\\mathbf{x}(t) = [\\alpha(t), \\dot{\\alpha}(t)]^T \\in [-\\pi, \\pi] \\times [-\\omega_{\\max}, \\omega_{\\max}]',
    concept: 'Gráfico bidimensional clássico da teoria de sistemas dinâmicos que mapeia a trajetória contínua do pêndulo plotando o ângulo da haste no eixo X e a sua velocidade angular no eixo Y.',
    examples: '• <strong>Ciclo Limite (Órbita Fechada):</strong> o pêndulo oscila continuamente num vaivém harmónico repetitivo sem convergir.<br>• <strong>Espiral Convergente para a Origem (0, 0):</strong> o controlador está a amortecer e a conduzir o pêndulo com perfeição para o repouso invertido estável no topo.<br>• <strong>Linha Aberta com Salto Horizontal:</strong> a haste deu uma volta completa de 360 graus ultrapassando o ponto de descontinuidade de π radianos.',
    generalExpectation: 'No geral, retratos de fase revelam a estabilidade assintótica de Lyapunov de sistemas não-lineares sem necessidade de resolver equações no tempo.',
    simulationSpecific: 'O ponto de equilíbrio invertido perfeito no topo corresponde exatamente ao centro da mira (0, 0). Uma boa rede neuronal faz a trajetória espiralar suavemente até estacionar no centro!',
    proTip: 'Observa a curva do retrato de fase no HUD: quando o controlador atinge o swing-up bem-sucedido, verás uma bela espiral ciano a contrair-se na mira verde central.'
  },

  openai_es: {
    title: 'OpenAI-ES (Estratégias Evolutivas de Perturbação)',
    category: 'Algoritmos Genéticos',
    formula: '\\nabla_\\theta \\mathbb{E}[f(\\theta)] \\approx \\frac{1}{N\\sigma} \\sum_{i=1}^N f(\\theta + \\sigma \\epsilon_i) \\epsilon_i, \\quad \\epsilon_i \\sim \\mathcal{N}(0, I)',
    concept: 'Algoritmo de otimização estocástica que estima o gradiente de recompensa espalhando uma nuvem gaussiana de perturbações em torno de um genoma central único.',
    examples: '• <strong>População N=50 a 100:</strong> perturbações simétricas antitéticas.<br>• <strong>Ruído de Exploração σ=0.05 a 0.10:</strong> amplitude das perturbações gaussianas.<br>• <strong>Taxa de Aprendizagem α=0.01 a 0.05:</strong> tamanho do passo na direção do pseudo-gradiente estimado.',
    generalExpectation: 'No geral, é altamente paralelizável e converge de forma contínua e suave, aproximando o comportamento de métodos de gradiente de política (RL) sem necessitar de backpropagation.',
    simulationSpecific: 'No Furuta, o OpenAI-ES escala perfeitamente em modo Turbo com Web Workers porque não requer cálculos de recombinação sexual entre indivíduos.',
    proTip: 'Usa OpenAI-ES quando quiseres uma convergência linear suave e sem saltos bruscos na aptidão.'
  },

  neat: {
    title: 'NEAT (NeuroEvolution of Augmenting Topologies)',
    category: 'Algoritmos Genéticos',
    formula: '\\delta = \\frac{c_1 E}{N} + \\frac{c_2 D}{N} + c_3 \\cdot \\bar{W}',
    concept: 'Algoritmo genético pioneiro de Stanley & Miikkulainen que evolui tanto os pesos como a própria topologia da rede neuronal, começando com conexões mínimas e adicionando neurónios e sinapses incrementalmente.',
    examples: '• <strong>Geração 0:</strong> rede minimalista direta ligando os sensores diretamente à saída de voltagem.<br>• <strong>Mutações Estruturais:</strong> probabilidade de criar um novo neurónio no meio de uma sinapse existente ou ligar dois nós desconectados.<br>• <strong>Especiação:</strong> protege inovações topológicas embrionárias em nichos genéticos para não competirem prematuramente com redes já maduras.',
    generalExpectation: 'No geral, o princípio da "complexificação mínima" encontra arquiteturas compactas e eficientes sem desperdiçar neurónios redundantes.',
    simulationSpecific: 'O NEAT consegue resolver o pêndulo de Furuta com apenas 2 a 4 neurónios ocultos, produzindo um controlador ultra-leve de altíssima eficiência.',
    proTip: 'Ativa o NEAT e observa o Diagrama Sináptico: verás novas conexões e nós a brotarem dinamicamente conforme as gerações avançam!'
  }
};
