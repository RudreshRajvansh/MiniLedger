import request from 'supertest';
import { app } from '../src/app';
import { testPool, migrateTestDb, cleanTestDb, createTestUser } from './testHelper';

describe('Loans Module', () => {
  let userA: { id: string; phone: string; token: string };
  let userB: { id: string; phone: string; token: string };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await migrateTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
    userA = await createTestUser('+919876543210');
    userB = await createTestUser('+919876543211');
  });

  afterAll(async () => {
    await testPool.end();
  });

  describe('POST /api/loans', () => {
    it('creates a loan and returns 201 with properly mapped fields', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friendName: 'Rohan Sharma',
          amount: 5000,
          dueDate: '2026-11-15',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.friendName).toBe('Rohan Sharma');
      expect(res.body.amount).toBe(5000);
      expect(res.body.dueDate).toBe('2026-11-15');
      expect(res.body.status).toBe('pending');
      expect(res.body.isOverdue).toBe(false);
      expect(res.body.daysOverdue).toBe(0);
      expect(res.body.repaidAt).toBeNull();
      expect(res.body.receiptUrl).toBeNull();
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/loans')
        .send({
          friendName: 'Rohan',
          amount: 500,
          dueDate: '2026-11-15',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects zero or negative amount', async () => {
      const resZero = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ friendName: 'Rohan', amount: 0, dueDate: '2026-11-15' });

      expect(resZero.status).toBe(400);
      expect(resZero.body.error.code).toBe('VALIDATION_ERROR');

      const resNeg = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ friendName: 'Rohan', amount: -500, dueDate: '2026-11-15' });

      expect(resNeg.status).toBe(400);
      expect(resNeg.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects missing or empty friend name', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ friendName: '   ', amount: 1000, dueDate: '2026-11-15' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid date format', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ friendName: 'Rohan', amount: 1000, dueDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('allows past due dates (for logging older/overdue loans)', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friendName: 'Amit',
          amount: 1500,
          dueDate: '2025-01-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.isOverdue).toBe(true);
      expect(res.body.daysOverdue).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/loans/:id/repay', () => {
    it('successfully marks pending loan as repaid', async () => {
      const createRes = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ friendName: 'Suresh', amount: 2000, dueDate: '2026-12-01' });

      const loanId = createRes.body.id;

      const repayRes = await request(app)
        .patch(`/api/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(repayRes.status).toBe(200);
      expect(repayRes.body.status).toBe('repaid');
      expect(repayRes.body.repaidAt).not.toBeNull();
    });

    it('returns 409 conflict when repaying an already repaid loan', async () => {
      const createRes = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ friendName: 'Suresh', amount: 2000, dueDate: '2026-12-01' });

      const loanId = createRes.body.id;

      // First repay
      await request(app)
        .patch(`/api/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${userA.token}`);

      // Second repay
      const secondRepay = await request(app)
        .patch(`/api/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(secondRepay.status).toBe(409);
      expect(secondRepay.body.error.code).toBe('ALREADY_REPAID');
    });

    it('returns 404 when user A attempts to repay user B loan', async () => {
      // User B creates a loan
      const bLoan = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ friendName: 'User B Friend', amount: 3000, dueDate: '2026-12-01' });

      // User A tries to repay it
      const res = await request(app)
        .patch(`/api/loans/${bLoan.body.id}/repay`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Authorization Isolation & Filtering', () => {
    it('user A cannot view or list user B loans', async () => {
      // Create a loan for user A
      await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ friendName: 'Friend A', amount: 1000, dueDate: '2026-12-01' });

      // Create a loan for user B
      const bLoan = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ friendName: 'Friend B', amount: 2000, dueDate: '2026-12-01' });

      // User A listing loans only sees their own
      const listA = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(listA.status).toBe(200);
      expect(listA.body).toHaveLength(1);
      expect(listA.body[0].friendName).toBe('Friend A');

      // User A trying to get user B's loan directly gets 404
      const getB = await request(app)
        .get(`/api/loans/${bLoan.body.id}`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(getB.status).toBe(404);
      expect(getB.body.error.code).toBe('NOT_FOUND');
    });
  });
});
