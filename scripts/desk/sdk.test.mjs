// The real @anthropic-ai/sdk, pointed at a local stand-in server. Checks what actually goes over the wire for the two kinds of call the desk makes.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { callJson } from './model.mjs';

function standIn(responder) {
  const seen = [];
  return new Promise((ok) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        seen.push({ url: req.url, headers: req.headers, body: JSON.parse(body || '{}') });
        const [status, payload] = responder(seen.length);
        res.statusCode = status;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(payload));
      });
    });
    server.listen(0, '127.0.0.1', () => ok({ server, seen, baseURL: `http://127.0.0.1:${server.address().port}` }));
  });
}

const message = (obj, extra = {}) => ({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [{ type: 'text', text: JSON.stringify(obj) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 }, ...extra });
const SCHEMA = { type: 'object', additionalProperties: false, required: ['ok'], properties: { ok: { type: 'boolean' } } };

test('triage-style call: POST /v1/messages with effort and a json_schema format', async () => {
  const { server, seen, baseURL } = await standIn(() => [200, message({ ok: true })]);
  try {
    const client = new Anthropic({ apiKey: 'test-key', baseURL, maxRetries: 0 });
    const r = await callJson({ client, cfg: { model: 'claude-haiku-5-5', effort: 'low', maxTokens: 8000 }, system: 'SYS', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA });
    assert.deepEqual([r.ok, r.data], [true, { ok: true }]);
    const req = seen[0];
    assert.equal(req.url, '/v1/messages');
    assert.ok(req.headers['x-api-key'] === 'test-key' || req.headers.authorization === 'Bearer test-key');   // SDK 1.8.0 sends the key as a bearer token
    assert.ok(req.headers['anthropic-version']);
    assert.equal(req.body.model, 'claude-haiku-5-5');
    assert.equal(req.body.max_tokens, 8000);
    assert.deepEqual(req.body.output_config, { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } });
    assert.deepEqual(req.body.system, [{ type: 'text', text: 'SYS', cache_control: { type: 'ephemeral' } }]);
    assert.equal(req.body.temperature, undefined);
  } finally { server.close(); }
});

test('draft-style call: the beta endpoint carries the fallback header and parameter', async () => {
  const { server, seen, baseURL } = await standIn(() => [200, message({ ok: true })]);
  try {
    const client = new Anthropic({ apiKey: 'test-key', baseURL, maxRetries: 0 });
    const r = await callJson({ client, cfg: { model: 'claude-sonnet-5-5', effort: 'high', maxTokens: 16000, fallbacks: 'default' }, system: 'SYS', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA });
    assert.equal(r.ok, true);
    const req = seen[0];
    assert.match(req.url, /^\/v1\/messages(\?beta=true)?$/);
    assert.match(req.headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
    assert.equal(req.body.fallbacks, 'default');
    assert.equal(req.body.betas, undefined);                                                      // sent as a header, not in the body
    assert.deepEqual(req.body.output_config.format.type, 'json_schema');
    assert.equal(req.body.output_config.effort, 'high');
  } finally { server.close(); }
});

test('the SDK errors and refusals come back as results, not exceptions', async () => {
  for (const [status, payload, reason] of [
    [400, { type: 'error', error: { type: 'invalid_request_error', message: 'bad' } }, 'api_error'],
    [401, { type: 'error', error: { type: 'authentication_error', message: 'no' } }, 'api_error'],
    [200, message({}, { content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'cyber', explanation: 'x' } }), 'refusal'],
  ]) {
    const { server, baseURL } = await standIn(() => [status, payload]);
    try {
      const client = new Anthropic({ apiKey: 'test-key', baseURL, maxRetries: 0 });
      const r = await callJson({ client, cfg: { model: 'claude-sonnet-5-5', effort: 'high', maxTokens: 100 }, system: 's', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA });
      assert.deepEqual([r.ok, r.reason], [false, reason]);
    } finally { server.close(); }
  }
});

test('a retryable error is retried by the SDK before giving up', async () => {
  const { server, seen, baseURL } = await standIn((n) => (n === 1 ? [529, { type: 'error', error: { type: 'overloaded_error', message: 'busy' } }] : [200, message({ ok: true })]));
  try {
    const client = new Anthropic({ apiKey: 'test-key', baseURL, maxRetries: 2 });
    const r = await callJson({ client, cfg: { model: 'claude-haiku-5-5', effort: 'low', maxTokens: 100 }, system: 's', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA });
    assert.equal(r.ok, true);
    assert.equal(seen.length, 2);
  } finally { server.close(); }
});
