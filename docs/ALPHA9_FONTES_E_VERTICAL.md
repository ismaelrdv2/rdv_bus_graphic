# RDV Bus Studio — fontes do sistema e faixa inferior (0.1.0-alpha.9.1)

## Fontes do sistema

O backend Tauri expõe o comando `list_system_fonts`, implementado em Rust com `fontdb`. A biblioteca lê famílias tipográficas instaladas nas pastas normalmente usadas pelo sistema operacional, sem incluir os arquivos de fonte na distribuição.

Em **Propriedades → Aparência**, a fonte vale para todos os textos do elemento. Na **barra flutuante**, a fonte é aplicada somente ao campo selecionado. As duas escolhas são salvas como nomes de família no JSON schema 1 (`style.fontFamily`, `textFormatting[<campo>].family`). A ausência dessas propriedades em projetos anteriores mantém `Inter` como preferência, com Arial e fontes do sistema como fallback.

No navegador, sem o backend Tauri, o seletor oferece nomes de referência (não necessariamente instalados); a listagem completa depende do aplicativo desktop. Projetos abertos em outro computador podem substituir famílias indisponíveis. A exportação de vídeo usa as fontes locais no mesmo motor SVG/Canvas da prévia.

## Faixa horizontal automática no 9:16

Os modos **Ficha técnica → Faixa lateral** e **Texto livre → Faixa lateral — ficha clássica** passam automaticamente para o rodapé quando o projeto usa **1080 × 1920**.

A faixa ocupa a largura de 1080 px e 650 px de altura padrão, com campos em duas colunas × três linhas, título e rodapé. A altura é ajustável entre 75% e 140% pela alça superior. O lado Esquerdo/Direito permanece como preferência para a volta ao 16:9, quando a faixa é lateral novamente. Os modos de tela inteira Studio e 0.14 não são alterados.

Ao abrir um projeto antigo vertical com uma faixa técnica estreita, a validação JSON ajusta largura, posição e escala, sem reescrever os arquivos de origem.

## Testes recomendados no Linux

1. Execute `npm install`, `npm run check` e `npm run desktop:dev`.
2. Abra a Ficha técnica em 16:9, troque a fonte geral para uma família instalada e altere somente o valor de um campo pela barra flutuante. Confira a prévia e a exportação SVG.
3. Passe para 9:16. A faixa deve ir ao rodapé; altere sua altura pela alça superior e edite os seis campos.
4. Repita com **Texto livre → Faixa lateral — ficha clássica**, incluindo uma fonte diferente no título.
5. Alternando de volta para 16:9, confira o lado selecionado e a faixa vertical.
6. Gere vídeo em MOV ou WebM com qualidade Alta (2×) e compare no Kdenlive.
7. Salve, reabra e confirme persistência das fontes e das propriedades.

## Limitações e cuidados

- Fonte personalizada não é copiada nem incorporada ao SVG exportado: a fonte deve estar instalada no computador que renderiza.
- Algumas fontes não disponibilizam todos os pesos ou estilos; o sistema operacional pode sintetizá-los.
- A instalação de `fontdb` via Cargo exige acesso ao registro de crates na compilação.
- O build Svelte/Tauri integrado ainda precisa ser confirmado no ambiente Linux com dependências npm/Cargo; os testes locais cobrem os módulos de dados e a estrutura do pacote.
