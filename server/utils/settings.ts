// Einfacher Key/Value-Speicher für Dashboard-Einstellungen
import { query, queryOne } from './db'

export async function getSetting(key: string): Promise<string> {
  const row: any = await queryOne('SELECT value FROM settings WHERE `key` = :key', { key })
  return row && row.value !== null && row.value !== undefined ? String(row.value) : ''
}

export async function setSetting(key: string, value: string) {
  await query(
    'INSERT INTO settings (`key`, value) VALUES (:key, :value) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    { key, value }
  )
}
