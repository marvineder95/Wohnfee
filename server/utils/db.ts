import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function getDb(): mysql.Pool {
  if (pool) return pool
  const config = useRuntimeConfig()
  pool = mysql.createPool({
    host: config.dbHost,
    port: Number(config.dbPort),
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    charset: 'utf8mb4_unicode_ci',
    // DB values are UTC (Docker container) — parse/serialize as UTC to avoid
    // local-timezone shifts on TIMESTAMP columns
    timezone: 'Z',
    // Reine Datumsspalten (DATE) als 'YYYY-MM-DD' liefern statt als Date-Objekt:
    // sonst kommt im Browser "2026-10-06T00:00:00.000Z" an, <input type="date">
    // bleibt leer und beim Speichern ging z. B. die Projekt-Deadline verloren.
    dateStrings: ['DATE'],
    // DECIMAL-Spalten (Preise, Summen) als Zahl statt als Text liefern – sonst
    // formatiert toLocaleString() z. B. "20.40" nicht als „20,40 €"
    decimalNumbers: true
  })
  return pool
}

export async function query<T = any>(sql: string, params?: any): Promise<T[]> {
  const [rows] = await getDb().query(sql, params)
  return rows as T[]
}

export async function queryOne<T = any>(sql: string, params?: any): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows.length ? rows[0] : null
}
