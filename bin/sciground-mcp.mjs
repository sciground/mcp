#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const connection = JSON.parse(readFileSync(new URL('../connection.json', import.meta.url), 'utf8'));

export function proxyArguments(config) {
  const clientId = config.clientId;
  const metadataUrl = config.clientMetadataUrl;
  if ((!clientId && !metadataUrl) || (clientId && metadataUrl)) {
    throw new Error('A single approved public OAuth client ID or client metadata URL is required.');
  }
  if (metadataUrl) {
    const url = new URL(metadataUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname === '/') {
      throw new Error('The public OAuth client metadata URL must be HTTPS with a path and no credentials, query or fragment.');
    }
  }
  const args = [config.url, String(config.callbackPort), '--transport', 'http-only',
    '--resource', config.resource, '--authorize-param', `audience=${config.resource}`,
    '--host', '127.0.0.1', '--bind-host', '127.0.0.1',
    '--static-oauth-client-metadata', JSON.stringify({scope: config.scope, token_endpoint_auth_method: 'none'}),
    '--auth-timeout', '120', '--silent'];
  if (metadataUrl) args.push('--client-metadata-url', metadataUrl);
  else args.push('--static-oauth-client-info', JSON.stringify({client_id: clientId}));
  return args;
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    process.stdout.write(`SciGround MCP (Public Beta) ${pkg.version}\nUsage: npx --yes @sciground/mcp\nConnects stdio to the existing hosted MCP using mcp-remote and its OAuth flow.\nTools and their schemas come from the remote server.\n${connection.clientId || connection.clientMetadataUrl ? '' : 'The public OAuth client binding is not configured; startup will stop before sign-in.\n'}No API keys or client secrets are accepted by this launcher.\n`);
    return;
  }
  if (argv.length === 1 && argv[0] === '--version') {
    process.stdout.write(pkg.version + '\n');
    return;
  }
  if (argv.length) {
    process.stderr.write('Unsupported argument. Use --help.\n');
    process.exitCode = 1;
    return;
  }
  try {
    const args = proxyArguments(connection);
    const proxy = require.resolve('mcp-remote/dist/proxy.js');
    process.argv = [process.execPath, proxy, ...args];
    await import(pathToFileURL(proxy).href);
  } catch {
    process.stderr.write('SciGround MCP could not start. An approved npx OAuth client is required; see the release connection instructions.\n');
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
