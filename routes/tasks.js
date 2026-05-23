import express from 'express'
import prisma from '../prismaClient.js'

const router = express.Router()

router.get('/', async (req, res) => {
  const userId = parseInt(req.query.userId)
  if (!userId) return res.status(400).json({ ok: false, message: 'userId required' })

  try {
    const tasks = await prisma.task.findMany({
      where: { userId },
      include: { subtasks: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(tasks)
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, message: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  const { userId, title, type, priority, due, notes, subtasks = [] } = req.body
  try {
    const task = await prisma.task.create({
      data: {
        userId,
        title,
        type: type || 'other',
        priority: priority || 'medium',
        due,
        notes: notes || null,
        subtasks: {
          create: subtasks.map(s => ({
            title: s.title || '',
            date: s.date || due,
            start: s.start || '',
            end: s.end || '',
          })),
        },
      },
      include: { subtasks: true },
    })
    res.json({ ok: true, task })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, message: 'Server error' })
  }
})

router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { title, type, priority, due, notes, done } = req.body
  try {
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(priority !== undefined && { priority }),
        ...(due !== undefined && { due }),
        ...(notes !== undefined && { notes }),
        ...(done !== undefined && { done }),
      },
      include: { subtasks: true },
    })
    res.json({ ok: true, task })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, message: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, message: 'Server error' })
  }
})

// Toggle task done and cascade to all its subtasks
router.patch('/:id/toggle', async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const current = await prisma.task.findUnique({ where: { id } })
    const newDone = !current.done
    const task = await prisma.task.update({
      where: { id },
      data: {
        done: newDone,
        subtasks: { updateMany: { where: { taskId: id }, data: { done: newDone } } },
      },
      include: { subtasks: true },
    })
    res.json({ ok: true, task })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, message: 'Server error' })
  }
})

// Toggle a single subtask done, then sync parent task done status
router.patch('/:taskId/subtasks/:subtaskId/toggle', async (req, res) => {
  const taskId = parseInt(req.params.taskId)
  const subtaskId = parseInt(req.params.subtaskId)
  try {
    const current = await prisma.subtask.findUnique({ where: { id: subtaskId } })
    await prisma.subtask.update({ where: { id: subtaskId }, data: { done: !current.done } })

    const allSubtasks = await prisma.subtask.findMany({ where: { taskId } })
    const allDone = allSubtasks.length > 0 && allSubtasks.every(s => s.done)
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { done: allDone },
      include: { subtasks: true },
    })
    res.json({ ok: true, task })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, message: 'Server error' })
  }
})

router.delete('/:taskId/subtasks/:subtaskId', async (req, res) => {
  try {
    await prisma.subtask.delete({ where: { id: parseInt(req.params.subtaskId) } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, message: 'Server error' })
  }
})

export default router
