// Tests for project filtering API
const request = require('supertest');
const express = require('express');
const app = require('../src/app'); // assuming app exports the express instance

describe('GET /api/projects', () => {
  test('returns all projects when no filters', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('filters by search keyword', async () => {
    const res = await request(app).get('/api/projects?search=one');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toContain('One');
  });

  test('filters by tags', async () => {
    const res = await request(app).get('/api/projects?tags=Web');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].tags).toContain('Web');
  });

  test('combines search and tags', async () => {
    const res = await request(app).get('/api/projects?search=project&tags=Mobile');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].tags).toContain('Mobile');
  });
});
