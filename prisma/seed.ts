import { PrismaClient } from './generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import "dotenv/config"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminEmail = 'admin@gmail.com'
  const adminPassword = '12345678'

  console.log('Seeding admin...')
  await prisma.admin.upsert({
    where: { username: adminEmail },
    update: { password: adminPassword },
    create: {
      username: adminEmail,
      password: adminPassword, 
    },
  })

  console.log('Seeding sample student...')
  await prisma.student.upsert({
    where: { matricNumber: 'CSC/21/001' },
    update: {},
    create: {
      matricNumber: 'CSC/21/001',
      firstName: 'John',
      lastName: 'Doe',
      surname: 'Smith',
      department: 'Computer Science'
    }
  })

  console.log('Seeding sample exam...')
  const exam = await prisma.exam.create({
    data: {
      title: 'General Computer Science',
      description: 'Introduction to Computer Science and Logic',
      duration: 30,
      questions: {
        create: [
          {
            questionText: 'What does CPU stand for?',
            options: [
              'Central Processing Unit',
              'Computer Personal Unit',
              'Central Power Unit',
              'Core Processing Unit'
            ],
            correctIndex: 0
          },
          {
            questionText: 'Which language is used for web styling?',
            options: ['HTML', 'Python', 'CSS', 'Java'],
            correctIndex: 2
          },
          {
            questionText: 'Which of the following is an operating system?',
            options: ['Chrome', 'Windows', 'React', 'PowerPoint'],
            correctIndex: 1
          }
        ]
      }
    }
  })

  console.log('Seed successful!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
