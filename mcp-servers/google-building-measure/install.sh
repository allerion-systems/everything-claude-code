#!/bin/bash
# One-shot installer for google-building-measure MCP server
# Usage: bash install.sh

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Google Building Measure — Installer                    ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Check Node.js ──────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}❌ Node.js is not installed.${NC}"
  echo ""
  echo "Install it from: https://nodejs.org  (click the big green LTS button)"
  echo "Then run this script again."
  exit 1
fi

NODE_VER=$(node -e "process.exit(parseInt(process.versions.node) < 18 ? 1 : 0)" 2>/dev/null && echo "ok" || echo "old")
if [ "$NODE_VER" = "old" ]; then
  echo -e "${RED}❌ Node.js is too old. Please install v18 or newer from https://nodejs.org${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"

# ── Locate the server directory ────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${GREEN}✓ Server directory: $SCRIPT_DIR${NC}"

# ── Collect API keys ───────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Enter your API keys (they stay on your computer, never sent to chat)${NC}"
echo ""

echo -e "${YELLOW}KEY 1 — Google Maps API Key${NC}"
echo "  Get it: console.cloud.google.com → Credentials"
echo "  (needs: Geocoding, Maps Static, Street View, Solar, Aerial View APIs enabled)"
read -rp "  Paste here: " MAPS_KEY
echo ""

echo -e "${YELLOW}KEY 2 — Google Gemini API Key (FREE)${NC}"
echo "  Get it: aistudio.google.com → Get API key"
read -rp "  Paste here: " GEMINI_KEY
echo ""

# ── Validate ───────────────────────────────────────────────────────────────
if [ ${#MAPS_KEY} -lt 10 ]; then
  echo -e "${RED}❌ Maps key looks wrong. Run the script again.${NC}"; exit 1
fi
if [ ${#GEMINI_KEY} -lt 10 ]; then
  echo -e "${RED}❌ Gemini key looks wrong. Run the script again.${NC}"; exit 1
fi

# ── Write .env ─────────────────────────────────────────────────────────────
cat > "$SCRIPT_DIR/.env" <<EOF
# Google Building Measure — environment config
# DO NOT share this file or commit it to GitHub

GOOGLE_MAPS_API_KEY=${MAPS_KEY}
GEMINI_API_KEY=${GEMINI_KEY}
VISION_PROVIDER=gemini
GEMINI_MODEL=gemini-2.0-flash
EOF

echo -e "${GREEN}✓ .env file created${NC}"

# ── npm install ────────────────────────────────────────────────────────────
echo ""
echo "📦 Installing dependencies..."
cd "$SCRIPT_DIR" && npm install --silent
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ── Detect Claude Desktop config location ─────────────────────────────────
if [[ "$OSTYPE" == "darwin"* ]]; then
  CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys"* || "$OSTYPE" == "win32" ]]; then
  CLAUDE_CONFIG="$APPDATA/Claude/claude_desktop_config.json"
else
  CLAUDE_CONFIG="$HOME/.config/Claude/claude_desktop_config.json"
fi

INDEX_PATH="$SCRIPT_DIR/src/index.js"

# ── Auto-patch Claude Desktop config ──────────────────────────────────────
MCP_BLOCK=$(cat <<EOF
    "google-building-measure": {
      "command": "node",
      "args": ["$INDEX_PATH"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "$MAPS_KEY",
        "GEMINI_API_KEY": "$GEMINI_KEY",
        "VISION_PROVIDER": "gemini",
        "GEMINI_MODEL": "gemini-2.0-flash"
      }
    }
EOF
)

if [ -f "$CLAUDE_CONFIG" ]; then
  # Check if already configured
  if grep -q "google-building-measure" "$CLAUDE_CONFIG" 2>/dev/null; then
    echo -e "${GREEN}✓ Claude Desktop already has this server configured${NC}"
  else
    # Try to patch it in automatically using node
    node - <<JSEOF
const fs = require('fs');
const path = '$CLAUDE_CONFIG';
let config;
try { config = JSON.parse(fs.readFileSync(path, 'utf8')); } catch { config = {}; }
if (!config.mcpServers) config.mcpServers = {};
config.mcpServers['google-building-measure'] = {
  command: 'node',
  args: ['$INDEX_PATH'],
  env: {
    GOOGLE_MAPS_API_KEY: '$MAPS_KEY',
    GEMINI_API_KEY: '$GEMINI_KEY',
    VISION_PROVIDER: 'gemini',
    GEMINI_MODEL: 'gemini-2.0-flash'
  }
};
fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log('patched');
JSEOF
    echo -e "${GREEN}✓ Claude Desktop config updated automatically${NC}"
  fi
else
  # Create the config file from scratch
  mkdir -p "$(dirname "$CLAUDE_CONFIG")"
  node - <<JSEOF
const fs = require('fs');
const config = {
  mcpServers: {
    'google-building-measure': {
      command: 'node',
      args: ['$INDEX_PATH'],
      env: {
        GOOGLE_MAPS_API_KEY: '$MAPS_KEY',
        GEMINI_API_KEY: '$GEMINI_KEY',
        VISION_PROVIDER: 'gemini',
        GEMINI_MODEL: 'gemini-2.0-flash'
      }
    }
  }
};
fs.writeFileSync('$CLAUDE_CONFIG', JSON.stringify(config, null, 2));
JSEOF
  echo -e "${GREEN}✓ Claude Desktop config created at: $CLAUDE_CONFIG${NC}"
fi

# ── Done ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   ✅  All done! Restart Claude Desktop and test it.      ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  In Claude Desktop, type:"
echo ""
echo -e "  ${BOLD}Run generate_roofr_report on 5396 Georgetown Greenville Road, Greenville IN 47124${NC}"
echo ""
echo "  You should get a full Roofr-style report back."
echo ""
