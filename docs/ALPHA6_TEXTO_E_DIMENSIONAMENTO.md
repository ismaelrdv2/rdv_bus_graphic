# RDV Bus Studio — texto formatado, tela inteira e redimensionamento (alpha.6)

## Modos adicionados

- **Ficha técnica → Apresentação → Tela inteira**: título e seis campos em duas colunas no horizontal, uma coluna no vertical. A composição cobre o quadro de vídeo; não altera a estrutura de campos existente.
- **Texto livre → Ficha em tela inteira — 6 campos**: mesmo arranjo com rótulos editáveis.
- **Texto livre → Cartela em tela inteira — título e corpo**: duas áreas distintas; texto do corpo com múltiplos parágrafos, quebra de linha e formatação.
- Permanecem os modelos **Cartela RDV Bus**, **Faixa lateral** e **Ficha compacta alpha.1**.

## Formatação no Texto livre

Selecione Texto livre no painel esquerdo. Nos estilos **Cartela RDV Bus** e **Cartela em tela inteira**, edite `Título` e `Corpo do texto`. Os controles são independentes por área:

- Tamanho em pixels, negrito, itálico, sublinhado.
- Alinhamento do corpo: esquerda, centralizado, direita, justificado (via `textLength` SVG nas linhas quebradas; experimental).
- Marcadores de parágrafo: sem marcador, seta `»`, bolinha `•` e lista numerada.
- Selecione um trecho dentro da caixa Corpo e clique em **Negrito**, **Itálico** ou **Sublinhado** para envolver o trecho em `**...**`, `*...*` ou `__...__`. O SVG exportado interpreta esses marcadores; não usa HTML inserido pelo usuário.
- Os recursos de formato por trecho são básicos: não têm seleção com estilos combinados/aninhados; vários trechos simples por parágrafo são permitidos.

## Rolagem de cartela

- **Sem rolagem**: o corpo aparece dentro da área visível; excesso é recortado, sem deformação.
- **Vertical**: o texto entra por baixo e sobe até sair pela parte superior, usando o tempo da composição.
- **Horizontal**: para cartela compacta, o corpo corre da direita para a esquerda em uma linha (quebras de parágrafo viram separadores).
- A **Velocidade relativa** usa 100% como duração total do percurso no tempo do projeto. Valores abaixo de 100% percorrem menos; acima de 100% terminam antes. Por isso, teste com a duração escolhida antes da exportação.
- O movimento é determinado por `time`, compartilhado entre a pré-visualização SVG e a exportação frame a frame. Continua sujeito ao efeito de entrada/saída que o usuário selecionar.

## Correção do redimensionamento

A alpha.5 aplicava `scale(X,Y)` diretamente ao grupo inteiro. Isso esticava ou espremia as letras quando X e Y eram diferentes.

Na alpha.6, o grupo aplica **apenas translate(X,Y)**. O SVG passa a calcular largura e altura reais de cada caixa e as fontes recebem um fator de tamanho **uniforme** (`sqrt(scaleX × scaleY)`), seguido da medição de largura para reduzir o texto que não couber. Isso preserva as proporções das letras, mesmo mudando somente um eixo. O recorte da área de texto evita vazamentos.

Os painéis em tela inteira ficam fixos nas dimensões do quadro: mude para a versão lateral/cartela se quiser redimensionar a caixa.

## Compatibilidade

Os novos campos JSON são opcionais e validados com defaults. Projetos anteriores continuam usando seus estilos, texto, posição e escalas. Salve uma cópia do projeto antes de realizar testes de migração. O motor SVG → Canvas 2× → FFmpeg e as animações da alpha.4/5 foram preservados.
