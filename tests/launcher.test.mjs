import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync, spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {proxyArguments} from '../bin/sciground-mcp.mjs';

const require = createRequire(import.meta.url);
const entry = fileURLToPath(new URL('../bin/sciground-mcp.mjs', import.meta.url));
const config = {url: 'https://fixture.invalid/mcp', resource: 'https://fixture.invalid/mcp', scope: 'sciground:access', callbackPort: 3334, clientId: 'public-fixture-client', clientMetadataUrl: null};

test('help/version do not authenticate; missing binding and unsupported arguments fail without reflecting input', () => {
  for (const flag of ['--help', '--version']) {
    const result = spawnSync(process.execPath, [entry, flag], {encoding: 'utf8'});
    assert.equal(result.status, 0);
    assert.match(result.stdout, /0\.1\.0/);
  }
  assert.throws(() => proxyArguments({...config, clientId: null}, {}), /single approved public OAuth client/);
  const rejected = spawnSync(process.execPath, [entry, '--header', 'sensitive-fixture'], {encoding: 'utf8'});
  assert.equal(rejected.status, 1);
  assert.ok(!rejected.stderr.includes('sensitive-fixture'));
});

test('delegates existing OAuth/PKCE and HTTP to the pinned library with loopback callback and intended resource', () => {
  const args = proxyArguments(config);
  for (const item of ['http-only', '127.0.0.1', '3334', '--silent', '--static-oauth-client-info', 'audience=https://fixture.invalid/mcp']) assert.ok(args.includes(item));
  assert.ok(args.includes(JSON.stringify({client_id: 'public-fixture-client'})));
  assert.ok(!args.includes('--allow-http') && !args.includes('--debug'));
  assert.throws(() => proxyArguments({...config, clientId: null}));
  assert.throws(() => proxyArguments({...config, clientMetadataUrl: 'https://client.invalid/metadata.json'}));
  assert.deepEqual(proxyArguments(config, {SCIGROUND_MCP_CLIENT_ID: 'unapproved-fixture'}), args);
  const cimd = proxyArguments({...config, clientId: null, clientMetadataUrl: 'https://client.invalid/metadata.json'});
  assert.ok(cimd.includes('--client-metadata-url'));
  for (const url of ['http://client.invalid/a', 'https://client.invalid/', 'https://user:password@client.invalid/a', 'https://client.invalid/a?secret=x']) {
    assert.throws(() => proxyArguments({...config, clientId: null, clientMetadataUrl: url}));
  }
});

test('real pinned library discovers changed remote tools and schemas, paginates and forwards calls and refusals', {timeout: 20000}, async () => {
  const cache = mkdtempSync(join(tmpdir(), 'sciground-mcp-fixture-'));
  const received = [];
  const notifications = [];
  const firstTool = {name: 'remote_fixture_alpha', description: 'Server-owned fixture', inputSchema: {type: 'object', properties: {payload: {type: 'string'}}, required: ['payload'], additionalProperties: false}};
  const secondTool = {name: 'remote_fixture_beta', inputSchema: {type: 'object', properties: {count: {type: 'integer', minimum: 2}}}};
  const addedTool = {name: 'future_fixture_gamma', inputSchema: {type: 'object', properties: {futureField: {type: 'array', items: {type: 'boolean'}}}, required: ['futureField']}, annotations: {readOnlyHint: true}};
  let catalogVersion = 1;
  const server = createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const message = JSON.parse(raw);
    received.push(message);
    if (!Object.hasOwn(message, 'id')) { res.writeHead(202); res.end(); return; }
    let result = {};
    if (message.method === 'initialize') result = {protocolVersion: '2025-03-26', capabilities: {tools: {listChanged: true}}, serverInfo: {name: 'isolated-fixture', version: '0.1.0'}};
    if (message.method === 'tools/list') result = catalogVersion === 2 ? {tools: [addedTool]} : message.params?.cursor === 'server-page-two' ? {tools: [secondTool]} : {tools: [firstTool], nextCursor: 'server-page-two'};
    if (message.method === 'tools/call') result = message.params.name === addedTool.name ? {content: [{type: 'text', text: JSON.stringify(message.params.arguments)}]} : {isError: true, content: [{type: 'text', text: 'remote_fixture_refused'}]};
    const response = {jsonrpc: '2.0', id: message.id, result};
    if (message.method === 'tools/list' && catalogVersion === 2) {
      res.writeHead(200, {'Content-Type': 'text/event-stream'});
      res.end('event: message\ndata: ' + JSON.stringify({jsonrpc: '2.0', method: 'notifications/tools/list_changed'}) + '\n\nevent: message\ndata: ' + JSON.stringify(response) + '\n\n');
    } else {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(response));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}/mcp`;
  const args = [...proxyArguments({...config, url: endpoint, resource: endpoint}), '--allow-http'];
  const proxy = require.resolve('mcp-remote/dist/proxy.js');
  const source = `process.argv=[process.execPath,${JSON.stringify(proxy)},...${JSON.stringify(args)}]; await import(${JSON.stringify(new URL('file:///' + proxy.replaceAll('\\', '/')).href)});`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', source], {env: {...process.env, MCP_REMOTE_CONFIG_DIR: cache}, stdio: ['pipe', 'pipe', 'pipe']});
  const pending = new Map();
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  createInterface({input: child.stdout}).on('line', line => {
    const message = JSON.parse(line);
    if (message.method) notifications.push(message);
    if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  });
  const request = (id, method, params) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('isolated fixture timed out: ' + stderr.slice(-150))), 5000);
    pending.set(id, value => { clearTimeout(timer); resolve(value); });
    child.stdin.write(JSON.stringify({jsonrpc: '2.0', id, method, params}) + '\n');
  });
  try {
    const initialized = await request(1, 'initialize', {protocolVersion: '2025-03-26', capabilities: {}, clientInfo: {name: 'fixture-client', version: '0.1.0'}});
    assert.equal(initialized.result.serverInfo.name, 'isolated-fixture');
    child.stdin.write(JSON.stringify({jsonrpc: '2.0', method: 'notifications/initialized'}) + '\n');
    const listed = await request(2, 'tools/list', {});
    assert.deepEqual(listed.result, {tools: [firstTool], nextCursor: 'server-page-two'});
    const pageTwo = await request(3, 'tools/list', {cursor: listed.result.nextCursor});
    assert.deepEqual(pageTwo.result, {tools: [secondTool]});
    catalogVersion = 2;
    const updated = await request(4, 'tools/list', {});
    assert.deepEqual(updated.result, {tools: [addedTool]});
    assert.ok(notifications.some(message => message.method === 'notifications/tools/list_changed'));
    const futureArgs = {futureField: [true, false]};
    const called = await request(5, 'tools/call', {name: addedTool.name, arguments: futureArgs});
    assert.deepEqual(called.result.content, [{type: 'text', text: JSON.stringify(futureArgs)}]);
    const refused = await request(6, 'tools/call', {name: 'unsupported-operation', arguments: {}});
    assert.equal(refused.result.isError, true);
    assert.equal(refused.result.content[0].text, 'remote_fixture_refused');
    assert.equal(received.filter(message => message.method === 'tools/call').length, 2);
    assert.deepEqual(received.find(message => message.id && message.params?.name === addedTool.name).params.arguments, futureArgs);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await exited;
    }
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    assert.equal(dirname(resolve(cache)), resolve(tmpdir()));
    assert.ok(cache.startsWith(join(tmpdir(), 'sciground-mcp-fixture-')));
    rmSync(cache, {recursive: true, force: true});
  }
});
