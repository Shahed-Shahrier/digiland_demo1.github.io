import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Basic users endpoints (read-only / create)
app.get('/api/users', async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const { name, email, password, role, phone, nid, address } = req.body;
  try {
    const u = await prisma.user.create({ data: { name, email, password, role, phone, nid, address } });
    res.status(201).json(u);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Applications list
app.get('/api/applications', async (_req, res) => {
  const apps = await prisma.application.findMany({ include: { documents: true, comments: true, verificationNotes: true } });
  res.json(apps);
});

app.get('/api/applications/:id', async (req, res) => {
  const id = req.params.id;
  const appData = await prisma.application.findUnique({ where: { id }, include: { documents: true, comments: true, verificationNotes: true } });
  if (!appData) return res.status(404).json({ error: 'Not found' });
  res.json(appData);
});

// Add a notification
app.post('/api/notifications', async (req, res) => {
  const data = req.body;
  try {
    const notif = await prisma.notification.create({ data });
    res.status(201).json(notif);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Simple seed check route
app.post('/api/seed-check', async (_req, res) => {
  const users = await prisma.user.count();
  res.json({ users });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
