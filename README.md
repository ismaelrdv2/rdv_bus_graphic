# RDV Bus Studio — 0.1.0-alpha.9.3.8

> **Alpha.8:** edição de textos por clique diretamente na pré-visualização, mini-barra flutuante de formatação e ícones clássicos maiores/centralizados. Mantidos os presets e o sistema de exportação 2×. Veja `CHANGELOG.md`.


**Nova geração do RDV Bus, reconstruída do zero.** Editor desktop de elementos HUD para vídeos de ônibus, com interface Svelte 5 + TypeScript, Vite e Tauri 2 (Rust).

> Estado: **alpha experimental**, ainda não substitui a versão 0.13.x. A exportação de vídeo usa **FFmpeg pelo aplicativo Tauri**, com renderização de quadros pelo Canvas do WebView; o renderizador nativo **resvg ainda não está implementado**. No navegador a exportação de vídeo não é suportada.

## Alinhamento adaptativo da ficha à direita (alpha.9.3.8)

A ficha técnica lateral direita usa agora uma **margem móvel em relação à diagonal**, calculada em cada categoria da ficha. O título e os textos acompanham a inclinação do painel, com chevrons afastados da borda e largura de leitura protegida. Não há alteração na ficha lateral esquerda. Este ajuste foi baseado no SVG de 1920 × 1080 exportado pelo usuário (projeto 4129).

## Brilho em cartelas e diagonais (alpha.9.3.7)

Na aba **Animação**, a varredura de brilho atua apenas nas cartelas compactas. As fichas em barra e tela cheia não recebem essa varredura. Nas fichas técnicas em barra, **Brilho nas linhas diagonais** permanece opcional e oferece **Intensidade: 50% a 300%**, padrão mais evidente de 170%. A ficha lateral à direita ganhou maior margem para os textos, incluindo títulos, rótulos e valores.

## Brilhos independentes (alpha.9.3.6)

Na aba **Animação**, altere **Brilho após a entrada** (ligado por padrão) e, nas fichas em barra, **Brilho nas linhas diagonais** (desligado por padrão). Os efeitos são independentes, aparecem uma única vez e são limitados ao contorno real da arte. Valem para Clássico/Studio, barras laterais/inferiores e tela inteira.

## Personalização por abas (alpha.9.3.2)

Selecione uma camada e use as abas **Conteúdo**, **Tipografia**, **Cores**, **Dimensões**, **Animação** e **Paleta**. No painel do projeto, há **Vídeo** e **Paleta**. As configurações de título, corpo e texto secundário continuam independentes; a paleta mantém os controles RGB/HEX.

As **cartelas compactas** de localização, data, linha, motorista, crédito e etiqueta de texto livre usam por padrão o tamanho da cartela de crédito de filmagem: **550 × 102 px**. Para cartelas antigas já redimensionadas, escolha **Dimensões > Usar tamanho da cartela de créditos**, ou **Padronizar todas as cartelas do projeto**. Essa ação não modifica os modos especiais (tela inteira, fichas técnicas, slides e barras).

## Correção da alpha.9.2 — animação dos textos no modo vertical

A alpha.9.1 podia exportar apenas o painel, o título e o rodapé da ficha técnica inferior 9:16, deixando os campos ocultos. Os progressos das linhas agora são recalculados explicitamente a cada mudança no tempo de animação. Corrigimos o mesmo padrão nas fichas clássicas lateral e de tela inteira. **O renderizador e os formatos de vídeo permanecem inalterados.**

**Teste recomendado:** no Tauri, crie um projeto 1080 × 1920 com Ficha técnica em modo faixa, mova a linha do tempo entre 0 s, 0,4 s, 1,5 s, 2,5 s, 5,1 s e 5,3 s e observe entrada/permanência/saída dos seis campos. Exporte em 1080×1920/60 FPS (Alta — 2×) e confira em Kdenlive. Repita com Texto livre → Faixa lateral — ficha clássica.

## Edição direta na pré-visualização — alpha.8

1. Pare a animação sobre um quadro em que o texto esteja visível.
2. **Clique diretamente no título, valor ou rótulo** do elemento. O texto se torna editável, e a barra flutuante aparece próxima ao ponto clicado. Arraste em uma área vazia do painel para mover o item.
3. Digite para alterar o conteúdo; clique em **✓** ou pressione **Enter** para concluir uma linha. No corpo de vários parágrafos, use **Ctrl+Enter** para concluir.
4. **B**, **I**, **U** alteram negrito, itálico e sublinhado. Com parte do corpo rico selecionada, formatam somente essa parte. Os atalhos **Ctrl+B**, **Ctrl+I** e **Ctrl+U** também funcionam.
5. A caixa numérica controla o tamanho da fonte; alinhamento e marcadores aparecem para corpo rico com várias linhas.
6. Use **×** ou **Esc** para cancelar o texto da edição em andamento. As propriedades do projeto permanecem editáveis pelo painel à direita.

**Detalhes:** a formatação de palavras individuais requer um estilo de Texto livre com corpo rico; os outros elementos suportam formatação de cada campo completo. A área de texto e a barra flutuante são ferramentas exclusivas do editor, não aparecem na exportação SVG ou vídeo. O botão de logomarca permanece no painel de propriedades.

## Novidades da alpha.7 — padrões visuais e animações do RDV Bus 0.14

- Visual clássico reconstruído a partir do AppImage 0.14.1-rev3, sem alterar a interface do Studio.
- Animação original por camadas (painel, filetes, textos, campos e rodapé) para os elementos clássicos.
- Ficha técnica **Original 0.14 · Tela inteira com cartões**: 4 colunas no horizontal e 2 no vertical.
- Cinco formatos de Texto livre originais: Etiqueta, Barra metade, Barra larga, Apresentação em barra e Apresentação em slide.
- Rolagem independente de duas linhas com controles **Parada / Rolando ◀**, velocidade **px/s**, repetições e ajuste assistido da duração.
- Modelos anteriores preservados, schema JSON compatível e **motor de exportação com qualidade Alta — 2× intacto**.
- Documentação: [`docs/ALPHA7_RESgate_VISUAL_014.md`](docs/ALPHA7_RESgate_VISUAL_014.md).

**Limitação:** reconstrução vetorial baseada nos comportamentos do antigo; exige comparação visual no Kdenlive. A compilação Svelte/Tauri da alpha.7 não foi verificada neste ambiente por indisponibilidade de registro npm.

## Novidades da alpha.6 — tela inteira, texto rico e rolagem

- **Ficha técnica**: opção de apresentação em tela inteira com seis campos distribuídos em grade.
- **Texto livre**: dois novos estilos, ficha técnica em tela inteira com rótulos editáveis e cartela em tela inteira com título e corpo.
- **Texto livre/cartela**: negrito, itálico, sublinhado, tamanho independente de título/corpo, alinhamento, marcadores por parágrafo e rolagem vertical ou horizontal. O texto pode ter até 6000 caracteres no corpo.
- **Correção do redimensionamento**: alças alteram a geometria sem deformar proporcionalmente a fonte. Tamanho e quebra de linha se adaptam à caixa.
- **Preservado** o supersampling 2× para vídeo (qualidade aprovada pelo usuário no Kdenlive).
- Instruções específicas: [`docs/ALPHA6_TEXTO_E_DIMENSIONAMENTO.md`](docs/ALPHA6_TEXTO_E_DIMENSIONAMENTO.md).
- Mantida a política de registrar todas as versões em [`CHANGELOG.md`](CHANGELOG.md).

## Novidades da alpha.5 — dimensionamento e estilos adicionais

- Arraste as **alças douradas** que aparecem ao selecionar qualquer item na pré-visualização. Segure **Shift** ao arrastar os cantos para manter a proporção de elementos livres.
- Ajuste fino por **Escala horizontal** e **Escala vertical** no painel de propriedades, ou restaure 100%. A ficha técnica mantém seu alinhamento lateral, mas também pode ser dimensionada.
- No elemento **Texto livre**, escolha três estilos: **Cartela RDV Bus**, **Faixa lateral — ficha clássica** (seis campos) ou **Ficha compacta — alpha.1** (quatro campos). Os rótulos também são editáveis.
- Contraste dos menus suspensos ajustado para tema escuro no WebKitGTK.
- Compatibilidade mantida com projetos JSON da alpha.1–alpha.4; novos campos são opcionais e possuem valores padrão.
- **Mantida** a exportação de alta qualidade com supersampling 2×, que teve bom resultado em testes reais no Kdenlive.

Detalhes e dicas: [`docs/REDIMENSIONAMENTO_E_ESTILOS.md`](docs/REDIMENSIONAMENTO_E_ESTILOS.md). Histórico completo: [`CHANGELOG.md`](CHANGELOG.md).

## Mudanças da alpha.4 — qualidade e transições

- **Primeiro e último quadros fechados:** a exportação amostra o tempo de animação do instante 0 ao instante final, inclusive. Isso evita que o último quadro termine com opacidade residual.
- **Superamostragem configurável:** `Alta — 2×` (padrão) renderiza o SVG a 2 vezes a resolução e reduz para o tamanho final. `Normal — 1×` é mais rápida.
- **Transparência ou fundo preto na exportação:** transparente é o padrão para montagem; preto é opção para reproduzir efeitos em players sem canal alfa, mas perde transparência.
- **Aviso de compatibilidade WebM:** em VP9 a cor é 4:2:0 e alguns players ignoram alfa. Para editar com melhor definição de bordas, prefira MOV QTRLE / ProRes 4444 e verifique compatibilidade no editor.
- **Não há renderizador resvg ainda:** a melhoria é um passo incremental no pipeline WebView/Canvas.

## O que já funciona

- Interface clássica roxa e dourada, painel de biblioteca, painel de propriedades e linha do tempo.
- Nove modelos: ficha técnica clássica, localização, data, linha, motorista, crédito, texto livre, slide e imagem de canto.
- Edição de textos, rótulos, cores, fundo, opacidade, tamanho, escala horizontal/vertical e posição dos elementos.
- Seleção, movimentação e **redimensionamento com alças** dos elementos na pré-visualização SVG de 1920 × 1080 ou 1080 × 1920.
- Animações HUD com reprodução/pausa e navegação de quadros; 30 ou 60 FPS e duração de 1 a 30 segundos.
- Exibição/ocultação, duplicação e exclusão de elementos.
- Importação e exportação de projetos JSON v1, com verificação dos dados.
- Salvamento automático **local** de segurança (quando houver espaço no armazenamento do WebView/navegador).
- Exportação do **quadro atual em SVG transparente** (a seleção do editor não é exportada).
- Geração experimental de vídeo no Tauri desktop: MOV/QTRLE, MOV/ProRes 4444, MKV/FFV1 e WebM/VP9 com canal alfa; progresso e cancelamento.
- **Corrigido:** fichas técnicas antigas com 500 px são normalizadas para pelo menos 640 px e textos passam a ser medidos pela fonte real para evitar transbordamento.
- Imagens de canto PNG/JPEG/WebP incorporadas ao projeto (tamanho máximo por imagem: 3,6 MB).

## Requisitos

### Para testar no navegador

- Node.js 22.12 ou superior e npm.
- Conexão com a internet apenas para instalar as dependências do npm pela primeira vez; depois o build usa as instaladas.

### Para executar/compilar desktop

- Rust estável atualizado (os plugins atuais do Tauri exigem Rust >= 1.90).
- Linux com WebKitGTK 4.1 e dependências de desenvolvimento Tauri.
- Windows: Microsoft C++ Build Tools / Windows SDK e WebView2.
- **FFmpeg em PATH** com o codec escolhido, ou defina `RDV_FFMPEG=/caminho/ffmpeg`. Nesta alpha o FFmpeg **não está empacotado** no AppImage/EXE, apenas preparado para futura inclusão como recurso.

### Debian 12 / Ubuntu (dependências do Tauri)

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

### CachyOS / Arch Linux (dependências do Tauri)

```bash
sudo pacman -Syu
sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file \
  openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool patchelf
```

> Os comandos de dependências acima seguem a [documentação oficial do Tauri 2](https://v2.tauri.app/start/prerequisites/). Consulte a distribuição caso algum pacote tenha nome diferente.

## Como verificar um WebM com transparência

O WebM pode conter alfa válido mesmo quando um programa reproduz como se fosse um vídeo opaco. Para extrair um quadro preservando o alfa, use um FFmpeg que tenha o decodificador `libvpx-vp9`:

```bash
ffmpeg -c:v libvpx-vp9 -i video.webm -frames:v 1 quadro.png
```

Para conferência da contagem de quadros e da taxa de quadros:

```bash
ffprobe -v error -select_streams v:0 -count_frames \
  -show_entries stream=nb_read_frames,avg_frame_rate \
  -of default=noprint_wrappers=1 video.webm
```

**Nota:** não use o player para diagnosticar apenas pela presença de preto; alguns ignoram o alfa. O arquivo WebM ainda possui cores 4:2:0.

## Como executar

Descompacte o ZIP, abra um terminal **dentro da pasta `RDV_Bus_0.1.0-alpha.9.2.2`** e execute:

```bash
npm install
npm run dev
```

Abra `http://127.0.0.1:1420` para testar o editor no navegador.

Para executar a versão desktop nativa usando Rust/Tauri:

```bash
npm run desktop:dev
```

Para verificar o funcionamento dos cálculos de dimensão/migração JSON (opcional, requer Python 3 e TypeScript):

```bash
python3 tests/test_package.py
python3 tests/test_geometry.py
```

Para compilar o frontend de produção:

```bash
npm run check
npm run build
```

Para compilar o **AppImage Linux**:

```bash
npm run desktop:build:linux
```

Ou com o comando anteriormente utilizado no RDV Bus:

```bash
npm run desktop:build -- --bundles appimage
```

O arquivo será gerado em `src-tauri/target/release/bundle/appimage/` após compilação bem-sucedida. O AppImage deve ser compilado na distribuição Linux mais antiga que se deseja suportar (por exemplo, Debian 12).

Para Windows, execute em uma máquina Windows preparada para Tauri:

```powershell
npm install
npm run desktop:build:windows
```

### Exportação de vídeo: teste inicial no desktop

1. Confirme que `ffmpeg -version` funciona no terminal e que os codificadores desejados estão disponíveis (`ffmpeg -encoders`).
2. Execute `npm run desktop:dev`, **não** `npm run dev` (este último abre somente o navegador e não disponibiliza vídeo).
3. Clique em **Exportar vídeo**, escolha um preset, indique o local e acompanhe a porcentagem.
4. O arquivo só é considerado pronto quando o FFmpeg termina com sucesso. É possível cancelar e apagar o arquivo incompleto.

O mecanismo atual compõe cada quadro SVG e rasteriza em PNG com Canvas do WebView; transmite um quadro de cada vez ao backend Rust, que encaminha ao FFmpeg pelo stdin, sem guardar a sequência completa na memória ou criar milhares de PNGs em disco. **É uma primeira integração funcional proposta, ainda não validada em execução Tauri real neste ambiente.** A consistência visual entre browsers/FFmpeg também precisa de testes; o renderizador Rust/resvg é uma etapa posterior.

A transparência é preservada pelos codecs selecionados, mas alguns programas e visualizadores (especialmente WebM VP9) podem ignorar o canal alfa. O FFmpeg ainda precisa ser instalado separadamente **nesta alpha**; a inclusão no instalador ficará para uma próxima versão.

### Aviso sobre o lockfile

Como o ambiente de preparação deste ZIP não permitiu acessar o registro npm, **não foi possível resolver as dependências e gerar um `package-lock.json` real**, nem o `Cargo.lock`. Não incluímos arquivos lock artificiais ou incompletos. Ao executar `npm install` em uma máquina conectada, o npm criará o `package-lock.json` automaticamente. A primeira compilação Tauri gera o `src-tauri/Cargo.lock`; preserve ambos para as próximas versões e use `npm ci` depois disso.

Se o npm 11/12 avisar que bloqueou o script de instalação do `esbuild`, revise o aviso e execute `npm install-scripts approve esbuild` (comando oficial de aprovação), depois `npm run check && npm run build`. O procedimento exato pode variar em outras versões do npm. Não desative globalmente as verificações de segurança por causa desse aviso.

## Novidades da alpha.3

- **Correção da largura da ficha técnica**, inclusive para projetos criados em versões anteriores, sem perder os dados do projeto.
- **Exportar vídeo** no desktop com quatro formatos e opções de cancelamento/progresso.
- Ficha técnica de seis campos com lado esquerdo/direito configurável.
- Novos templates no estilo roxo/dourado, incluindo Slide separado do Texto livre.
- Formatos horizontal e vertical: selecione **Projeto** na barra lateral e escolha a orientação.
- Botão **Fundo preto / Quadriculado** na barra da cena para inspecionar a transparência; o SVG exportado não incorpora este fundo.
- As novas configurações ficam salvas no formato JSON v1. Projetos da alpha.1 podem ser abertos.
- Changelog obrigatório para todas as versões: consulte `CHANGELOG.md`.
- Especificação de identidade visual: `docs/IDENTIDADE_VISUAL.md`.

## Usando o editor

1. Clique em um modelo da **Biblioteca** para adicioná-lo à composição.
2. Selecione o elemento na pré-visualização ou na lista de camadas.
3. Altere os textos, cores, opacidade e posição no painel **Propriedades**.
4. Arraste o elemento no quadro para reposicioná-lo.
5. Use a reprodução e a linha do tempo para testar a animação.
6. Clique em **Salvar** para gravar um `.rdv.json` e em **Abrir** para recuperá-lo.
7. Clique em **SVG** para guardar o quadro atual ou em **Exportar vídeo** (na versão desktop) para criar um vídeo animado com transparência.

Atalhos: **Ctrl+S** salvar; **Ctrl+O** abrir; **Espaço** reproduzir/pausar (fora dos campos); **Delete** excluir o elemento selecionado; **Esc** fechar janelas auxiliares.

> **Importante:** o salvamento automático usa `localStorage` e não substitui o salvamento manual em um arquivo `.rdv.json`. Imagens grandes podem ultrapassar a cota local. O projeto não modifica nenhum arquivo das versões anteriores.

## Estrutura

```text
RDV_Bus_0.1.0-alpha.9.3.1/
├── src/
│   ├── App.svelte              Editor e comandos
│   ├── app.css                 Visual do aplicativo
│   ├── components/
│   │   ├── Icon.svelte         Ícones internos sem CDN
│   │   ├── HudShape.svelte     Elementos HUD desenhados em SVG
│   │   ├── ScenePreview.svelte Pré-visualização e movimentação
│   │   ├── LibraryPanel.svelte Biblioteca e camadas
│   │   ├── PropertiesPanel.svelte Inspector de propriedades
│   │   └── Timeline.svelte     Reprodução e quadro atual
│   └── lib/
│       ├── types.ts            Formato de projeto
│       ├── templates.ts        Modelos padrão
│       ├── timing.ts           Curvas e animações
│       ├── validation.ts       Validação de projeto importado
│       ├── projects.ts         Arquivos e autosave
│       └── video.ts            Exportação de quadros/IPC para Rust
├── src-tauri/                 Backend e empacotamento Tauri
│   ├── capabilities/           Permissões de sistema
│   ├── icons/                  Identidade visual
│   ├── src/                    Código Rust
│   └── tauri.conf.json
├── docs/                      Arquitetura e roteiro
├── tests/                     Verificação offline do pacote
└── package.json
```

## O que ainda falta

- Renderizador nativo Rust/resvg e testes de rasterização/antialiasing.
- Exportação PNG individual e sequência; FFmpeg **embutido** no instalador.
- Testes de compatibilidade de exportação de vídeo para os codecs selecionados e players.
- Animações por objeto com cronograma independente e linha do tempo avançada.
- Tipografia rica, quebra de linhas, recorte e formas/gradientes avançados.
- Sistema de templates externos e gerenciamento de fontes.
- Windows portátil e suporte Android.
- Segurança reforçada para lançamento público (CSP e auditoria de dependências).

## Documentação

Veja `docs/ARQUITETURA.md`, `docs/ROADMAP.md` e `CHANGELOG.md`.


## Política de versões

Toda entrega deverá atualizar `package.json`, `src/lib/types.ts`, `src-tauri/tauri.conf.json`, `CHANGELOG.md` e os testes de consistência. **Não trate itens planejados como concluídos.**


## Novidades da 0.1.0-alpha.9 — fontes e faixas em 9:16

- Com o aplicativo desktop aberto, selecione um elemento, acesse **Propriedades → Aparência → Fonte do elemento (sistema operacional)** e escolha uma família instalada.
- Para alterar apenas um texto, clique diretamente nele na pré-visualização e escolha a fonte na **barra flutuante**. A preferência individual substitui a fonte geral daquele campo.
- O modo 1080 × 1920 desloca automaticamente as faixas de **Ficha técnica lateral** e **Texto livre → Faixa lateral — ficha clássica** para a parte inferior. Os seis campos aparecem em duas colunas. Arraste a alça superior para alterar a altura.
- Ao alternar para 1920 × 1080, as faixas voltam à lateral configurada (esquerda/direita).
- **Importante:** fontes não são embutidas no projeto ou nos vídeos; a renderização usa as fontes instaladas na máquina que exporta. Para reproduzir exatamente em outro sistema, instale ali a mesma família tipográfica e confira a licença de uso.
- `fontdb` é utilizado apenas para localizar famílias de fontes; não copia arquivos para o pacote.

### Teste recomendado

```bash
npm install
npm run check
npm run desktop:dev
# Depois, se aprovado:
npm run desktop:build -- --bundles appimage
```


## Revisão 0.1.0-alpha.9.3.1 — Cores de texto independentes

Para personalizar **Título**, **Corpo** e **Texto secundário** de forma independente:

1. Selecione um elemento no editor e abra **Propriedades → Conteúdo**.
2. Na seção **Cores dos textos — independentes**, escolha uma opção para cada função: original, branco, cor principal ou cor secundária da paleta.
3. A alteração afeta apenas o grupo escolhido no elemento. Use **Aplicar ... a todo o projeto** para propagar somente aquele grupo às demais seções.
4. Os controles **Cor de ...** abaixo de cada campo continuam disponíveis para exceções individuais. Escolher novamente uma cor de grupo remove as exceções daquele grupo e deixa os outros intactos.

Os rótulos e rodapés pertencem ao grupo de texto secundário. Na ficha técnica, as linhas dos valores pertencem ao corpo; nas etiquetas, a segunda linha pode atuar como texto secundário. As configurações são salvas no arquivo JSON do projeto e acompanham exportações SVG e vídeo.

Veja `CHANGELOG.md` para os detalhes e testes de regressão da alpha.9.3.1.
