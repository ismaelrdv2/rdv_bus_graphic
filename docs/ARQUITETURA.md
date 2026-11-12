# RDV Bus Studio — arquitetura inicial

## Identificação

- Aplicação: RDV Bus Studio
- Versão de desenvolvimento: 0.1.0-alpha.8
- Data: 11 de novembro de 2026
- Repositório: projeto novo e independente do RDV Bus 0.13.x
- Licença: a definir antes de distribuição pública (dependências sob suas licenças próprias)

## Camadas da versão inicial

1. **Editor Svelte** (`src/App.svelte`, `src/components`): interação com usuário, inspetor e timeline.
2. **Modelo de projeto** (`src/lib/types.ts`, `templates.ts`): projeto versionado, elementos, textos e estilos.
3. **Validação** (`validation.ts`): parser defensivo para importação de JSON não confiável.
4. **Cálculo da animação** (`timing.ts`): curva `easeOutCubic`, entrada de 0,8 s e saída de 0,5 s por padrão.
5. **Templates legados** (`LegacyShape.svelte`, `legacy.ts`): SVG por camadas, fichas de tela inteira e rolagem independente por linha, preservando cenas Studio salvas.
6. **Renderização de edição** (`HudShape.svelte`, `ScenePreview.svelte`): SVG com coordenadas físicas de 1920 × 1080 ou 1080 × 1920.
6. **Persistência** (`projects.ts`): diálogo nativo Tauri + plugin filesystem, ou File/Blob do navegador, e autosave local.
7. **Host desktop** (`src-tauri`): integra Tauri 2 com plugins de arquivo e diálogo.

## Princípio da próxima arquitetura

Em uma próxima versão, separar a **cena serializável** do componente Svelte. Um conjunto de comandos de desenho independente deverá produzir SVG tanto para a pré-visualização quanto para o renderizador Rust/resvg. Essa separação evita divergência de aparência e facilita testes pixel a pixel entre PNG e vídeo.

A exportação SVG desta alpha.2 serializa a árvore SVG atualmente renderizada; é uma implementação provisória e **não deve ser usada como motor final de exportação em lote**.

## Modelo JSON

Objeto raiz `RDVProject`:

- `schemaVersion`: número inteiro (1 nesta versão).
- `appVersion`: versão que salvou o projeto.
- `name`, `id`, `createdAt`, `updatedAt`: metadados.
- `canvas`: resolução 1920 × 1080, FPS (30 ou 60), duração em segundos.
- `elements`: coleção de no máximo 64 objetos `HudElement`.

Cada elemento define tipo, textos, estilos, visibilidade, animação, posição e, opcionalmente, uma imagem embutida (Data URI PNG/JPEG/WebP). Arquivos importados são normalizados e validados antes de entrar no estado do editor. Nunca executar JavaScript contido em arquivos de projeto.

## Fluxos

```text
Ação do usuário
    ↓
Componente Svelte (App)
    ↓
Estado imutável RDVProject
    ├── localStorage (autosave provisório)
    ├── JSON arquivo (save/open)
    ├── linha do tempo (tempo atual)
    └── ScenePreview + HudShape (SVG)
          └── exportação SVG do quadro atual (provisória)
```

## Segurança e limites conhecidos

- Acesso ao sistema de arquivos do desktop por seleção explícita em diálogos nativos. Escopos do plugin FS são concedidos pelo diálogo, não por uma permissão de escrita indiscriminada no diretório pessoal.
- Projeto importado passa pelo `validateProject`; schema desconhecido é recusado.
- Imagem de canto aceita somente PNG, JPEG ou WebP e limite de tamanho por imagem.
- A fase alpha utiliza CSP `null` na configuração Tauri para facilitar desenvolvimento. **Requer endurecimento antes de lançamento público**.
- O salvamento automático é opcional/falível, limitado pela quota de `localStorage`; deve ser substituído por autosave atômico no diretório de dados da aplicação em uma próxima versão.
- Nomes longos não contam ainda com layout tipográfico completo; podem ultrapassar as caixas no SVG.
- Não há monitor de tarefas FFmpeg nesta versão.

## Estratégia de testes

1. Testes unitários dos modelos e curvas de animação.
2. Testes de roundtrip de projeto JSON incluindo casos inválidos.
3. Testes de renderização e snapshots (próxima etapa).
4. Testes de formatos com canal alfa e comparações com PNG (alpha.4+).
5. Testes de AppImage Debian 12/CachyOS e Windows (beta).

## Identidade clássica (alpha.2)

A paleta está em `src/lib/brand.ts` e os layouts vetoriais estão em `src/components/HudShape.svelte`. A ficha técnica contém seis campos, faixa lateral completa e direção opcional. `technicalSide`, `line5` e `line6` são opcionais na importação de projetos JSON v1 antigos; a validação preenche os campos ausentes. `slide` é um novo `ElementKind`. Consulte `docs/IDENTIDADE_VISUAL.md`.

A opção de fundo preto/quadriculado da pré-visualização pertence à interface, não ao SVG de saída. A orientação é serializada em `canvas.width`/`canvas.height`; por ora só são admitidos os pares 1920×1080 e 1080×1920.

## Exportação experimental da alpha.3

Fluxo: composição SVG no Svelte → imagem PNG via Canvas do WebView → base64/IPC → comando `video_frame` em Rust → pipe `image2pipe` do FFmpeg → MOV/MKV/WebM. Um quadro por vez, com limite de tamanho e comando de cancelamento. Não há ainda renderização nativa resvg nem FFmpeg embutido.
