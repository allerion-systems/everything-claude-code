#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const commandPath = path.join(__dirname, '..', '..', 'commands', 'local-ai.md');
const skillPath = path.join(__dirname, '..', '..', 'skills', 'local-model-deployment', 'SKILL.md');
const manifestPath = path.join(__dirname, '..', '..', 'manifests', 'install-modules.json');

assert.ok(fs.existsSync(commandPath), 'commands/local-ai.md must exist');

const command = fs.readFileSync(commandPath, 'utf8');
const skill = fs.readFileSync(skillPath, 'utf8');

for (const section of [
  '## Usage',
  '## Discovery Gate',
  '## Reference Architecture',
  '## Security Boundaries',
  '## Required Output',
]) {
  assert.ok(command.includes(section), `local-ai command must include ${section}`);
}

for (const guardrail of [
  'explicit approval',
  'least privilege',
  'wake word',
  'retention',
  'Tailscale',
  'Ollama',
  'OpenAI-compatible',
]) {
  assert.ok(command.toLowerCase().includes(guardrail.toLowerCase()),
    `local-ai command must include the ${guardrail} guardrail`);
}

console.log('local-ai command contract passed');

assert.ok(fs.existsSync(skillPath), 'local-model-deployment skill must exist');
for (const requirement of [
  'name: local-model-deployment',
  '## Workflow',
  '## Safety Invariants',
  'loopback',
  'explicit approval',
  'bounded retention',
]) {
  assert.ok(skill.includes(requirement), `local model skill must include ${requirement}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const agenticPatterns = manifest.modules.find(module => module.id === 'agentic-patterns');
assert.ok(agenticPatterns, 'agentic-patterns module must exist');
assert.ok(agenticPatterns.paths.includes('skills/local-model-deployment'),
  'agentic-patterns module must install the local-model-deployment skill');
