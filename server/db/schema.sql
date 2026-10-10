-- WOHNFEE Dashboard — Datenbankschema (MySQL 8 / MariaDB 10.5+)
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- Referenz-Datei — der Server fuehrt das Schema aus server/utils/db-schema.ts aus
-- und migriert bestehende Tabellen automatisch (information_schema-Checks).

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
  image_path VARCHAR(190) NULL,
  description TEXT NULL,
  supplier VARCHAR(128) NULL,
  artnr VARCHAR(64) NULL,
  ean VARCHAR(32) NULL,
  quantity INT NOT NULL DEFAULT 1,
  original_price DECIMAL(10,2) NULL,
  rent_price_1m DECIMAL(10,2) NULL,
  rent_price_3m DECIMAL(10,2) NULL,
  rentable TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('lager','vermietet','pflege','verkauft','ausser_dienst') NOT NULL DEFAULT 'lager',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

CREATE TABLE IF NOT EXISTS item_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id INT UNSIGNED NOT NULL,
  path VARCHAR(190) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_item_images_item (item_id),
  CONSTRAINT fk_item_images_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

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
  `key` VARCHAR(64) PRIMARY KEY,
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
  offer_id INT UNSIGNED NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'dashboard',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invoices_number (number),
  KEY idx_invoices_contact (contact_id),
  KEY idx_invoices_date (doc_date),
  KEY idx_invoices_storno (storno_of),
  KEY idx_invoices_offer (offer_id),
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
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rental_inquiries_status (status)
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
