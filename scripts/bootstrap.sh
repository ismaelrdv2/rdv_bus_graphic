#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
echo "RDV Bus Studio 0.1.0-alpha.1 — instalação de dependências"
command -v node >/dev/null || { echo "Instale Node.js 22.12+" >&2; exit 1; }
command -v npm >/dev/null || { echo "Instale npm" >&2; exit 1; }
node -v
npm install
npm run check
npm run build
echo "Frontend compilado. Arquivo package-lock.json criado/atualizado pelo npm."
echo "Para abrir no desktop: npm run desktop:dev (Rust e bibliotecas Tauri necessários)."
