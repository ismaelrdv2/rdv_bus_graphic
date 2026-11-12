# RDV Bus Studio 0.1.0-alpha.7 — resgate do RDV Bus 0.14.1-rev3

## Fontes examinadas

- AppImage distribuído pelo usuário: `RDV Bus_0.14.1-rev3_amd64.AppImage`.
- Código HTML/JavaScript embutido no AppImage, especialmente os blocos `drawFichaLateral`, `drawFichaTela`, `fichaAnimationFrame`, `buildLabelAnim`, `freeAnimationFrame`, `freeSlideLayers`, `freeBarLayers` e `geomTexto`.
- Exemplos de vídeo e ficha técnica que o usuário enviou anteriormente.

A integração é **reimplementação declarativa em SVG**, e não cópia direta do motor de Canvas antigo. Mantém a nova arquitetura, o formato JSON v1 e o pipeline de exportação com supersampling 2×. Os tempos e comportamentos são reproduções orientadas pelas funções antigas; pequenas diferenças de fontes, animação luminosa e espaçamento podem existir até uma comparação lado a lado no Kdenlive.

## Padrão visual

- Painéis em roxo profundo com linha roxa e filetes dourados.
- Ficha técnica com largura lateral, borda diagonal, títulos, linhas, marcadores duplos e assinatura RDV BUS.
- Etiquetas e barras com recortes e bordas clássicas, destacando entrada do painel e aparecimento do texto.
- Logo de canto em visual clássico sem moldura extra do Studio.
- Seletor **Padrão visual** por elemento: **Clássico 0.14** / **Studio**.
- Seletor **Entrada e saída**: **Animação original 0.14 — por camadas** / outros modos. Para preservar projetos antigos, o preset é Studio na validação de JSONs anteriores.

## Ficha técnica em tela inteira (original 0.14)

- Propriedades → **Apresentação da ficha** → **Original 0.14 · Tela inteira com cartões**.
- Tela horizontal: quatro colunas, até duas linhas de cartões para seis campos; vertical: duas colunas, até três linhas.
- Fundo roxo sobreposto, cantos dourados, linha longa abaixo do título e campos em cartões com detalhes visuais.
- Animações independentes para painel, título, filete, campos sequenciais e rodapé.

A outra opção, **Ficha técnica — tela inteira (Studio)**, permanece disponível. O original aceitava oito campos; nesta alpha há seis campos por elemento. A expansão para oito campos não foi incorporada para evitar alterações transversais no editor sem testes de migração.

## Texto livre — modos originais

- **Original 0.14 · Etiqueta** — placa compacta.
- **Original 0.14 · Barra metade** — placa com largura de aproximadamente metade da composição.
- **Original 0.14 · Barra larga** — placa horizontal extensa.
- **Original 0.14 · Apresentação em barra** — título e corpo em cartela horizontal.
- **Original 0.14 · Apresentação em slide** — tela inteira com título, filete e cartão de corpo.

Todos ficam disponíveis ao lado dos modos Studio, ficha lateral e ficha compacta da alpha.1.

### Rolagem original por linha

Nos três primeiros modos do Texto livre:

- Linha 1: **Parada** / **Rolando ◀**.
- Linha 2: **Parada** / **Rolando ◀**.
- Velocidade em **pixels por segundo** (30–1400 px/s).
- Número de **repetições** (1–20) e distância entre repetições.
- Botão **Ajustar duração para completar a rolagem**, que ajusta a duração GLOBAL da composição, até o limite de 30 s desta alpha. Antes de usar, confirme a velocidade e o número de repetições.

Os dois seletores de linha são independentes, e os quadros são calculados em função do tempo da composição, tanto na prévia quanto na exportação. A rolagem vertical e horizontal do Studio ainda está disponível nas cartelas Studio.

## Compatibilidade de projetos

- Schema `1`, sem mudança de formato principal.
- Campos opcionais novos `visualPreset`, `animation='legacy'`, novos `freeTextStyle`, `technicalLayout='legacyFullscreen'`, e controles de rolagem no objeto `richText`.
- O validador mantém `visualPreset='studio'` em projetos antigos sem o novo campo.
- Novos elementos são iniciados com padrão visual clássico e animação por camadas (exceto logo de canto, cuja animação atual continua Fade).

## Limitações e testes pendentes

- A base Svelte/Tauri deve ser compilada e conferida no Linux. Neste ambiente o npm não instala dependências por falha de DNS.
- A animação antiga foi reconstruída pela sequência temporal de camadas, não por rasterização bit a bit do motor original. A faixa luminosa da etiqueta é uma aproximação vetorial.
- Existem seis campos na ficha técnica desta alpha; a antiga suportava até oito.
- A duração total do projeto é compartilhada entre todos os elementos. Ajustar a rolagem altera a duração global.
- Não houve alteração nos codecs ou no mecanismo de supersampling da alpha.4/alpha.6.
