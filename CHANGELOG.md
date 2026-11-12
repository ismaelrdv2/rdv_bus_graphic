# Histórico de alterações — RDV Bus Studio

> Política de versões: cada lançamento terá uma seção própria neste arquivo, atualizada no mesmo ZIP da versão. Registros estão em ordem decrescente. Atualizações planejadas não são apresentadas como recursos concluídos.

## 0.1.0-alpha.9.3.5 — Ícones originais e brilho nas cartelas Studio

- Extrai os caminhos SVG originais de localização, data, linha, motorista e crédito do renderizador Clássico para uma fonte vetorial compartilhada.
- Ícones visíveis nas cartelas Studio com a área de texto realocada, respeitando a largura padronizada e as margens.
- Introduz varredura brilhosa (*shine sweep*) no Studio após a entrada, limitada ao formato da cartela e sem interromper a edição do texto.
- Mantém o brilho histórico do visual Clássico, cores da paleta, animações e exportações existentes.
- A temporização reproduz o efeito implementado no código clássico; o vídeo de referência no YouTube não pôde ser inspecionado quadro a quadro para afinação exata.

## 0.1.0-alpha.9.3.4 — Espaçamento dos textos das cartelas

- Corrigida a aproximação do texto secundário ao corpo em cartelas compactas (Clássico e Studio), usando baselines consistentes dentro dos 102 px.
- Título, corpo e texto inferior continuam com cores e estilos independentes; textos longos ainda são ajustados à largura sem deformar a fonte.
- Aplicado também aos modelos de slide compacto e texto livre de três linhas, preservando o layout de fichas técnicas, paletas, curvas de animação e dimensões das cartelas.
- Regressões geométricas e de paridade Mobile incluídas.

## 0.1.0-alpha.9.3.3 — Margens da ficha técnica lateral

- Linhas separadoras da barra à esquerda terminam antes da linha diagonal, em função da altura de cada campo.
- Barra à direita: margem de leitura ampliada para os valores e rótulos, sem alterar textos nem ordem de entrada/saída.
- Ajuste também no alinhamento da barra lateral Studio à direita; a geometria da ficha em tela inteira permanece inalterada.
- Mantidos formatos de vídeo, transparência, paletas, editor de propriedades e JSON antigos.
- Testes de regressão geométrica independentes para os dois lados em 1080p.

## 0.1.0-alpha.9.3.2 — Organização das propriedades e cartelas compactas

- Painel de personalização dividido em seis abas: Conteúdo, Tipografia, Cores, Dimensões, Animação e Paleta.
- Configurações globais do projeto divididas em Vídeo e Paleta.
- Localização, data, linha de ônibus, motorista, crédito e etiqueta compacta de Texto livre passam a usar 550 × 102 px como tamanho visual padrão (crédito de filmagem).
- Ações de padronização do elemento selecionado e de todas as cartelas existentes no projeto, preservando textos, paletas, animações e posicionamento quando possível.
- Fichas técnicas, slides e apresentações em tela inteira permanecem com dimensões próprias.
- Testes de regressão para preservar projetos antigos e nova organização do painel.

## 0.1.0-alpha.9.3.1 — Seletores independentes por tipo de texto

### Adicionado
- Controles destacados no painel de propriedades: **Cor do título**, **Cor do corpo** e **Cor do texto secundário**, cada um com escolha independente entre padrão original, branco, cor principal e cor secundária.
- Aplicação opcional de cada um dos três grupos a todas as seções do projeto, sem afetar os outros grupos.
- Persistência de `textGroups` em JSON com leitura compatível dos projetos da alpha.9.3 e anteriores.
- Personalização mais granular por campo continua disponível abaixo dos seletores de grupo.

### Corrigido
- Escolher uma cor para o grupo remove apenas as exceções de cor dos campos pertencentes àquele grupo, para o resultado aparecer imediatamente.
- Recuperada a personalização de cor dos textos na ficha compacta `technicalAlpha1`, antes fixada em dois valores RGB.
- Comando **Cor de todos os textos** reinicia grupos semânticos anteriores, mantendo o comportamento explícito de aplicação global.

### Preservado
- Paletas predefinidas e personalizadas HEX/RGB, comportamento antigo de `original`, alinhamento e espaçamento corrigidos na alpha.9.2.2, formatos de vídeo e estrutura Mobile independente.

### Validação
- Testes locais e compilação via GitHub Actions. A aparência final no AppImage depende de novo teste do usuário.

## 0.1.0-alpha.9.3 — Paletas e cores de texto (Desktop)

### Adicionado
- Paletas predefinidas: roxo/dourado, azul/laranja, verde/amarelo, vermelho/dourado e rosa/ciano.
- Paleta personalizada com ajuste por seletor de cor, código hexadecimal HTML (`#RRGGBB` / `#RGB`) ou canais RGB (0–255).
- Cores principal, secundária e de fundo compartilhadas por todos os elementos do projeto e ajustáveis por elemento.
- Cor de cada campo de texto, rótulo e rodapé: branco, destaque, secundária ou estilo original.
- Controles para aplicar a cor a todo o texto do elemento selecionado ou a todos os textos do projeto.
- Cores e escolhas de texto persistidas no projeto JSON, com validação e compatibilidade com versões anteriores.

### Preservado
- Os modos originais 0.14, o posicionamento corrigido na alpha.9.2.2, a transparência SVG e o pipeline de vídeo Tauri/FFmpeg.
- A versão Mobile continua independente e não foi alterada.

### Validação
- Os novos recursos serão verificados no GitHub Actions e no AppImage antes da confirmação funcional final.

## 0.1.0-alpha.9.2.2 — Texto clássico e pasta padrão do Desktop

### Corrigido
- Apresentação em slide Original 0.14: título alinhado à margem de conteúdo; área de recorte e linha de base do corpo sincronizadas, evitando o corte superior de letras.
- Apresentação em barra Original 0.14: corpo deslocado abaixo da linha divisória, evitando sobreposição.
- Texto rico SVG: preservação explícita de espaços entre palavras distribuídas em `<tspan>`, tanto na prévia quanto no SVG exportado e no vídeo.

### Adicionado
- Diretório padrão de saída no Desktop: `~/RDV Bus Studio` no Linux e `%USERPROFILE%\RDV Bus Studio` no Windows. A pasta é criada pelo processo nativo na primeira utilização.
- Opção **Abrir pasta de saída** na barra principal e no diálogo de vídeo, pelo gerenciador de arquivos do sistema.
- Projetos JSON, quadros SVG e vídeos usam esse diretório como sugestão inicial, respeitando mudanças feitas pelo usuário nos diálogos. A última pasta utilizada é lembrada no aplicativo.
- Testes estruturais e regressões de geometria e texto, sem alterar renderização Mobile ou pipeline FFmpeg.

### Observações
- A escolha de pasta continua sendo feita pelo diálogo nativo de salvar; o botão de abrir pasta usa o diretório lembrado.
- A compilação do GitHub Actions é necessária para validar o aplicativo final Linux e Windows.

## 0.1.0-alpha.9.2.1 — Correção da grade de Texto livre em tela inteira

- Corrigida a seleção de renderizador: “Ficha em tela inteira — 6 campos” utiliza sempre o layout Studio, sem herdar o desenho clássico de outra modalidade.
- Campos preenchidos na Ficha em tela inteira agora ocupam uma grade equilibrada, com centralização das linhas incompletas e aproveitamento vertical do espaço disponível.
- Mantidas a geometria e as animações dos modos Original 0.14, incluindo a apresentação clássica em slide.
- Preservada a compatibilidade com projetos JSON anteriores e a exportação de SVG/vídeo.

## 0.1.0-alpha.9.2.1 — 2026-11-11

### Corrigido
- **Ficha técnica inferior 9:16 e Texto livre com faixa inferior:** os seis campos voltam a aparecer no vídeo exportado e passam a acompanhar a entrada e a saída na pré-visualização. O erro era de **reatividade no componente Svelte**: a função auxiliar `rowProgress(i)` lia o tempo indiretamente, fazendo com que os seis progressos fossem calculados apenas no estado inicial. Agora os seis progressos são derivados diretamente de `p` em uma declaração reativa e consumidos por cada linha do SVG.
- **Ficha clássica lateral e ficha clássica em tela inteira:** aplicada a mesma correção preventiva às animações dos seis campos em `LegacyShape.svelte`, para evitar congelamento dos campos em outras apresentações.
- Compatibilidade mantida com projetos das versões anteriores; o formato JSON não mudou.

### Preservado
- Animações da moldura, do título e do rodapé; duração de entrada e saída, sistema de fontes do SO, barra de edição flutuante e adaptação automática 16:9 ↔ 9:16.
- Motor de exportação FFmpeg/VP9/MOV/MKV, transparência e qualidade **Alta — 2×**, sem mudanças.

### Validação
- Confirmado no `Teste.webm` recebido: faixa inferior renderizada em 1080×1920 a 60 FPS, porém sem os seis campos ao longo do vídeo. O bug na dependência reativa foi localizado no código da alpha.9.1 e corrigido.
- Testes automatizados de progressão temporal e de presença de dependências reativas executados localmente, além das regressões existentes.
- **Limitação:** o ambiente de preparação não tem as dependências npm instaladas e não consegue resolver o registro npm; compilação Svelte/Tauri e exportação end-to-end devem ser validadas no Linux do usuário.

## 0.1.0-alpha.9.1 — 2026-11-11

### Corrigido
- `ScenePreview.svelte`: corrigidos dois erros de TypeScript na seleção da fonte durante edição direta. O manipulador `setFontFamily()` verifica se o estado `editing` ainda está ativo antes de atualizar o campo; isso evita acessar um editor que já foi fechado.
- `ScenePreview.svelte`: barra flutuante com `role="toolbar"` agora possui `tabindex="0"`, removendo o aviso `a11y_interactive_supports_focus` identificado pelo `svelte-check`.

### Preservado
- Lista de fontes do sistema operacional, formatação por campo e faixa inferior 9:16.
- Visual clássico, animações, exportação de vídeo e supersampling 2×, sem alterações no pipeline.

### Verificação
- Testes Python de regressão e validação dos arquivos executados no ambiente de preparação.
- Compilação Svelte/Tauri integrada continua pendente de verificação no Linux do usuário se não houver dependências npm disponíveis no ambiente de preparação.

## 0.1.0-alpha.9 — 2026-11-11

### Adicionado
- **Fontes do sistema operacional:** o aplicativo desktop Tauri usa `fontdb` para obter as famílias tipográficas instaladas localmente no Linux/Windows/macOS; uma lista de substituição básica permanece disponível quando não há acesso nativo (por exemplo, no navegador).
- **Fonte por elemento:** o painel de propriedades oferece um seletor de família para todos os textos do elemento.
- **Fonte por campo:** a barra flutuante de edição direta oferece uma lista de fontes para alterar somente o título, valor, subtítulo ou rótulo selecionado. A fonte por campo tem prioridade sobre a fonte geral do elemento.
- **Composição vertical 9:16:** fichas técnicas em modo faixa e o estilo "Faixa lateral — ficha clássica" do Texto livre são exibidos automaticamente como uma **faixa horizontal no rodapé**, com seis campos distribuídos em duas colunas e três linhas. Os modos de tela inteira permanecem intactos.
- A faixa inferior aceita ajuste de **altura** pela alça superior e pela escala vertical, mantendo a largura total e o encaixe na parte inferior.

### Corrigido / preservado
- A troca 16:9 ↔ 9:16 ajusta automaticamente o posicionamento das faixas; projetos antigos verticais também passam pelo mesmo alinhamento na validação do JSON.
- Medição das linhas, rolagem de texto e SVG exportado usam a fonte geral selecionada, preservando a tipografia entre prévia e exportação no mesmo computador.
- Mantidos a identidade clássica, animações em camadas, exportação RGBA e **supersampling 2×** aprovado no Kdenlive.

### Limitações e testes
- As famílias de fontes são referenciadas **por nome** no JSON e no SVG; os arquivos das fontes não são copiados nem embutidos. Ao abrir em outro computador sem a mesma fonte, ocorre substituição pela fonte disponível, podendo alterar medidas e quebras de linha.
- Para listar todas as famílias pelo sistema, use o aplicativo Tauri. No modo navegador, são mostradas fontes comuns de referência e a detecção completa depende das limitações do navegador.
- Os testes locais em Python e o TypeScript dos módulos centrais foram executados. **A compilação integrada Svelte/Tauri e a validação da renderização vertical devem ser realizadas no Linux**, pois este ambiente não teve acesso à instalação npm nem ao Rust.

## 0.1.0-alpha.8 — 2026-11-11

### Adicionado
- **Edição direta no monitor SVG**: clique nos títulos, valores e rótulos das fichas e dos demais elementos para editar seus textos sobre a própria pré-visualização.
- **Barra flutuante de formatação** com negrito, itálico, sublinhado e tamanho da fonte, além de alinhamento e marcadores para corpo de texto com múltiplos parágrafos. Ctrl+B/I/U dentro do campo aplica a formatação.
- Corpo do Texto livre: formatação de trecho selecionado reaproveita o formato rico `**negrito**`, `*itálico*`, `__sublinhado__`; sem seleção, altera o campo inteiro.
- Configurações opcionais `textFormatting` e `technicalCaptions` no JSON, com validação e migração de projetos anteriores.
- Indicadores e metadados de edição somente na interface, removidos do SVG exportado.

### Corrigido
- Ícones de localização, linha, data, motorista e crédito nos presets clássicos: caminhos normalizados, traços maiores e centralização em `viewBox` 24×24 para evitar deslocamento e recortes.
- Rótulos da ficha técnica original agora podem ser editados pelo clique, assim como os rótulos personalizados do Texto livre.

### Preservado
- Animações clássicas por camadas, modelos de tela inteira, rolagem horizontal independente, interface atual e pipeline de vídeo/FFmpeg.
- Supersampling **Alta — 2×** e o comportamento dos quadros extremos que foram aprovados nos testes no Kdenlive.

### Verificação e limitações
- Testes locais de arquivos, geometria e TypeScript dos módulos centrais realizados; o registro npm permanece inacessível no ambiente de preparação. **A compilação Svelte/Tauri integrada precisa ser testada em Linux.**
- A barra de edição aparece somente sobre os textos visíveis; o logotipo/imagem continua sendo editado pelo painel de propriedades. O conteúdo permanente do vídeo não inclui controles de edição.
- Negrito/itálico/sublinhado e tamanho podem ser definidos por campo; formatação independente por palavra está disponível para o corpo rico do Texto livre. Controles de alinhamento/marcadores são específicos para textos de múltiplos parágrafos.

## 0.1.0-alpha.7.1 — 2026-11-11

### Corrigido
- Três erros de TypeScript em `LegacyShape.svelte`: chamadas de `measure()` agora informam explicitamente o quarto argumento `italic=false`, conforme o contrato `MeasureRich`. Sem mudança no cálculo visual das fontes.
- Aviso de acessibilidade `a11y_label_has_associated_control` no progresso de exportação: a etiqueta agora usa `for="export-progress"` e a barra tem `id="export-progress"`.

### Mantido
- Presets clássicos e modos de rolagem introduzidos na alpha.7.
- Pipeline de exportação, supersampling 2× e comportamento das animações inalterados.

### Validação
- Testes locais em Python da estrutura e regressão das correções realizados.
- `npm run check` e `npm run desktop:build` não foram executados neste ambiente, pois a instalação npm não concluiu. Validar no Linux do usuário.

## 0.1.0-alpha.7 — 2026-11-11

### Adicionado
- Seletor por elemento para usar os padrões gráficos **Clássico 0.14** ou **Studio**.
- Opção de animação **Original 0.14 — por camadas**: introdução progressiva de painel, filetes, títulos, linhas/valores e rodapé, com saída em ordem temporal inversa e extremos totalmente transparentes.
- Modelo de **Ficha técnica em tela inteira** inspirado na versão 0.14: fundo em roxo profundo, cantos dourados e cartões em grade de quatro colunas na horizontal e duas na vertical.
- Recuperados cinco modos de Texto livre da versão 0.14: Etiqueta, Barra metade, Barra larga, Apresentação em barra e Apresentação em slide.
- Rolagem horizontal por linha independente no Texto livre clássico, velocidade em **px/s**, repetições, espaçamento entre repetições e botão para adequar a duração global à rolagem.
- Nova implementação `src/components/LegacyShape.svelte` e módulo determinístico `src/lib/legacy.ts`, separados dos componentes Studio existentes.
- Documento técnico `docs/ALPHA7_RESgate_VISUAL_014.md` e testes específicos da camada legada.

### Compatibilidade / mantido
- Projetos JSON da alpha.1–alpha.6 continuam no schema 1: novos campos opcionais têm valores de migração.
- O visual Studio dos projetos importados é preservado por padrão.
- Nenhuma alteração no processamento do vídeo, FFmpeg, transparência, animações Studio e supersampling **Alta — 2×** já aprovado no Kdenlive.

### Limitações / verificação pendente
- A aparência e as curvas foram **reimplementadas** em SVG a partir do AppImage antigo; ainda não estão comprovadas como idênticas pixel a pixel.
- O modelo clássico original comportava até oito campos de ficha; esta alpha mantém seis para evitar mudanças de schema sem uma bateria mais ampla de testes.
- A duração da composição é global e limitada a 30 s. A rolagem longa pode exigir ajuste explícito da duração.
- Checagem TypeScript estrita dos módulos centrais aprovada. Compilação Svelte/Tauri e testes finais no Kdenlive ainda pendentes porque o registro npm não estava acessível neste ambiente.

## 0.1.0-alpha.6 — 2026-11-11

### Adicionado
- Ficha técnica em **tela inteira**, com seis campos, título e apresentação adaptada para horizontal (duas colunas) e vertical (uma coluna).
- Novos estilos de **Texto livre**: `Ficha em tela inteira — 6 campos` e `Cartela em tela inteira — título e corpo`, preservando os três estilos existentes.
- Editor de corpo com múltiplos parágrafos, tamanho independente de fonte para título/corpo, negrito, itálico, sublinhado, alinhamento (incluindo justificação experimental) e marcadores como `»`, `•` ou números.
- Formatação de trechos selecionados no corpo com `**negrito**`, `*itálico*` e `__sublinhado__`, preservada no SVG e no JSON.
- Rolagem vertical e horizontal na Cartela de Texto livre, com velocidade relativa ajustável e cálculo determinístico pela linha do tempo. Rolagem vertical também disponível na cartela de tela inteira.
- Documento `docs/ALPHA6_TEXTO_E_DIMENSIONAMENTO.md` com instruções e limitações.

### Corrigido
- **Proporção das letras ao redimensionar:** o grupo SVG não sofre mais escalas X/Y independentes. O painel passa a usar dimensões físicas, e os tamanhos das fontes são recalculados uniformemente e medidos para evitar vazamento. Isso impede o efeito de texto espremido/esticado na prévia e na exportação.
- Painéis em tela inteira mantêm posição e tamanho correspondentes ao projeto ao alternar orientação; as alças/controles de tamanho ficam bloqueados nesses modos.
- Importação de JSON antigo aplica valores padrão à formatação e à apresentação de tela inteira; novos valores são validados.

### Mantido
- Exportação de vídeo FFmpeg com transparência, qualidade 2× por padrão, animações completas e presets de MOV/MKV/WebM; estes recursos não foram modificados.
- Tema clássico roxo/dourado, formatos 16:9 e 9:16, edição por arrasto, duplicação e salvamento JSON.

### Testes e limitações
- Testes de TypeScript dos módulos centrais, formatação e migração JSON foram executados sem dependências Svelte.
- Não foi possível realizar `npm install`, `npm run check`, `npm run build` ou executar Tauri neste ambiente por falha de DNS no registro npm. O comportamento visual deve ser verificado no Linux do usuário.
- Justificação é experimental; a sintaxe inline não permite aninhar vários estilos no mesmo trecho. O modo horizontal converte quebras de parágrafo em separadores.
- O renderizador Rust/resvg ainda não está integrado. O pipeline atual de supersampling 2× permanece.



## 0.1.0-alpha.5 — 2026-11-11

### Adicionado
- Redimensionamento direto de **todos os nove tipos de elementos** por alças SVG na pré-visualização, com ajuste independente de largura e altura. `Shift` nos cantos de elementos livres mantém a proporção.
- Controles de escala horizontal e vertical (%) no painel de Propriedades, com restauração para 100%.
- Estilo **Faixa lateral — ficha clássica** para o Texto livre: gradiente roxo, diagonal dourada, seis valores e rótulos inteiramente editáveis, orientação esquerda/direita.
- Estilo **Ficha compacta — alpha.1** para o Texto livre: painel original da primeira reconstrução, barra vertical de destaque, quatro pares de rótulo/valor editáveis.
- Documentação `docs/REDIMENSIONAMENTO_E_ESTILOS.md` e testes locais de geometria/compatibilidade.

### Corrigido
- Contraste de campos `<select>` e opções nativas com `color-scheme: dark`, especialmente no modal de exportação no WebKitGTK, evitando texto branco sobre fundo branco. **Requer validação na máquina do usuário.**
- Serialização de escalas e estilos no JSON, com leitura retrocompatível de projetos da alpha.1 à alpha.4 (valores padrão quando ausentes).
- Preservada a exclusão de alças/molduras de edição no SVG e nos quadros exportados.

### Mantido
- Supersampling **2× por padrão**, exportação MOV/MKV/WebM por FFmpeg (com quadros PNG intermediários), animações completas e identidade roxa/dourada da alpha.4, cuja qualidade visual foi aprovada no Kdenlive pelo usuário.
- Formatos horizontal e vertical, biblioteca e demais funções anteriores.

### Limitações e validação
- `npm install` no ambiente de construção falhou por DNS (`EAI_AGAIN`); por isso ainda não foi possível concluir `npm run check`, `npm run build` ou executar a GUI/Tauri aqui.
- Os testes de geometria em TypeScript, validação de JSON e verificações locais de integridade devem ser executados antes de declarar a alpha.5 pronta para uso geral. O redimensionamento no WebKitGTK exige teste prático.
- As fontes SVG permanecem dependentes do motor do navegador; a renderização nativa Rust/resvg ainda não foi implementada.

## 0.1.0-alpha.4 — 2026-11-11

### Corrigido
- Exportação de quadros passou a incluir explicitamente os dois extremos do intervalo de animação: primeiro quadro em `t=0` e último quadro em `t=duração`, sem deixar o fade-out pela metade na fronteira do vídeo. A taxa de quadros, quantidade de quadros e duração do arquivo não mudam.
- Diagnóstico da animação WebM: a alpha.3 gerava corretamente 318/318 quadros e preservava alfa; reprodutores que ignoram o canal alfa podem parecer mostrar transições cortadas.

### Adicionado
- Configuração de rasterização **normal 1× / alta 2×** no modal de exportação, com supersampling 2× como padrão para reduzir o serrilhado das diagonais e contornos finos.
- Escolha de fundo de saída: **transparente** (padrão, para sobreposição) ou **preto** (compatibilidade visual para reprodutores sem suporte a alfa).
- Avisos para WebM/VP9 alfa e sua subamostragem de cores 4:2:0.
- Diagnóstico simples de vídeos com `ffprobe` e teste automatizado para os extremos da animação.

### Limitações e validação
- A renderização permanece no **SVG → Canvas/WebView → PNG**, não em resvg/Rust. A superamostragem melhora as bordas, mas não garante eliminação total do serrilhado.
- WebM com transparência continua sujeito ao suporte a alfa do reprodutor e à perda de definição cromática do 4:2:0, mesmo com `-lossless 1`.
- MOV QuickTime Animation QTRLE (4:4:4/ARGB) é recomendado como formato de comparação para qualidade.
- O vídeo WebM fornecido pelo usuário foi analisado: VP9 1920×1080/60 FPS, 5,3s, 318 quadros; a versão alpha.4 ainda requer validação visual/compilação no Tauri do usuário.

## 0.1.0-alpha.3 — 2026-11-11

### Corrigido
- Fichas técnicas criadas anteriormente com largura de 500 px passam a ter largura mínima de 640 px na leitura dos projetos JSON e do autosave. Essa normalização conserva textos e demais propriedades.
- Nova referência de posicionamento interno: título em x=52, valores em x=92, separadores mais longos e borda inclinada, alinhados com o exemplo B 692.
- Cálculo de ajuste de fonte por medição real com Canvas, substituindo a aproximação baseada apenas em contagem de caracteres; reduz o risco de texto ultrapassar o painel.
- Impedido o arrasto horizontal/vertical de fichas técnicas para fora do limite lateral, evitando desalinhamentos de faixa.
- Exportação SVG remove atributos de interação próprios do editor, além das molduras de seleção.

### Adicionado
- Botão **Exportar vídeo** com modal de formatos, progresso de quadros e cancelamento no desktop.
- Integração inicial **experimental** Rust/Tauri ↔ FFmpeg via transmissão sequencial de PNGs sem carregar todos os quadros na RAM: MOV/QTRLE, MOV/ProRes 4444, MKV/FFV1, WebM/VP9 com alfa.
- Suporte ao FFmpeg em `PATH`, `RDV_FFMPEG` ou como recurso futuro `ffmpeg/ffmpeg` no pacote Tauri.

### Limitações e testes
- No navegador (`npm run dev`), a exportação de vídeo aparece para descoberta, mas fica desabilitada e explica como executar no desktop (`npm run desktop:dev`).
- FFmpeg ainda não vem embutido nesta alpha. O renderizador de quadros ainda é o Canvas do WebView; Rust/resvg permanece planejado.
- Os módulos TypeScript centrais passaram na verificação `tsc`; não foi possível compilar toda a interface Svelte ou executar Tauri/Rust no ambiente de criação por indisponibilidade do npm/cargo. A exportação de vídeo requer teste real em Linux.

## 0.1.0-alpha.2 — 2026-11-11

### Adicionado
- Identidade visual RDV Bus Classic, com paleta roxo profundo, dourado, lilás e branco, centralizada em `src/lib/brand.ts`.
- Nova ficha técnica vetorial com painel lateral de altura inteira, recorte diagonal, filetes, seis campos, separadores e assinatura RDV BUS; posição esquerda ou direita configurável.
- Modelos revisados para créditos, texto livre e os demais HUDs, com molduras roxas e detalhes dourados.
- Modelo **Slide**, independente do texto livre (nove modelos disponíveis).
- Composição horizontal (1920 × 1080) ou vertical (1080 × 1920), com redimensionamento inicial proporcional dos elementos na mudança de formato.
- Alternância entre fundo preto e quadriculado apenas na pré-visualização, sem afetar a transparência do SVG exportado.
- Documento de identidade visual (`docs/IDENTIDADE_VISUAL.md`).
- Testes adicionais de consistência de versões, templates e compatibilidade dos campos de projetos.

### Alterado
- Atualizados o estilo do editor (barra superior, navegação, biblioteca, propriedades, linha do tempo) e os modelos padrão para a identidade clássica.
- O painel de ficha técnica agora oferece campos separados para carroceria, modelo, chassi, modelo, empresa e prefixo.
- A seleção e o arrasto dos elementos usam as dimensões reais do projeto, incluindo o modo retrato.
- Novos projetos mantêm a estrutura JSON v1; projetos alpha.1 são aceitos, preservando seus dados e adotando os campos opcionais novos.

### Mantido
- Biblioteca/camadas, exibição, duplicação, exclusão, edição, animações, reprodução, autosave, abertura e salvamento JSON, imagens de canto e exportação SVG estática.

### Limitações conhecidas
- Os templates agora representam o estilo clássico, mas a fidelidade final de fontes, espaçamentos e curvas de animação ainda precisa de ajustes com testes visuais.
- Renderizador final Rust/resvg, PNG, FFmpeg e exportação de vídeos **não estão implementados**.
- Sem builds AppImage/EXE prontos nesta entrega; pacote contém código-fonte.
- A compilação completa do frontend não pôde ser executada no ambiente de preparação devido à indisponibilidade de acesso ao registro npm. Teste local com `npm install && npm run check && npm run build`.

## 0.1.0-alpha.1 — 2026-11-11

- Projeto totalmente novo, sem depender do código antigo.
- Interface Svelte + TypeScript + Vite, backend de empacotamento Tauri 2 + Rust.
- Biblioteca de oito tipos de elementos HUD.
- Pré-visualização SVG Full HD interativa, posicionamento por arrasto.
- Painéis de propriedades, biblioteca/camadas e linha do tempo.
- Animações de entrada/saída, reprodução e 30/60 FPS.
- Abertura e salvamento de projetos JSON versionados e autosave local.
- Exportação estática de quadro SVG com fundo transparente.
- Configuração do AppImage Linux e instalador NSIS Windows.

**Não incluídos na alpha.1:** PNG, FFmpeg, geração de vídeo, resvg, pacote Windows portátil e Android.
