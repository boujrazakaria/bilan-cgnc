import { neon } from '@neondatabase/serverless';
import { ACCOUNTS } from './cgnc';

export const sql = neon(process.env.DATABASE_URL);

let ready = null;
// Crée les tables et les comptes CGNC au premier appel
export function init() {
  if (!ready) {
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY, nom TEXT NOT NULL, ice TEXT, forme TEXT,
        created_at TIMESTAMPTZ DEFAULT now())`;
      await sql`CREATE TABLE IF NOT EXISTS accounts (
        code TEXT PRIMARY KEY, libelle TEXT NOT NULL,
        side TEXT NOT NULL CHECK (side IN ('A','D','P')))`;
      await sql`CREATE TABLE IF NOT EXISTS bilan_entries (
        company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        exercice INT NOT NULL,
        code TEXT NOT NULL REFERENCES accounts(code),
        montant NUMERIC(18,2) NOT NULL DEFAULT 0,
        PRIMARY KEY (company_id, exercice, code))`;
      await sql`INSERT INTO accounts(code,libelle,side)
        SELECT * FROM unnest(${ACCOUNTS.map((a) => a[0])}::text[],
                             ${ACCOUNTS.map((a) => a[1])}::text[],
                             ${ACCOUNTS.map((a) => a[2])}::text[])
        ON CONFLICT (code) DO NOTHING`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}
