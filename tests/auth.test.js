import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app.js'

// Stub OpenAI so the module-level `new OpenAI()` in ai.js doesn't throw
// when there's no API key in the test environment.
vi.mock('openai', () => ({
  default: class {
    constructor() {
      this.chat = { completions: { create: vi.fn() } }
    }
  },
}))

vi.mock('../prismaClient.js', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

import prisma from '../prismaClient.js'
import bcrypt from 'bcrypt'

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('creates a new user and returns ok: true', async () => {
    prisma.user.findFirst.mockResolvedValue(null)
    bcrypt.hash.mockResolvedValue('hashed_password')
    prisma.user.create.mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      username: 'test',
      password: 'hashed_password',
      createdAt: new Date(),
    })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.user.email).toBe('test@example.com')
    expect(res.body.user.username).toBe('test')
  })

  it('returns 400 when email or username already exists', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      username: 'test',
    })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' })

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toBe('Account already exists')
  })

  it('returns 500 on unexpected database error', async () => {
    prisma.user.findFirst.mockRejectedValue(new Error('DB connection failed'))

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' })

    expect(res.status).toBe(500)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toBe('Server error')
  })
})

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    username: 'test',
    password: 'hashed_password',
  }

  it('logs in successfully with email identifier', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser)
    bcrypt.compare.mockResolvedValue(true)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'test@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.user).toEqual({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      username: 'test',
    })
    // password must NOT be returned
    expect(res.body.user.password).toBeUndefined()
  })

  it('logs in successfully with username identifier', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser)
    bcrypt.compare.mockResolvedValue(true)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'test', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 400 when user is not found', async () => {
    prisma.user.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'nobody@example.com', password: 'password123' })

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toBe('User not found')
  })

  it('returns 400 when password is incorrect', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser)
    bcrypt.compare.mockResolvedValue(false)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'test@example.com', password: 'wrong_password' })

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toBe('Incorrect password')
  })

  it('returns 500 on unexpected database error', async () => {
    prisma.user.findFirst.mockRejectedValue(new Error('DB timeout'))

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'test@example.com', password: 'password123' })

    expect(res.status).toBe(500)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toBe('Server error')
  })
})
