import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const BLOCKED_URL_KEYWORDS = ['staging', 'prod', 'production']
const dbUrl = process.env.DATABASE_URL || ''

if (process.env.NODE_ENV !== 'development') {
  console.error('Seed blocked: NODE_ENV must be "development"')
  process.exit(1)
}

if (BLOCKED_URL_KEYWORDS.some(keyword => dbUrl.includes(keyword))) {
  console.error(`Seed blocked: DATABASE_URL appears to point to a staging or production database`)
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  // Wipe existing seed data so re-running is safe
  await prisma.subtask.deleteMany()
  await prisma.task.deleteMany()
  await prisma.user.deleteMany()

  const hashed = await bcrypt.hash('password123', 10)

  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test@smartplanner.com',
      username: 'testuser',
      password: hashed,
    }
  })

  const task1 = await prisma.task.create({
    data: {
      userId: user.id,
      title: 'Complete assignment report',
      type: 'assignment',
      priority: 'high',
      due: '2026-06-01',
      notes: 'Cover deployment pipeline and CI/CD',
      done: false,
      subtasks: {
        create: [
          { title: 'Write introduction', date: '2026-05-20', start: '09:00', end: '10:00', done: true },
          { title: 'Write methodology', date: '2026-05-21', start: '10:00', end: '12:00', done: false },
          { title: 'Write conclusion',  date: '2026-05-22', start: '14:00', end: '15:00', done: false },
        ]
      }
    }
  })

  await prisma.task.create({
    data: {
      userId: user.id,
      title: 'Study for exam',
      type: 'exam',
      priority: 'medium',
      due: '2026-06-10',
      done: false,
      subtasks: {
        create: [
          { title: 'Review lecture notes', date: '2026-06-05', start: '09:00', end: '11:00', done: false },
          { title: 'Practice past papers',  date: '2026-06-08', start: '13:00', end: '15:00', done: false },
        ]
      }
    }
  })

  await prisma.task.create({
    data: {
      userId: user.id,
      title: 'Team meeting prep',
      type: 'other',
      priority: 'low',
      due: '2026-05-19',
      done: true,
    }
  })

  console.log(`Seeded user: ${user.email} / password123`)
  console.log(`Seeded 3 tasks for user id ${user.id}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
