# Integração RDV Bus Studio + Kdenlive — Desktop Alpha 9.3.12

## Objetivo e escopo
Preparar sobreposições animadas produzidas no RDV Bus Studio para importação no Kdenlive. A integração é **não destrutiva**: não modifica projetos de edição do usuário, não instala plugins no Kdenlive e não inicia aplicações sem solicitação.

O Kdenlive utiliza o mecanismo MLT e pode importar vídeos com alfa, imagem sequencial PNG e clipes MLT de biblioteca. Gerar um projeto completo `.kdenlive` automaticamente fica pendente de testes com arquivos reais da versão do editor.

## Desktop Linux/Windows — botão Kdenlive
1. Abra o RDV Bus Studio e conclua a cartela ou etiqueta.
2. Clique **Kdenlive** na barra superior: seleciona MOV QuickTime Animation (QTRLE), fundo transparente e supersampling 2×.
3. No diálogo, mantenha ativada **Preparar clipe para Kdenlive (.mlt + guia ao lado do vídeo)** e escolha a pasta de exportação.
4. Ao concluir, a pasta terá os seguintes arquivos, com o mesmo nome-base:
   - `Meu_Projeto.mov`: mídia real com transparência, editável no Kdenlive;
   - `Meu_Projeto.rdv-kdenlive.mlt`: clipe MLT auxiliar, para testar a Biblioteca do Kdenlive;
   - `Meu_Projeto.rdv-kdenlive-LEIA-ME.txt`: instruções de importação, FPS, número de quadros e transparência/Chroma Key.
5. No Kdenlive crie um projeto com **1920×1080 ou 1080×1920**, **30 ou 60 FPS** igual ao exportado. Adicione primeiro o **MOV** à Cesta de Projeto e coloque na faixa de vídeo superior (V2), sobre as imagens em V1. A faixa inferior continua sendo a mídia original.
6. O canal alfa deve permitir enxergar o vídeo de V1 através das áreas transparentes. Se não houver composição, habilite/adicione a composição entre as faixas do projeto.

A cada nova exportação com o mesmo nome, os arquivos auxiliares ganham um sufixo diferente e não sobrescrevem arquivos anteriores. O arquivo `.mlt` é uma integração experimental de biblioteca; seu caminho de mídia é absoluto, apontando para o MOV exportado. Não mova ou apague o MOV depois de importar; se mudar de computador, faça a religação da mídia no Kdenlive. **O fluxo principal confiável é importar diretamente o MOV**.

### Chroma Key MP4
Se escolher MP4/H.264 com verde puro `#00FF00` ou azul puro `#0000FF`, o arquivo não contém canal alfa. Coloque em V2, aplique o efeito **Chroma Key: Basic** e selecione exatamente a cor do fundo. Ajuste o controle Variance para eliminar o fundo sem perder detalhes do primeiro plano; se houver halos, utilize **Chroma Key: Advanced** e/ou correção de spill. O H.264 4:2:0 pode introduzir halos cromáticos, então priorize MOV RGBA na saída Desktop.

### Android Mobile Alpha 3.12
O modo ZIP PNG transparente inclui:
- `frames/frame_000001.png` ... `frames/frame_NNNNNN.png`;
- `IMPORTAR_NO_KDENLIVE.txt`, com instrução de **1 quadro por imagem** e mesmo FPS;
- `rdv-kdenlive.json`, perfil da sequência (largura, altura, quadros, FPS, canal alfa).

No Kdenlive, use **Adicionar sequência de imagens**, selecione o primeiro PNG e configure duração de cada imagem como **1 quadro** sem dissolvência. Arraste a sequência como clipe para V2. Não aplique Chroma Key à sequência transparente.

O modo MP4 Chroma Key do Android continua disponível para quem prefere um único arquivo, com aplicação manual do efeito no Kdenlive.

## Testes de aceitação (Kdenlive instalado no Acer Debian via XFCE/XRDP)
- Abrir MOV QTRLE na Cesta de Projeto, usar acima de um vídeo real, conferir bordas/diagonais sem serrilhado e ausência de halos, inclusive durante brilho/transição.
- Verificar duração real: 30/60 FPS, mesmo número de quadros, primeiro e último quadro, sem congelamento no final.
- Testar importação `.mlt` pela biblioteca; comparar com importar MOV diretamente. Se houver incompatibilidade de versão MLT, o MOV continua funcionando e a integração `.mlt` deve permanecer experimental.
- Testar o MP4 verde e azul com Chroma Key Basic e Advanced, especialmente contornos do texto e sombras.
- Testar ZIP PNG RGBA do Android em 16:9 e 9:16, duração 1 quadro por PNG e sincronização.
- Testar com o Kdenlive via RDP e observar que prévia remota e desempenho de codificação podem ser diferentes do resultado renderizado local.

## Limites
- Nenhuma promessa de abertura automática ou edição da timeline de um projeto Kdenlive existente.
- Arquivos .mlt e a importação em Kdenlive aguardam confirmação no editor; os testes automatizados verificam XML, perfil e duração, não a composição visual.
- Uma instalação Kdenlive no Acer não é pré-requisito para gerar os arquivos de integração.
- O usuário controla os caminhos, opções de exportação e permissões. Nenhum arquivo é enviado a serviços externos automaticamente.

Fontes: documentação oficial do Kdenlive sobre detalhes de projetos, biblioteca MLT, canais alfa, sequência de imagens e efeitos Chroma Key.
