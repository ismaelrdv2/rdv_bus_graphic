# Diagnóstico de qualidade de vídeo — alpha.4

## Resultado do vídeo enviado

Arquivo analisado: `Meu_projeto_RDV_Bus.webm`.

- 1920×1080, 60 FPS, 5,300 s, 318/318 quadros presentes.
- VP9 `yuva420p` (alfa separado), `alpha_mode=1`.
- Decodificação nativa do FFmpeg lê YUV 4:2:0 e não compõe o alfa corretamente: pode mostrar painel quase opaco durante a transição.
- Decodificador `libvpx-vp9` recuperou os canais RGBA; alfa máximo dos quadros de amostra: 0 na abertura, 16 no quadro 1, 173 no quadro 15, 255 no quadro 48, 224 no quadro 303 e 25 no quadro 317.
- Causa específica da opacidade residual final: alpha.3 exporta o último instante como `(frames-1)/fps`, que não é igual à duração. A alpha.4 inclui `duration` no último quadro.

## Caminho de qualidade

1. Testar `MOV QuickTime Animation` com saída transparente e `2×` para evitar subamostragem de cores.
2. Comparar com o WebM e usar um editor que respeite o canal alfa separado.
3. Para diagnóstico em players, exportar fundo preto (perde transparência).
4. Planejar migrar o raster SVG para Rust/resvg com amostragem determinística, eliminando dependências do WebView para renderizar.

Nota: chroma 4:2:0, escalonamento e decodificadores do player podem produzir serrilhado adicional. Sem perdas no VP9 não significa RGBA 4:4:4 sem perdas.
