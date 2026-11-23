# Releases oficiais e guia Atualizações — RDV Bus Studio Desktop

## Funcionamento
O botão **Atualizações** já consulta `https://api.github.com/repos/ismaelrdv2/rdv_bus_graphic/releases?per_page=20` no início do aplicativo e sob demanda. Não identifica artefatos efêmeros de GitHub Actions.

A partir da Alpha 9.3.11, o workflow `.github/workflows/desktop-build.yml` possui um job de publicação controlado por **tags `v0.1.0-alpha.*`**, que só cria uma GitHub Release se:
1. A tag corresponde exatamente à versão de `package.json`;
2. O commit de origem está integrado à `main`;
3. Linux AppImage e Windows NSIS passaram em todos os testes e tiveram os dois pacotes gerados;
4. O GitHub Actions encontra ambos os arquivos e publica a Release com `SHA256SUMS.txt`.

## Como publicar
- Primeiro integre a PR do Chroma Key, depois a PR de melhorias no canal Atualizações.
- Verifique o último workflow da `main` antes de liberar.
- No GitHub, crie a tag `v0.1.0-alpha.9.3.11` **no commit da main** onde `package.json`, `src/lib/types.ts` e `tauri.conf.json` registram essa versão.
- O workflow de push da tag compila os dois sistemas e publica os executáveis automaticamente na Release oficial.
- A seção Atualizações da versão anterior oferecerá um link quando a versão da Release for superior à instalada.

**Distribuição assistida:** no Windows, execute o NSIS sobre o aplicativo anterior; no Linux, baixe e substitua manualmente a AppImage. O botão **não instala nem remove** executáveis automaticamente nesta fase. Para um instalador in-app confiável no Linux/Windows ainda é necessário implementar o plugin updater Tauri, assinar pacotes e validar a cadeia de confiança.

O Android tem repositório **privado** e fluxo próprio de assinatura persistente. Suas versões são publicadas em índice JSON separado no repositório público Desktop. Siga `RDV-Bus-Studio-Mobile/docs/ASSINATURA_E_ATUALIZACOES.md`.

## Pendente
A geração de MP4 Chroma Key foi aprovada pelo usuário em 23/11/2026; validar o resultado dentro do editor, inclusive halos nas bordas e brilho, permanece pendente na issue #14.
