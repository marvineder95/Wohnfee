// Datenbank-Schema und idempotente Migrationen.
// Wird beim Serverstart ausgeführt: legt fehlende Tabellen an und migriert Spalten.
import { getDb, query, queryOne } from './db'
import adminData from '../../data/admin.json'

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admin_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NULL,
  salt CHAR(32) NULL,
  pw_hash CHAR(128) NULL,
  email VARCHAR(190) NULL,
  display_name VARCHAR(128) NULL,
  phone VARCHAR(64) NULL,
  position VARCHAR(128) NULL,
  bio VARCHAR(500) NULL,
  avatar_path VARCHAR(190) NULL,
  role ENUM('superadmin','admin','user') NOT NULL DEFAULT 'user',
  status ENUM('pending','active','deactivated') NOT NULL DEFAULT 'active',
  invite_token_hash CHAR(64) NULL,
  invite_expires_at TIMESTAMP NULL,
  invited_by INT UNSIGNED NULL,
  reset_token_hash CHAR(64) NULL,
  reset_expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_users_username (username),
  KEY idx_admin_users_invite (invite_token_hash),
  KEY idx_admin_users_reset (reset_token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_inquiries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(64) NULL,
  subject VARCHAR(190) NULL,
  message TEXT NOT NULL,
  status ENUM('neu','gelesen','archiviert') NOT NULL DEFAULT 'neu',
  ip_hash CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_contact_inquiries_status (status),
  KEY idx_contact_inquiries_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contacts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asol_id INT UNSIGNED NULL,
  type ENUM('person','firma') NOT NULL DEFAULT 'person',
  name1 VARCHAR(190) NULL,
  name2 VARCHAR(190) NULL,
  street VARCHAR(190) NULL,
  zip VARCHAR(16) NULL,
  city VARCHAR(128) NULL,
  country VARCHAR(8) NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(64) NULL,
  notes TEXT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'import',
  status ENUM('aktiv','archiviert') NOT NULL DEFAULT 'aktiv',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contacts_asol (asol_id),
  KEY idx_contacts_name (name2),
  KEY idx_contacts_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_tags (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contact_id INT UNSIGNED NOT NULL,
  tag VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_contact_tags (contact_id, tag),
  KEY idx_contact_tags_tag (tag),
  CONSTRAINT fk_contact_tags_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS locations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asol_id INT UNSIGNED NULL,
  contact_id INT UNSIGNED NULL,
  name VARCHAR(190) NOT NULL,
  address TEXT NULL,
  zip VARCHAR(16) NULL,
  city VARCHAR(128) NULL,
  type VARCHAR(32) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_locations_asol (asol_id),
  KEY idx_locations_contact (contact_id),
  CONSTRAINT fk_locations_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asol_id INT UNSIGNED NULL,
  title VARCHAR(190) NOT NULL,
  description TEXT NULL,
  supplier VARCHAR(128) NULL,
  artnr VARCHAR(64) NULL,
  ean VARCHAR(32) NULL,
  quantity INT NOT NULL DEFAULT 1,
  original_price DECIMAL(10,2) NULL,
  rent_price_1m DECIMAL(10,2) NULL,
  rent_price_3m DECIMAL(10,2) NULL,
  rentable TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('lager','vermietet','verkauft','ausser_dienst') NOT NULL DEFAULT 'lager',
  warehouse VARCHAR(64) NULL,
  customer_location VARCHAR(190) NULL,
  purchased_at VARCHAR(32) NULL,
  purchased_year SMALLINT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'import',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inventory_asol (asol_id),
  KEY idx_inventory_status (status),
  KEY idx_inventory_warehouse (warehouse),
  KEY idx_inventory_title (title),
  KEY idx_inventory_supplier (supplier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_tags (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id INT UNSIGNED NOT NULL,
  tag VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_item_tags (item_id, tag),
  KEY idx_item_tags_tag (tag),
  CONSTRAINT fk_item_tags_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id INT UNSIGNED NOT NULL,
  path VARCHAR(190) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_item_images_item (item_id),
  CONSTRAINT fk_item_images_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category ENUM('staging','leasing','showroom') NOT NULL,
  section VARCHAR(64) NULL,
  customer VARCHAR(190) NULL,
  title VARCHAR(190) NULL,
  art VARCHAR(16) NULL,
  team VARCHAR(16) NULL,
  status_info TEXT NULL,
  deadline_text VARCHAR(64) NULL,
  deadline_date DATE NULL,
  note VARCHAR(190) NULL,
  next_step VARCHAR(190) NULL,
  who VARCHAR(64) NULL,
  date_info VARCHAR(64) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  source VARCHAR(32) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_projects_category (category),
  KEY idx_projects_deadline (deadline_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contact_id INT UNSIGNED NULL,
  kind ENUM('rechnung','angebot','vertrag','dokument','storno') NOT NULL DEFAULT 'dokument',
  number VARCHAR(64) NULL,
  customer_raw VARCHAR(190) NULL,
  doc_date DATE NULL,
  total DECIMAL(10,2) NULL,
  return_date DATE NULL,
  file_path VARCHAR(255) NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'nextcloud',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_documents_path (file_path),
  KEY idx_documents_contact (contact_id),
  KEY idx_documents_date (doc_date),
  CONSTRAINT fk_documents_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  return_date DATE NULL,
  note VARCHAR(190) NULL,
  UNIQUE KEY uq_project_items (project_id, item_id),
  CONSTRAINT fk_project_items_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_items_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  \`key\` VARCHAR(64) PRIMARY KEY,
  value TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(32) NOT NULL,
  contact_id INT UNSIGNED NULL,
  customer_name VARCHAR(190) NOT NULL,
  customer_street VARCHAR(190) NULL,
  customer_zip VARCHAR(16) NULL,
  customer_city VARCHAR(128) NULL,
  customer_country VARCHAR(8) NULL,
  customer_uid VARCHAR(32) NULL,
  doc_date DATE NOT NULL,
  service_from DATE NULL,
  service_to DATE NULL,
  subject VARCHAR(190) NULL,
  intro TEXT NULL,
  lang ENUM('de','en') NOT NULL DEFAULT 'de',
  vat_rate DECIMAL(4,2) NOT NULL DEFAULT 20.00,
  vat_free TINYINT(1) NOT NULL DEFAULT 0,
  vat_note VARCHAR(190) NULL,
  note TEXT NULL,
  status ENUM('entwurf','gesendet','bezahlt','storniert') NOT NULL DEFAULT 'entwurf',
  storno_of INT UNSIGNED NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'dashboard',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invoices_number (number),
  KEY idx_invoices_contact (contact_id),
  KEY idx_invoices_date (doc_date),
  KEY idx_invoices_storno (storno_of),
  CONSTRAINT fk_invoices_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT UNSIGNED NOT NULL,
  position INT NOT NULL DEFAULT 1,
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
  unit VARCHAR(16) NULL,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  KEY idx_invoice_items_invoice (invoice_id),
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(32) NOT NULL,
  contact_id INT UNSIGNED NULL,
  customer_name VARCHAR(190) NOT NULL,
  customer_street VARCHAR(190) NULL,
  customer_zip VARCHAR(16) NULL,
  customer_city VARCHAR(128) NULL,
  customer_country VARCHAR(8) NULL,
  customer_uid VARCHAR(32) NULL,
  doc_date DATE NOT NULL,
  valid_until DATE NULL,
  subject VARCHAR(190) NULL,
  lang ENUM('de','en') NOT NULL DEFAULT 'de',
  vat_rate DECIMAL(4,2) NOT NULL DEFAULT 20.00,
  vat_free TINYINT(1) NOT NULL DEFAULT 0,
  vat_note VARCHAR(190) NULL,
  note TEXT NULL,
  status ENUM('entwurf','gesendet','angenommen','abgelehnt') NOT NULL DEFAULT 'entwurf',
  invoice_id INT UNSIGNED NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'dashboard',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_offers_number (number),
  KEY idx_offers_contact (contact_id),
  KEY idx_offers_invoice (invoice_id),
  CONSTRAINT fk_offers_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_offers_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offer_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  offer_id INT UNSIGNED NOT NULL,
  position INT NOT NULL DEFAULT 1,
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
  unit VARCHAR(16) NULL,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  KEY idx_offer_items_offer (offer_id),
  CONSTRAINT fk_offer_items_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rental_inquiries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(32) NOT NULL,
  status ENUM('neu','in_bearbeitung','beantwortet','archiviert') NOT NULL DEFAULT 'neu',
  first_name VARCHAR(64) NULL,
  last_name VARCHAR(64) NULL,
  company VARCHAR(128) NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(64) NULL,
  street VARCHAR(190) NULL,
  zip VARCHAR(16) NULL,
  city VARCHAR(128) NULL,
  country VARCHAR(64) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  duration_months INT NULL,
  delivery_option VARCHAR(64) NULL,
  delivery_notes TEXT NULL,
  monthly_total DECIMAL(10,2) NULL,
  offer_id INT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rental_inquiries_status (status),
  KEY idx_rental_inquiries_offer (offer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rental_inquiry_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inquiry_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NULL,
  title VARCHAR(190) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  duration_months INT NULL,
  monthly_price DECIMAL(10,2) NULL,
  KEY idx_rii_inquiry (inquiry_id),
  CONSTRAINT fk_rii_inquiry FOREIGN KEY (inquiry_id) REFERENCES rental_inquiries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS calendar_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(190) NOT NULL,
  type ENUM('aufbau','abholung','lieferung','beratung','sonstiges') NOT NULL DEFAULT 'sonstiges',
  event_date DATE NOT NULL,
  start_time VARCHAR(5) NULL,
  end_time VARCHAR(5) NULL,
  all_day TINYINT(1) NOT NULL DEFAULT 0,
  location VARCHAR(190) NULL,
  project_id INT UNSIGNED NULL,
  notes TEXT NULL,
  created_by INT UNSIGNED NULL,
  created_by_name VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_calendar_events_date (event_date),
  KEY idx_calendar_events_project (project_id),
  CONSTRAINT fk_calendar_events_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  lang ENUM('de','en') NOT NULL DEFAULT 'de',
  status ENUM('aktiv','abgemeldet') NOT NULL DEFAULT 'aktiv',
  ip_hash CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_newsletter_email (email),
  KEY idx_newsletter_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_sends (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(190) NOT NULL,
  body_text TEXT NOT NULL,
  recipient_count INT NOT NULL DEFAULT 0,
  sent_by VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_newsletter_sends_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_posts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  section VARCHAR(32) NOT NULL DEFAULT 'trends-tipps',
  slug VARCHAR(190) NOT NULL,
  title VARCHAR(190) NOT NULL,
  teaser TEXT NULL,
  body_html MEDIUMTEXT NULL,
  cover_image VARCHAR(255) NULL,
  cover_alt VARCHAR(190) NULL,
  meta_description VARCHAR(300) NULL,
  status ENUM('entwurf','veroeffentlicht') NOT NULL DEFAULT 'entwurf',
  published_at DATETIME NULL,
  author_name VARCHAR(128) NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_blog_posts_section_slug (section, slug),
  KEY idx_blog_posts_status_published (status, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`

// Spalten-Migrationen für bestehende Datenbanken (idempotent)
const MIGRATIONS: Array<[string, string]> = [
  ['email', "ADD COLUMN email VARCHAR(190) NULL AFTER pw_hash"],
  ['display_name', "ADD COLUMN display_name VARCHAR(128) NULL AFTER email"],
  ['role', "ADD COLUMN role ENUM('superadmin','admin','user') NOT NULL DEFAULT 'user' AFTER display_name"],
  ['status', "ADD COLUMN status ENUM('pending','active','deactivated') NOT NULL DEFAULT 'active' AFTER role"],
  ['invite_token_hash', "ADD COLUMN invite_token_hash CHAR(64) NULL AFTER status"],
  ['invite_expires_at', "ADD COLUMN invite_expires_at TIMESTAMP NULL AFTER invite_token_hash"],
  ['invited_by', "ADD COLUMN invited_by INT UNSIGNED NULL AFTER invite_expires_at"],
  ['reset_token_hash', "ADD COLUMN reset_token_hash CHAR(64) NULL AFTER invited_by"],
  ['reset_expires_at', "ADD COLUMN reset_expires_at TIMESTAMP NULL AFTER reset_token_hash"],
  ['phone', "ADD COLUMN phone VARCHAR(64) NULL AFTER reset_expires_at"],
  ['position', "ADD COLUMN position VARCHAR(128) NULL AFTER phone"],
  ['bio', "ADD COLUMN bio VARCHAR(500) NULL AFTER position"],
  ['avatar_path', "ADD COLUMN avatar_path VARCHAR(190) NULL AFTER bio"]
]

export async function migrateSchema() {
  const db = getDb()
  const config = useRuntimeConfig()
  for (const [column, ddl] of MIGRATIONS) {
    const col = await queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = :col`,
      { db: config.dbName, col: column }
    )
    if (Number(col?.n) === 0) {
      await db.query(`ALTER TABLE admin_users ${ddl}`)
      console.log(`[db-init] Migration: admin_users.${column} hinzugefuegt`)
    }
  }
  const u = await queryOne<{ n: string }>(
    `SELECT IS_NULLABLE AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'username'`,
    { db: config.dbName }
  )
  if (u && u.n === 'NO') {
    await db.query("ALTER TABLE admin_users MODIFY username VARCHAR(64) NULL")
    await db.query("ALTER TABLE admin_users MODIFY salt CHAR(32) NULL")
    await db.query("ALTER TABLE admin_users MODIFY pw_hash CHAR(128) NULL")
    console.log('[db-init] Migration: username/salt/pw_hash auf NULLBAR geaendert')
  }
  const st = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'storno_of'`,
    { db: config.dbName }
  )
  if (Number(st?.n) === 0) {
    await db.query('ALTER TABLE invoices ADD COLUMN storno_of INT UNSIGNED NULL')
    await db.query('ALTER TABLE invoices ADD KEY idx_invoices_storno (storno_of)')
    console.log('[db-init] Migration: invoices.storno_of hinzugefuegt')
  }
  const se = await queryOne<{ t: string }>(
    `SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'status'`,
    { db: config.dbName }
  )
  if (se && !String(se.t).includes('storniert')) {
    await db.query("ALTER TABLE invoices MODIFY status ENUM('entwurf','gesendet','bezahlt','storniert') NOT NULL DEFAULT 'entwurf'")
    console.log('[db-init] Migration: invoices.status um STORNIERT erweitert')
  }
  const dk = await queryOne<{ t: string }>(
    `SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'kind'`,
    { db: config.dbName }
  )
  if (dk && !String(dk.t).includes('storno')) {
    await db.query("ALTER TABLE documents MODIFY kind ENUM('rechnung','angebot','vertrag','dokument','storno') NOT NULL DEFAULT 'dokument'")
    console.log('[db-init] Migration: documents.kind um STORNO erweitert')
  }
  const oi = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'offer_id'`,
    { db: config.dbName }
  )
  if (Number(oi?.n) === 0) {
    await db.query('ALTER TABLE invoices ADD COLUMN offer_id INT UNSIGNED NULL')
    await db.query('ALTER TABLE invoices ADD KEY idx_invoices_offer (offer_id)')
    console.log('[db-init] Migration: invoices.offer_id hinzugefuegt')
  }
  const ri = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'rental_inquiries' AND COLUMN_NAME = 'offer_id'`,
    { db: config.dbName }
  )
  if (Number(ri?.n) === 0) {
    await db.query('ALTER TABLE rental_inquiries ADD COLUMN offer_id INT UNSIGNED NULL')
    await db.query('ALTER TABLE rental_inquiries ADD KEY idx_rental_inquiries_offer (offer_id)')
    console.log('[db-init] Migration: rental_inquiries.offer_id hinzugefuegt')
  }
}
