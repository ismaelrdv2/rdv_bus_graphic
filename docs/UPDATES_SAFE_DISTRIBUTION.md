# Atualizações do RDV Bus Studio — distribuição segura

**Estado:** aviso de atualização implementado; instalação automática **não** ativada. Esta separação impede que o aplicativo apague executáveis ou dados sem um pacote confiável e assinado.

## Funcionamento atual

- Desktop: ao abrir o aplicativo, consulta `GET https://api.github.com/repos/ismaelrdv2/rdv_bus_graphic/releases?per_page=20`. Considera apenas versões **publicadas**, não drafts nem os artefatos temporários de GitHub Actions. Requer arquivo `.AppImage` para Linux ou instalador NSIS `.exe` para Windows, vinculado ao mesmo repositório. O aplicativo compara versões SemVer, inclusive os identificadores Alpha. Inclui botão para verificar novamente e abrir a Release oficial.
- Android: consulta `https://raw.githubusercontent.com/ismaelrdv2/rdv_bus_graphic/main/updates/mobile.json`. O índice público contém **somente metadados**; o código Android e o APK continuam privados no repositório `ismaelrdv2/RDV-Bus-Studio-Mobile`. A página da Release poderá exigir login. Quando não houver release publicada, use `{"release":null}` e o aplicativo não mostrará atualização fictícia.
- Em ambos: só mostra uma novidade quando a versão publicada é superior à instalada. Falhas de rede não bloqueiam a abertura nem a edição de projetos. O usuário escolhe quando abrir a atualização. Não há instalação silenciosa.

### Atualizar o índice Mobile

**Somente após publicar e testar um APK instalável e assinado**, substituir o objeto `release` em `updates/mobile.json` no repositório público por:

```json
{
  "schema": 1,
  "channel": "alpha",
  "release": {
    "version": "0.1.0-alpha.3.9",
    "url": "https://github.com/ismaelrdv2/RDV-Bus-Studio-Mobile/releases/tag/v0.1.0-alpha.3.9",
    "notes": "Correções publicadas",
    "publishedAt": "2026-11-13T12:00:00Z"
  }
}
```

O exemplo acima **não é uma release publicada**, não representa disponibilidade real e não deve ser gravado em `main` antes da publicação.

## Substituir instalação anterior preservando dados

### Windows (Tauri / NSIS)

Distribuir a versão atualizada como o **mesmo identificador Tauri** e um instalador NSIS assinado. Rodar o instalador sobre o aplicativo instalado. Não remover diretórios de dados do usuário (`AppData`, projetos, exportações); fechar exportações em andamento antes de instalar. Usuários do EXE portátil devem migrar seus arquivos manualmente até existir um atualizador para a distribuição portátil.

### Linux (AppImage)

Nunca apagar uma AppImage arbitrária a partir de caminhos do usuário. A substituição automatizada segura requer o **Tauri updater**, chave pública incorporada ao aplicativo, pacote AppImage com assinatura gerada em CI e endpoint de atualização por plataforma. Após a instalação verificada, o atualizador deve substituir apenas o binário que gerencia, sem tocar `~/Downloads`, projetos JSON ou preferências de usuário. Até essa infraestrutura existir, baixar a nova AppImage da Release oficial e substituir manualmente a anterior.

### Android (Capacitor / APK)

Atualizar por cima do aplicativo existente via Package Installer. São obrigatórios: **mesmo applicationId**, **mesma assinatura (ou rotação válida)**, e **versionCode igual ou superior**. O APK de depuração produzido atualmente no CI não garante assinatura persistente entre execuções e **não deve** ser tratado como instalador atualizável. Configurar uma chave de release persistente e protegida como segredo no GitHub Actions, definir `versionCode` crescente, publicar a Release e testar instalação sobre a versão anterior. **Nunca desinstalar o APK antigo**, pois isso apagaria os dados locais.

## Etapa futura para atualização automática

1. Gerar a chave de assinatura do atualizador Tauri e guardar apenas a **chave privada** nos segredos do CI. Incorporar a chave pública no `tauri.conf.json`.
2. Habilitar `tauri-plugin-updater` e artefatos de atualização assinados, publicar manifesto `latest.json` com URLs e assinaturas nas GitHub Releases.
3. Preparar e validar um APK de release Android com keystore persistente e `versionCode` crescente. Decidir se o pacote será distribuído de forma autenticada (repositório privado) ou por um canal público separado.
4. Apenas depois, habilitar a instalação assistida dentro do aplicativo com confirmação explícita, tratamento de falhas, verificação de assinatura e preservação dos dados.

**Fontes oficiais:** https://v2.tauri.app/plugin/updater/ e https://developer.android.com/google/play/app-updates

Não armazenar certificados privados, tokens ou senhas em código-fonte, versão Web ou metadados públicos.
