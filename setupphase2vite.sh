#!/usr/bin/env bash
# Erstellt den Feature-Branch chore/phase2-vite und wendet Phase 2 Stufe 1
# (Vite 6 -> 8, @vitejs/plugin-react 5 -> 6, Node 20.19+/22) an.
# Ausfuehren im Projekt-Root, nachdem die v1.1.2-Baseline committet ist.
set -euo pipefail

if [ ! -f package.json ]; then
  echo "FEHLER: keine package.json im aktuellen Verzeichnis. Erst die Baseline entpacken/committen." >&2
  exit 1
fi

# 1. Feature-Branch
git switch -c chore/phase2-vite

# 2. package.json anpassen (sichere JSON-Manipulation via node)
node -e '
const fs=require("fs");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
p.version="1.2.0";
p.engines=p.engines||{}; p.engines.node=">=20.19";
p.dependencies["@vitejs/plugin-react"]="^6.0.0";
p.devDependencies.vite="^8.0.0";
fs.writeFileSync("package.json", JSON.stringify(p,null,2)+"\n");
console.log("package.json: vite ^8.0.0, @vitejs/plugin-react ^6.0.0, engines >=20.19, version 1.2.0");
'

# 3. Node-Version fuer Tooling
printf '22\n' > .nvmrc

# 4. Dockerfile + CI auf Node 22 (Node 18 entfaellt, Vite 7+ verlangt 20.19+/22.12+)
[ -f Dockerfile ] && sed -i 's/node:20-alpine/node:22-alpine/g' Dockerfile || true
[ -f .github/workflows/ci.yml ] && sed -i 's/\[18, 20\]/[20, 22]/' .github/workflows/ci.yml || true

# 5. Commit
git add -A
git commit -m "chore(build): Phase 2 Stufe 1 - Vite 6->8, plugin-react 5->6 (Node 20.19+/22)"

echo ""
echo "FERTIG. Auf Branch chore/phase2-vite."
echo "Naechste Schritte:"
echo "  nvm install && nvm use        # Node 22 aus .nvmrc"
echo "  rm -f package-lock.json && npm install"
echo "  npm run build && npm run lint && npm test"
