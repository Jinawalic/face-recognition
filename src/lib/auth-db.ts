import 'dotenv/config'
import crypto from 'node:crypto'
import pg from 'pg'

type AdminRow = {
  id: string
  username: string
  password: string
}

type StudentRow = {
  id: string
  matricNumber: string
  firstName: string
  lastName: string
  surname: string | null
  department: string | null
  isBanned: boolean
}

type StudentRegistrationInput = {
  matricNumber: string
  fullName: string
}

let pool: pg.Pool | null = null

function getPool() {
  if (pool) return pool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  pool = new pg.Pool({ connectionString })
  return pool
}

export async function findAdminByUsername(username: string): Promise<AdminRow | null> {
  const { rows } = await getPool().query<AdminRow>(
    'SELECT id, username, password FROM "Admin" WHERE username = $1 LIMIT 1',
    [username]
  )

  return rows[0] ?? null
}

export async function findStudentByMatricNumber(matricNumber: string): Promise<StudentRow | null> {
  const { rows } = await getPool().query<StudentRow>(
    'SELECT id, "matricNumber", "firstName", "lastName", surname, department, "isBanned" FROM "Student" WHERE "matricNumber" = $1 LIMIT 1',
    [matricNumber]
  )

  return rows[0] ?? null
}

export async function upsertStudentAccount({
  matricNumber,
  fullName,
}: StudentRegistrationInput): Promise<StudentRow> {
  const normalizedMatric = matricNumber.trim().toUpperCase()
  const nameParts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  const firstName = nameParts[0] || normalizedMatric
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName
  const surname = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null

  const { rows } = await getPool().query<StudentRow>(
    `
      INSERT INTO "Student" (id, "matricNumber", "firstName", "lastName", surname, "department", "isBanned", "createdAt", "updatedAt")
      VALUES ($6, $1, $2, $3, $4, $5, false, NOW(), NOW())
      ON CONFLICT ("matricNumber") DO UPDATE SET
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        surname = EXCLUDED.surname,
        "updatedAt" = NOW()
      RETURNING id, "matricNumber", "firstName", "lastName", surname, department, "isBanned"
    `,
    [normalizedMatric, firstName, lastName, surname, null, crypto.randomUUID()]
  )

  return rows[0]
}
