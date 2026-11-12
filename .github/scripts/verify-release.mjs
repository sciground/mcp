import assert from 'node:assert/strict';
import {readFileSync, existsSync, lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const draft = args.includes('--draft');
const manifestIndex = args.indexOf('--pack-manifest');
const aliasIndex = args.indexOf('--alias');
const alias = aliasIndex === -1 ? undefined : args[aliasIndex + 1];
assert.ok(aliasIndex === -1 || ['sciground', 'sciground-mcp'].includes(alias), 'Unknown compatibility package');
const root = alias ? join(sourceRoot, 'aliases', alias) : sourceRoot;
const entry = alias ? 'bin/launch.mjs' : 'bin/sciground-mcp.mjs';
const allowed = new Set(['package.json', 'README.md', entry, ...(!alias ? ['connection.json'] : [])]);
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const readme = readFileSync(join(root, 'README.md'), 'utf8');

assert.equal(pkg.name, alias || '@sciground/mcp');
assert.equal(pkg.version, '0.1.0');
assert.ok(pkg.description.includes('SciGround MCP (Public Beta)'));
if (!alias) assert.equal(pkg.mcpName, 'ai.licklider/sciground');
assert.equal(pkg.repository?.url, 'git+https://github.com/sciground/mcp.git');
assert.equal(pkg.publishConfig?.registry, 'https://registry.npmjs.org/');
assert.equal(pkg.publishConfig?.access, 'public');
assert.equal(pkg.publishConfig?.tag, 'latest');
assert.equal(pkg.engines?.node, '>=24.0.0');
assert.deepEqual(pkg.files, [entry, ...(!alias ? ['connection.json'] : [])]);
assert.deepEqual(pkg.dependencies, alias ? {'@sciground/mcp': '0.1.0'} : {'mcp-remote': '0.16.6'});
assert.equal(pkg.scripts, undefined, 'Package lifecycle scripts require separate review');
for (const text of ['Public Beta', 'Claude Web', 'study_create', 'study_current', 'study_diagnostics']) {
  assert.ok(readme.includes(text), `Missing release scope: ${text}`);
}

const blockers = [];
const connection = JSON.parse(readFileSync(join(sourceRoot, 'connection.json'), 'utf8'));
assert.equal(connection.url, 'https://sciground-api-mcp-845495614928.us-west2.run.app/mcp');
assert.equal(connection.resource, connection.url);
assert.equal(connection.scope, 'sciground:access');
assert.equal(connection.callbackPort, 3334);
if (!connection.clientId && !connection.clientMetadataUrl) blockers.push('approved npx OAuth client binding and production acceptance are pending');
assert.ok(!(connection.clientId && connection.clientMetadataUrl), 'Select one existing OAuth client binding');
if (pkg.private !== false) blockers.push('publication has not been explicitly enabled with private=false');
if (!existsSync(join(root, entry))) blockers.push('accepted npx executable has not been delivered');
if (JSON.stringify(pkg.bin) !== JSON.stringify({[alias || 'sciground-mcp']:entry})) blockers.push('single executable bin mapping has not been accepted');
if (/Release preparation only|not implemented or verified|unpublished|not yet been accepted|remains unverified|npx OAuth acceptance is pending/i.test(readme)) blockers.push('README is still a draft or npx OAuth acceptance is pending');
if (existsSync(join(root, entry))) {
  assert.ok(lstatSync(join(root, entry)).isFile() && !lstatSync(join(root, entry)).isSymbolicLink());
  assert.ok(readFileSync(join(root, entry), 'utf8').startsWith('#!/usr/bin/env node\n'), 'Expected a Node.js executable');
}
if (process.env.GITHUB_ACTIONS === 'true') {
  assert.equal(process.env.GITHUB_REPOSITORY, 'sciground/mcp');
  assert.equal(process.env.GITHUB_REF, 'refs/heads/main');
}

if (manifestIndex !== -1) {
  assert.ok(args[manifestIndex + 1], 'Missing pack manifest path');
  const packed = JSON.parse(readFileSync(args[manifestIndex + 1], 'utf8'));
  assert.equal(packed.length, 1);
  assert.equal(packed[0].name, pkg.name);
  assert.equal(packed[0].version, pkg.version);
  assert.deepEqual(packed[0].bundled, []);
  const paths = packed[0].files.map(file => file.path).sort();
  for (const path of paths) assert.ok(allowed.has(path), `Unreviewed package file: ${path}`);
  assert.ok(paths.includes('package.json') && paths.includes('README.md'));
  if (!draft) assert.deepEqual(paths, [...allowed].sort());
  for (const path of paths) {
    const text = readFileSync(join(root, path), 'utf8');
    assert.ok(!/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----|\bnpm_[A-Za-z0-9]{24,}|\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(text), `Secret-like content requires review: ${path}`);
  }
}

if (draft) {
  console.log(JSON.stringify({status:blockers.length ? 'DRAFT_ONLY' : 'INSPECTION_ONLY', blockers}));
} else {
  if (blockers.length) {
    console.error('RELEASE_BLOCKED: ' + blockers.join('; '));
    process.exitCode = 1;
  } else {
    console.log('Release metadata and selected package files passed; runtime acceptance is a separate requirement.');
  }
}
