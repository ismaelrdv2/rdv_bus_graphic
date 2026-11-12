# Compilação RDV Bus Studio Desktop via GitHub Actions

Este workflow é uma **prova de compilação** do código-fonte original 0.1.0-alpha.9.2. Não altera o motor de exportação de vídeo, a identidade visual, as animações nem o formato de projetos.

## Execução

1. Abra a aba **Actions** do repositório Desktop no GitHub.
2. Selecione **RDV Bus Studio Desktop — AppImage e Windows EXE**.
3. Para executar manualmente, clique em **Run workflow** e selecione a branch `main`.
4. Aguarde os dois jobs: **Linux x86_64 — AppImage** e **Windows x64 — NSIS**.
5. Se terminarem em verde, abra a execução e baixe os três artefatos (AppImage, instalador EXE, EXE direto experimental).
6. Se um job falhar, abra a etapa vermelha e capture as últimas 30 linhas do log para diagnóstico.

O workflow também inicia automaticamente quando os arquivos do código são enviados à branch `main`. Commits exclusivos de documentação Markdown não disparam a compilação.

## Ambiente

- Linux: GitHub Actions `ubuntu-22.04` com WebKitGTK 4.1, libayatana-appindicator, patchelf e toolchain Rust.
- Windows: GitHub Actions `windows-2022` com Rust, Node e NSIS instalado como dependência do Tauri.
- `npm install` é utilizado porque este ZIP **ainda não possui `package-lock.json`**. O `Cargo.lock` também não está no ZIP. É recomendado versionar ambos depois que forem gerados e verificados.

## Limitações conhecidas

- **FFmpeg NÃO está empacotado** na alpha.9.2. Os executáveis podem compilar e abrir, porém a geração de vídeo exige um FFmpeg externo em `PATH` ou apontado por `RDV_FFMPEG`.
- O EXE direto **não é uma distribuição portátil completa garantida**: depende de componentes do Windows (como WebView2) e deve ser testado. O instalador NSIS é o alvo principal.
- AppImages construídos no Ubuntu 22.04 precisam de teste em distribuições alvo, como Debian 12.
- Builds não são assinados digitalmente; sistemas operacionais poderão exibir avisos.
- Artefatos expiram conforme a política de retenção configurada (14 dias).

## Preservação

- Os diretórios `src/` e `src-tauri/src/` vêm intactos do ZIP oficial fornecido para a 0.1.0-alpha.9.2.
- As alterações são apenas o workflow GitHub e este guia de compilação. O comportamento do editor não foi modificado.
