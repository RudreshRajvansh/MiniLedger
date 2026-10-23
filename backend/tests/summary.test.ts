import request from 'supertest';
import { app } from '../src/app';
import { testPool, migrateTestDb, cleanTestDb, createTestUser } from './testHelper';

describe('Summary Module', () => {
  let user: { id: string; phone: string; token: string };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await migrateTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
    user = await createTestUser('+919876543210');
  });

  afterAll(async () => {
    await testPool.end();
  });

  it('correctly calculates totalLent, totalRepaid, totalPending, and overdueAmount in one SQL query', async () => {
    // 1. Seed a repaid loan (2000)
    const l1 = await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ friendName: 'Friend 1', amount: 2000, dueDate: '2026-11-01' });

    await request(app)
      .patch(`/api/loans/${l1.body.id}/repay`)
      .set('Authorization', `Bearer ${user.token}`);

    // 2. Seed a future pending loan (3500)
    await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ friendName: 'Friend 2', amount: 3500, dueDate: '2027-01-01' });

    // 3. Seed an overdue pending loan (1500)
    await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ friendName: 'Friend 3', amount: 1500, dueDate: '2025-01-01' });

    // Fetch summary
    const res = await request(app)
      .get('/api/summary')
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalLent: 7000,
      totalRepaid: 2000,
      totalPending: 5000,
      overdueAmount: 1500,
      counts: {
        total: 3,
        repaid: 1,
        pending: 2,
        overdue: 1,
      },
    });
  });

  it('returns zeroes when user has no loans', async () => {
    const res = await request(app)
      .get('/api/summary')
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalLent: 0,
      totalRepaid: 0,
      totalPending: 0,
      overdueAmount: 0,
      counts: {
        total: 0,
        repaid: 0,
        pending: 0,
        overdue: 0,
      },
    });
  });
});
