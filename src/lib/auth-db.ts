import 'dotenv/config'
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

