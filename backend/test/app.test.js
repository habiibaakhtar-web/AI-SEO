import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnvironment } from '../src/config/environment.js';

const config = parseEnvironment({ NODE_ENV: 'test' });

test('liveness succeeds without exposing infrastructure or secrets', async () => {
  const response = await request(createApp({ config })).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.service, 'backend');
  assert.ok(response.headers['x-request-id']);
  assert.equal(response.headers['x-powered-by'], undefined);
});

test('unconfigured database is not reported as ready', async () => {
  const response = await request(createApp({ config })).get('/api/ready');
  assert.equal(response.status, 503);
  assert.equal(response.body.success, false);
});

test('unavailable database produces a safe readiness error', async () => {
  const database = { authenticate: async () => { throw new Error('postgres://password-secret'); } };
  const response = await request(createApp({ config, database })).get('/api/ready');
  assert.equal(response.status, 503);
  assert.ok(!JSON.stringify(response.body).includes('password-secret'));
});

test('database connection without migrated tables is not ready', async () => {
  const database = { authenticate: async () => {}, query: async () => { throw new Error('relation missing'); } };
  const response = await request(createApp({ config, database })).get('/api/ready');
  assert.equal(response.status, 503);
});

test('migrated database is reported ready', async () => {
  const database = { authenticate: async () => {}, query: async () => [] };
  const response = await request(createApp({ config, database })).get('/api/ready');
  assert.equal(response.status, 200);
});

test('malformed JSON has a consistent safe error envelope', async () => {
  const response = await request(createApp({ config })).post('/api/unknown').set('Content-Type', 'application/json').send('{broken');
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { success: false, message: 'Request body must be valid JSON.' });
});

test('oversized payload is rejected', async () => {
  const response = await request(createApp({ config })).post('/api/unknown').send({ data: 'a'.repeat(110000) });
  assert.equal(response.status, 413);
});

test('unknown API routes return JSON rather than an HTML traceback', async () => {
  const response = await request(createApp({ config })).get('/api/not-here');
  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

test('CORS grants only the configured frontend origin', async () => {
  const app = createApp({ config });
  for (const origin of [config.FRONTEND_ORIGIN, 'https://untrusted.example']) {
    const response = await request(app).get('/api/health').set('Origin', origin);
    assert.equal(response.headers['access-control-allow-origin'], config.FRONTEND_ORIGIN);
    assert.notEqual(response.headers['access-control-allow-origin'], '*');
  }
});

test('invalid configuration never includes secret values in an error', () => {
  assert.throws(() => parseEnvironment({ PORT: 'secret-value' }), error =>
    error.message.includes('PORT') && !error.message.includes('secret-value'));
  assert.throws(() => parseEnvironment({ DATABASE_URL: 'https://example.com' }));
  assert.throws(() => parseEnvironment({ NODE_ENV: 'production' }));
});

