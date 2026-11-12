# Redimensionamento e estilos do Texto livre — 0.1.0-alpha.5

## Dimensionamento na cena

1. Selecione um elemento na biblioteca de camadas ou clicando nele no monitor.
2. Arraste qualquer alça dourada do contorno. As alças laterais mudam uma dimensão; as dos cantos, duas.
3. Segure **Shift** ao arrastar um canto para preservar a proporção (exceto na faixa técnica ancorada).
4. O painel de propriedades também permite definir **Escala horizontal (%)** e **Escala vertical (%)** de 20 a 400 e restaurar a escala a 100%.

A dimensão visual usa transformações vetoriais do SVG (`scaleX`/`scaleY`) e não imagens previamente rasterizadas, preservando a qualidade da exportação 2×. A largura base e a fonte continuam editáveis separadamente. A seleção e suas alças são excluídas dos arquivos SVG e do vídeo.

**Ficha técnica:** a faixa clássica continua presa ao lado configurado (esquerdo/direito) e ao topo, para não perder o alinhamento. Por isso, apresenta apenas alças que ajustam largura e altura a partir dessa âncora. Outros elementos podem mover-se e ser redimensionados livremente dentro do monitor.

## Texto livre — estilos

No painel de **Propriedades → Conteúdo → Estilo do texto livre**, escolha:

- **Cartela RDV Bus (atual):** o formato disponível na alpha.4; título, texto principal e complementar.
- **Faixa lateral — ficha clássica:** gradiente roxo, borda inclinada dourada, seis valores e respectivos rótulos editáveis. O lado esquerdo ou direito pode ser alternado.
- **Ficha compacta — alpha.1:** painel retangular da alpha.1 com barra vertical dourada, título e quatro pares de rótulo e valor, todos editáveis.

Ao trocar o estilo, os textos já existentes são preservados. A posição, a largura e a escala passam a valores adequados ao formato escolhido; personalize-os depois. Os seis rótulos personalizados ficam gravados no projeto JSON; só os quatro primeiros são mostrados na ficha compacta.

## Compatibilidade

O esquema de projeto continua em `schemaVersion: 1`. `scaleX` e `scaleY` ausentes em projetos antigos recebem 1. Projetos antigos sem `freeTextStyle` continuam com a cartela clássica. Não há alteração na exportação FFmpeg e no supersampling 2×.

## Pontos ainda não confirmados

Os módulos centrais são verificáveis com `tsc` e os testes Python. Uma compilação final completa de Svelte/Tauri só pode ser validada num ambiente com pacotes npm e Rust instalados. Em particular, a interação visual das alças deverá ser testada no WebKitGTK e no Chromium.
