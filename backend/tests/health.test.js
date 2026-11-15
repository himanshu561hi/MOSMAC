import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Backend Foundation & Health API Tests', () => {
  it('GET /api/v1/health should return 200 with standard response envelope', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.statusCode).toBe(200);
    expect(res.body.message).toBe('Server is running');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('UP');
    expect(res.body.data.environment).toBeDefined();
  });

  it('GET /api/v1/health should include security headers from Helmet', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /api/v1/nonexistent should return 404 with structured error envelope', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.statusCode).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.message).toContain('Endpoint not found');
    expect(res.body.requestId).toBeDefined();
  });

  it('POST with malformed JSON body should return 400 with BAD_REQUEST code', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"invalidJson": ');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.message).toContain('Malformed JSON payload');
  });
});

