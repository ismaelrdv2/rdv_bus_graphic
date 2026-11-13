# TESTE DE ANIMAÇÕES — recuperação do RDV Bus v6 / WebApp 60 FPS

**Status:** experimental; não integrar à branch `main` até aprovação visual do usuário.

## Fontes analisadas
- `pacote_grafico_rdv_bus_v6.zip`: `rdv_pacote/rdv_anim.py` (motor Python original).
- `RDV_Bus_WebApp_CORRIGIDO_60FPS.zip`: `RDV_Bus_WebApp/renderer.js`.
- `RDV_Bus_WebApp_0.10.html`: funções `buildLabelAnim`, `labelAnimationFrame`, `fichaAnimationFrame` e `freeAnimationFrame`.

## Experimento
- Etiquetas Clássico 0.14 e cartelas clássicas: revelação horizontal suave do painel em **0,40 s**, filete dourado independente entre **0,10 e 0,55 s** com halo, ícone em escala elástica **0,28 a 0,63 s**, legenda **0,38 a 0,68 s**, texto **0,46 a 0,80 s**.
- Reflexo luminoso das cartelas: efeito existente preservado; sua janela de passagem mantém a faixa de aproximadamente **0,55–1,15 s**, recortada na própria etiqueta.
- Ficha técnica lateral Clássico: painel **0,55 s**, título começa em **0,40 s**, linha em **0,50 s**; valores revelados individualmente a cada **90 ms**. Duração da entrada **0,55 + 0,09×n + 0,40 s**, saída **0,60 s**.
- Ficha técnica inferior em retrato: campos sequenciais com a mesma cadência, painel vindo de baixo e revelação de linha independente.
- Logomarca/imagem de canto Clássico: entrada de **0,65 s**, saída de **0,45 s**, escala **86% → 100%**, deslocamento de **30 px**.
- Para preservar a composição atual com várias camadas, as animações usam a **duração global do projeto**. Quando há muitas fichas técnicas, a permanência resultante é menor que no legado; isso é intencional nesta fase e exige validação visual.
- As imagens em escala SVG são aproximações vetoriais e não reproduzem o filtro Pillow pixel a pixel.
- Não altera o estilo Studio, os presets de cor, a escolha de formatos, o estado de projetos, o gerador FFmpeg Desktop nem o codificador MP4 Mobile.

## Instalação segura
- Desktop: nome de pacote **RDV Bus Studio - Animacoes TESTE**, identificador `com.rdvbus.studio.animationtest`.
- Android: aplicativo **RDV Bus Studio Animações TESTE**, pacote `br.com.rdvbus.studio.animationtest`. Instalável ao lado do app Mobile regular; tem armazenamento próprio de projetos.
- Versão sem mudança: **Desktop 0.1.0-alpha.9.3.8**, **Mobile 0.1.0-alpha.3.7**.

## Protocolo de teste
1. Abrir as versões normais e experimentais lado a lado (ou alternadamente).
2. Na opção **Clássico 0.14**, gerar uma etiqueta com ícone e dois textos. Observar quadros em 0 / 0,10 / 0,28 / 0,38 / 0,46 / 0,55 / 0,63 / 0,80 / 1,15 segundo.
3. Testar a ficha lateral à esquerda e à direita, preferencialmente com 2, 4 e 6 campos preenchidos.
4. Testar ficha inferior retrato e logo de canto.
5. Comparar transparência, recortes, intensidade do brilho, duração de entrada e de saída, em prévia e em vídeo 60 FPS.
6. Confirmar que os elementos Studio e os arquivos de projeto anteriores continuam funcionando.
7. Só aprovar a integração à `main` se esses testes visuais forem satisfatórios.

**Observação:** o teste automático verifica as curvas numéricas e a compilação; a fidelidade visual final depende da comparação dos vídeos reais.
