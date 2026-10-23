import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { app } from '../src/app';
import { testPool, migrateTestDb, cleanTestDb, createTestUser } from './testHelper';

describe('Receipt Uploads', () => {
  let user: { id: string; phone: string; token: string };
  let loanId: string;
  const tempFiles: string[] = [];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await migrateTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
    user = await createTestUser('+919876543210');

    // Create a loan to attach receipts to
    const res = await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ friendName: 'Deepak', amount: 800, dueDate: '2026-11-20' });

    loanId = res.body.id;
  });

  afterAll(async () => {
    await testPool.end();
    // Clean up any test dummy files
    for (const file of tempFiles) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it('successfully uploads valid JPEG receipt and returns full receiptUrl', async () => {
    const dummyJpeg = path.join(__dirname, 'test_receipt.jpg');
    // Minimal valid 1x1 JPEG buffer
    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
      0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09,
      0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0xff,
      0xd9,
    ]);
    fs.writeFileSync(dummyJpeg, jpegBuffer);
    tempFiles.push(dummyJpeg);

    const res = await request(app)
      .post(`/api/loans/${loanId}/receipt`)
      .set('Authorization', `Bearer ${user.token}`)
      .attach('receipt', dummyJpeg);

    expect(res.status).toBe(200);
    expect(res.body.receiptUrl).toMatch(/^http:\/\/localhost:3000\/uploads\/[a-f0-9]+\.jpg$/i);
  });

  it('rejects non-image files (e.g. text/pdf)', async () => {
    const textFile = path.join(__dirname, 'test_fake.txt');
    fs.writeFileSync(textFile, 'This is a text file, not a receipt image.');
    tempFiles.push(textFile);

    const res = await request(app)
      .post(`/api/loans/${loanId}/receipt`)
      .set('Authorization', `Bearer ${user.token}`)
      .attach('receipt', textFile);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE');
  });

  it('rejects files larger than 5 MB', async () => {
    const bigFile = path.join(__dirname, 'big_file.jpg');
    // Create 5.5 MB buffer
    const largeBuffer = Buffer.alloc(5.5 * 1024 * 1024);
    fs.writeFileSync(bigFile, largeBuffer);
    tempFiles.push(bigFile);

    const res = await request(app)
      .post(`/api/loans/${loanId}/receipt`)
      .set('Authorization', `Bearer ${user.token}`)
      .attach('receipt', bigFile);

    // Multer or custom error handler returns 400 or 500/LIMIT_FILE_SIZE
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
