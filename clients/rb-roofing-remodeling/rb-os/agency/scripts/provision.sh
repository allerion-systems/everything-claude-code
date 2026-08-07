#!/usr/bin/env bash
# Provision the Allerion Agency for R&B: environment + specialists + coordinator.
# Requires: ANTHROPIC_API_KEY and the Anthropic CLI (`ant`).
# Run from the rb-os/ directory:  bash agency/scripts/provision.sh
set -euo pipefail

: "${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY first}"
command -v ant >/dev/null || { echo "Install the Anthropic CLI (ant) — see agency/README.md"; exit 1; }

echo "==> Creating environment"
ENV_ID=$(ant beta:environments create < agency/environment.yaml --transform id -r)
echo "    environment: $ENV_ID"

echo "==> Creating specialist agents"
declare -A IDS
for f in agency/agents/*.agent.yaml; do
  key=$(basename "$f" .agent.yaml)
  id=$(ant beta:agents create < "$f" --transform id -r)
  IDS[$key]=$id
  echo "    $key -> $id"
done

echo "==> Injecting specialist IDs into the coordinator roster"
cp agency/coordinator.agent.yaml agency/coordinator.resolved.yaml
for key in "${!IDS[@]}"; do
  sed -i "s/agent_REPLACE_${key}/${IDS[$key]}/" agency/coordinator.resolved.yaml
done

echo "==> Creating coordinator"
COORD_ID=$(ant beta:agents create < agency/coordinator.resolved.yaml --transform id -r)

echo
echo "Done. Add these to mcp/.env :"
echo "  RB_AGENCY_COORDINATOR_ID=$COORD_ID"
echo "  RB_AGENCY_ENVIRONMENT_ID=$ENV_ID"
