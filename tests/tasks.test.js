import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app.js'

vi.mock('openai', () => ({
  default: class {
    constructor() {
      this.chat = { completions: { create: vi.fn() } }
    }
  },
}))

vi.mock('../prismaClient.js', () => ({
  default: {
    task: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    subtask: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import prisma from '../prismaClient.js'

beforeEach(() => {
  vi.clearAllMocks()
})

const mockSubtask = { id: 10, taskId: 1, title: 'Subtask A', date: '2025-06-01', start: '09:00', end: '10:00', done: false }
const mockTask = { id: 1, userId: 42, title: 'Test Task', type: 'assignment', priority: 'high', due: '2025-06-01', notes: null, done: false, createdAt: new Date(), subtasks: [mockSubtask] }

// ─── GET /api/tasks ───────────────────────────────────────────────────────────

describe('GET /api/tasks', () => {
  it('returns tasks for a valid userId', async () => {
    prisma.task.findMany.mockResolvedValue([mockTask])

    const res = await request(app).get('/api/tasks?userId=42')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('Test Task')
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 42 } })
    )
  })

  it('returns 400 when userId is missing', async () => {
    const res = await request(app).get('/api/tasks')

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })

  it('returns 500 on database error', async () => {
    prisma.task.findMany.mockRejectedValue(new Error('DB error'))

    const res = await request(app).get('/api/tasks?userId=42')

    expect(res.status).toBe(500)
    expect(res.body.ok).toBe(false)
  })
})

// ─── POST /api/tasks ──────────────────────────────────────────────────────────

describe('POST /api/tasks', () => {
  it('creates a task with subtasks and returns it', async () => {
    prisma.task.create.mockResolvedValue(mockTask)

    const res = await request(app)
      .post('/api/tasks')
      .send({
        userId: 42,
        title: 'Test Task',
        type: 'assignment',
        priority: 'high',
        due: '2025-06-01',
        subtasks: [{ title: 'Subtask A', date: '2025-06-01', start: '09:00', end: '10:00' }],
      })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.task.title).toBe('Test Task')
    expect(res.body.task.subtasks).toHaveLength(1)
  })

  it('creates a task with no subtasks', async () => {
    prisma.task.create.mockResolvedValue({ ...mockTask, subtasks: [] })

    const res = await request(app)
      .post('/api/tasks')
      .send({ userId: 42, title: 'Simple Task', due: '2025-06-01' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 500 on database error', async () => {
    prisma.task.create.mockRejectedValue(new Error('DB error'))

    const res = await request(app)
      .post('/api/tasks')
      .send({ userId: 42, title: 'Test Task', due: '2025-06-01' })

    expect(res.status).toBe(500)
    expect(res.body.ok).toBe(false)
  })
})

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────

describe('PATCH /api/tasks/:id', () => {
  it('updates allowed fields and returns the updated task', async () => {
    const updated = { ...mockTask, title: 'Updated Title', done: true }
    prisma.task.update.mockResolvedValue(updated)

    const res = await request(app)
      .patch('/api/tasks/1')
      .send({ title: 'Updated Title', done: true })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.task.title).toBe('Updated Title')
    expect(res.body.task.done).toBe(true)
  })

  it('returns 500 on database error', async () => {
    prisma.task.update.mockRejectedValue(new Error('DB error'))

    const res = await request(app)
      .patch('/api/tasks/1')
      .send({ title: 'Updated Title' })

    expect(res.status).toBe(500)
    expect(res.body.ok).toBe(false)
  })
})

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────

describe('DELETE /api/tasks/:id', () => {
  it('deletes a task and returns ok: true', async () => {
    prisma.task.delete.mockResolvedValue(mockTask)

    const res = await request(app).delete('/api/tasks/1')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('returns 500 on database error', async () => {
    prisma.task.delete.mockRejectedValue(new Error('DB error'))

    const res = await request(app).delete('/api/tasks/1')

    expect(res.status).toBe(500)
    expect(res.body.ok).toBe(false)
  })
})

// ─── PATCH /api/tasks/:id/toggle ─────────────────────────────────────────────

describe('PATCH /api/tasks/:id/toggle', () => {
  it('toggles task from incomplete to done, cascading to subtasks', async () => {
    prisma.task.findUnique.mockResolvedValue({ ...mockTask, done: false })
    prisma.task.update.mockResolvedValue({ ...mockTask, done: true, subtasks: [{ ...mockSubtask, done: true }] })

    const res = await request(app).patch('/api/tasks/1/toggle')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.task.done).toBe(true)
    expect(res.body.task.subtasks[0].done).toBe(true)
  })

  it('toggles task from done back to incomplete', async () => {
    prisma.task.findUnique.mockResolvedValue({ ...mockTask, done: true })
    prisma.task.update.mockResolvedValue({ ...mockTask, done: false, subtasks: [{ ...mockSubtask, done: false }] })

    const res = await request(app).patch('/api/tasks/1/toggle')

    expect(res.status).toBe(200)
    expect(res.body.task.done).toBe(false)
  })

  it('returns 500 on database error', async () => {
    prisma.task.findUnique.mockRejectedValue(new Error('DB error'))

    const res = await request(app).patch('/api/tasks/1/toggle')

    expect(res.status).toBe(500)
    expect(res.body.ok).toBe(false)
  })
})

// ─── PATCH /api/tasks/:taskId/subtasks/:subtaskId/toggle ─────────────────────

describe('PATCH /api/tasks/:taskId/subtasks/:subtaskId/toggle', () => {
  it('toggles subtask done and marks parent done when all subtasks complete', async () => {
    prisma.subtask.findUnique.mockResolvedValue({ ...mockSubtask, done: false })
    prisma.subtask.update.mockResolvedValue({ ...mockSubtask, done: true })
    prisma.subtask.findMany.mockResolvedValue([{ ...mockSubtask, done: true }])
    prisma.task.update.mockResolvedValue({ ...mockTask, done: true, subtasks: [{ ...mockSubtask, done: true }] })

    const res = await request(app).patch('/api/tasks/1/subtasks/10/toggle')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.task.done).toBe(true)
  })

  it('keeps parent incomplete when not all subtasks are done', async () => {
    const subtask2 = { id: 11, taskId: 1, done: false }
    prisma.subtask.findUnique.mockResolvedValue({ ...mockSubtask, done: false })
    prisma.subtask.update.mockResolvedValue({ ...mockSubtask, done: true })
    prisma.subtask.findMany.mockResolvedValue([{ ...mockSubtask, done: true }, subtask2])
    prisma.task.update.mockResolvedValue({ ...mockTask, done: false })

    const res = await request(app).patch('/api/tasks/1/subtasks/10/toggle')

    expect(res.status).toBe(200)
    expect(res.body.task.done).toBe(false)
  })

  it('returns 500 on database error', async () => {
    prisma.subtask.findUnique.mockRejectedValue(new Error('DB error'))

    const res = await request(app).patch('/api/tasks/1/subtasks/10/toggle')

    expect(res.status).toBe(500)
    expect(res.body.ok).toBe(false)
  })
})

// ─── DELETE /api/tasks/:taskId/subtasks/:subtaskId ────────────────────────────

describe('DELETE /api/tasks/:taskId/subtasks/:subtaskId', () => {
  it('deletes a subtask and returns ok: true', async () => {
    prisma.subtask.delete.mockResolvedValue(mockSubtask)

    const res = await request(app).delete('/api/tasks/1/subtasks/10')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(prisma.subtask.delete).toHaveBeenCalledWith({ where: { id: 10 } })
  })

  it('returns 500 on database error', async () => {
    prisma.subtask.delete.mockRejectedValue(new Error('DB error'))

    const res = await request(app).delete('/api/tasks/1/subtasks/10')

    expect(res.status).toBe(500)
    expect(res.body.ok).toBe(false)
  })
})
