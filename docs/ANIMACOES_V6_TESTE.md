# Animação clássica v6 — motor compartilhado com Studio

O usuário aprovou o vídeo de teste das animações v6 em 12/11/2026. A animação agora é adotada nos dois renderizadores (Clássico e Studio), mantendo as respectivas geometrias.

## Princípio da arquitetura
- **Modelo**: etiqueta curta, barra, ficha, slide, cartela, imagem de canto.
- **Padrão visual**: `visualPreset='legacy'` para o desenho Clássico 0.14 ou `'studio'` para o desenho moderno, independentemente do modelo.
- **Animação**: `animation='legacy'` ativa a mesma sequência temporal recuperada do pacote v6 nos dois desenhos. Outros estilos (`fade`, `slide`, `none`) permanecem sob o motor normal. Novas transições serão acrescentadas ao seletor futuramente.

## Curvas incorporadas
- Painel da etiqueta: revelação esquerda → direita em **0,40 s**, com borda suave.
- Filete dourado: **0,10–0,55 s**, com halo no Clássico.
- Ícones: escala elástica iniciando aos **0,28 s**, finalizando aos **0,63 s**.
- Rótulo: **0,38–0,68 s**; texto: **0,46–0,80 s**.
- Fichas técnicas: entrada proporcional à quantidade de campos (`0,55 + 0,09 × n + 0,40` s), saída **0,60 s**, valores com defasagem de **90 ms**.
- Imagem de canto: escala **86% → 100%**, deslocamento de **30 px**.
- A duração geral permanece configurada no projeto; o motor de animação é determinístico por quadro, sem temporizadores independentes.

## Diferenças efetivas do desenho Studio
- Etiqueta curta moderna com bordas arredondadas; barras médias/longas com recorte próprio e suporte à rolagem horizontal por linha.
- Apresentação em barra e em tela cheia com geometria Studio, sem redirecionamento automático ao Clássico.
- Fichas técnicas lateral, compacta, em tela cheia e inferior retrato com aparência própria.
- Cartelas de localização, data, linha de ônibus, motorista e crédito mantém ícones Studio e animação comum.
- Imagem de canto no Studio mantém moldura moderna; Clássico mantém imagem direta.

## Compatibilidade
- Nenhuma alteração no schema do projeto nem na numeração: Desktop **0.1.0-alpha.9.3.8**; Mobile **0.1.0-alpha.3.7**.
- Sem mudanças no FFmpeg, AppImage, instalador Windows, Android MediaCodec ou localização dos arquivos.
- Foram recuperados nomes, appId e artefatos normais, substituindo as identificações temporárias do teste.
- O sistema de abas Desktop continua em PR separado; não faz parte da promoção das animações.

## Critérios de regressão
1. `npm run check` e testes numéricos das curvas de referência.
2. Prévia e exportação usam os mesmos atributos e cálculos SVG.
3. Testar a alternância Clássico/Studio em etiquetas, barras, fichas e slides.
4. Testar opções `fade`, `slide`, `none`, movimento e rolagem.
5. Conferir transparência e quadros em 0, 0,10, 0,28, 0,38, 0,46, 0,55, 0,63, 0,80 e 5,30 s, a 60 FPS.

O motor está preparado para adicionar transições inéditas depois, sem inventar ou ativar estilos que ainda não foram implementados.
