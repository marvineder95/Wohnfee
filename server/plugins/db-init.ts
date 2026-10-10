import adminData from '../../data/admin.json'
import { SCHEMA_SQL, migrateSchema } from '../utils/db-schema'

// Bootstraps the database on server start:
// 1. creates tables if missing + applies column migrations (idempotent)
// 2. seeds the admin user from data/admin.json if the users table is empty
export default defineNitroPlugin(async () => {
  try {
    const { getDb, query, queryOne } = await import('../utils/db')
    // mysql2 .query führt ohne multipleStatements nur EINE Anweisung aus —
    // SCHEMA_SQL daher in Einzelstatements aufteilen
    for (const stmt of SCHEMA_SQL.split(/;\s*(?=\n)/).map(s => s.trim()).filter(Boolean)) {
      await getDb().query(stmt)
    }
    await migrateSchema()

    const existing = await queryOne('SELECT COUNT(*) AS n FROM admin_users')
    if (Number(existing?.n) === 0) {
      for (const u of adminData.users as any[]) {
        await query(
          'INSERT INTO admin_users (username, salt, pw_hash, role) VALUES (:username, :salt, :hash, :role)',
          { username: u.username, salt: u.salt, hash: u.hash, role: 'superadmin' }
        )
        console.log(`[db-init] Admin-User "${u.username}" aus data/admin.json importiert`)
      }
    }
    console.log('[db-init] Datenbank bereit:', useRuntimeConfig().dbName)
  } catch (e: any) {
    console.error('[db-init] Datenbank-Initialisierung fehlgeschlagen:', e?.message || e)
    console.error('[db-init] Login bleibt deaktiviert, bis die Datenbank erreichbar ist.')
  }
})
