> A alpha.4 corrigiu qualidade/transições (validadas no Kdenlive). A alpha.5 adicionou redimensionamento e estilos livres. A alpha.6 acrescentou modo tela inteira, formatação/rolagem de Texto livre e fontes sem deformação em escalas não uniformes. O motor Rust/resvg continua planejado.

# Roadmap — RDV Bus Studio

- [x] **0.1.0-alpha.1 — Fundação:** interface nova, 8 tipos de elemento, pré-visualização SVG, inspector, posição, animação inicial, JSON e quadro SVG.
- [x] **0.1.0-alpha.2 — Identidade clássica:** tema roxo/dourado, ficha técnica de seis campos e faixa lateral, cartões HUD, Slide próprio, modo horizontal/vertical, changelog por versão.
- [ ] **Futuro — Motor gráfico:** separar cena e UI, Rust/resvg, PNG RGBA, testes de antialiasing e fidelidade visual de fontes.
- [ ] **Futuro — Animações avançadas:** linhas do tempo independentes, sequência PNG, 30/60 FPS, ajustes finos de movimentos clássicos.
- [~] **0.1.0-alpha.3/alpha.4 — FFmpeg experimental:** MOV QTRLE/ProRes 4444, MKV FFV1 e WebM VP9 alfa; exportação funcional reportada no Kdenlive. Empacotamento do FFmpeg pendente.
- [x] **0.1.0-alpha.5 — Editor ampliado:** redimensionamento visual, escalas X/Y, Texto livre com dois templates históricos, menus de contraste corrigido (validação visual pendente).
- [x] **0.1.0-alpha.7 — Texto livre avançado:** ficha/tela inteira, áreas de título e corpo, formatação, marcadores e rolagem. Corrige fontes deformadas em resize não uniforme. Testes da interface e exportação ainda pendentes no Linux do usuário.
- [ ] **0.1.0-beta.1 — Recursos completos:** exportação por aba/lote, ZIP por subpastas, saídas configuráveis, presets editáveis, UX refinada.
- [ ] **0.1.0 estável — Distribuição:** Linux AppImage e Windows EXE/portátil, FFmpeg incorporado, testes em máquinas reais, documentação final.
- [ ] **Android futuro:** validar arquitetura compartilhada, desempenho e codificação nativa.

O cronograma é propositivo: só marcar versões como concluídas quando houver código entregue. A alpha.4 foi validada visualmente no Kdenlive pelo usuário. A alpha.5 e alpha.6 ainda requerem testes aprofundados na GUI do Tauri.

- [~] **0.1.0-alpha.3 — Correções + vídeo experimental:** ajuste de largura/fonte e integração Tauri+FFmpeg implementados em código; compilação nativa e testes com arquivos reais pendentes.
