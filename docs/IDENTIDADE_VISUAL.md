# Identidade Visual — RDV Bus Classic

Documento inicial criado a partir das imagens e dos vídeos de referência enviados pelo autor em 11/11/2026. A fidelidade estética deverá ser refinada em testes lado a lado. Não se trata de uma extração automática exata dos arquivos originais.

## Paleta

| Nome | Hex | Aplicação |
|---|---|---|
| Dourado | `#E2BA5A` | Títulos, filetes, setas e cantos |
| Dourado claro | `#F0CF79` | Seleção e destaques |
| Roxo profundo | `#200F31` | Painéis gráficos |
| Roxo escuro | `#150A23` | Gradiente e extremidades |
| Roxo do contorno | `#57277E` | Linhas, separadores e bordas |
| Lilás | `#B98BE8` | Labels e assinatura |
| Branco suave | `#F6F0FD` | Valores e texto principal |
| Lilás suave | `#BDA4D9` | Detalhes auxiliares |

Fonte prevista para a próxima etapa: selecionar e empacotar legalmente família tipográfica compatível com a referência. Na alpha.2, a renderização usa `Inter, Arial, sans-serif` como fallback. Sem fontes externas/CDN.

## Ficha técnica

- Composição em overlay transparente, ocupando a altura do quadro na horizontal ou vertical.
- Painel roxo com gradiente suave, face lateral inclinada, filete dourado e linha lilás no limite.
- Título em caixa alta, dourado, espaçamento entre letras e sublinhado parcial.
- Seis pares label/valor (carroceria; modelo de carroceria; chassi; modelo de chassi; empresa; prefixo).
- Setas duplas douradas à esquerda do texto (dentro do painel) e separadores roxos.
- Marca `RDV BUS` em lilás no rodapé, seguida de um pequeno detalhe geométrico dourado.
- Lado esquerdo/direito definido na propriedade do elemento; a propriedade de posição continua editável.

## Créditos, texto livre e slide

- Cartões de base roxa, contorno roxo médio e filetes diagonais dourados nas extremidades.
- Informações em branco suave e labels em lilás; cantos moderadamente arredondados.
- O slide é um modelo próprio; não substitui o Texto livre.

## Editor

- Painéis escuros com destaque dourado, mas o editor não é parte da composição exportada.
- Fundo preto como pré-visualização padrão, com opção quadriculada.
- O SVG exportado usa somente os elementos do quadro, **sem fundo preto nem marcações de seleção**.

## Próximas validações visuais

1. Comparar lado a lado a ficha B 692 (esquerda) e a ficha 1171 (direita) com o template gerado.
2. Ajustar medidas tipográficas com a fonte final licenciada.
3. Melhorar posicionamento e quebra de textos longos, mantendo bordas sem serrilhado.
4. Ajustar curvas e duração das animações com base nos vídeos de referência.
5. Verificar fidelidade do SVG ao converter quadros para vídeo quando resvg/FFmpeg estiverem disponíveis.
