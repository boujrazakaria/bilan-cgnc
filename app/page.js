import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { sql, init } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function addCompany(fd) {
  'use server';
  const nom = String(fd.get('nom') || '').trim();
  if (!nom) return;
  await init();
  await sql`INSERT INTO companies(nom,ice,forme)
    VALUES(${nom}, ${String(fd.get('ice') || '')}, ${String(fd.get('forme') || '')})`;
  revalidatePath('/');
}

export default async function Home() {
  await init();
  const companies = await sql`SELECT * FROM companies ORDER BY id DESC`;
  return (
    <main>
      <h1>Sociétés</h1>
      <form action={addCompany} className="row">
        <input name="nom" placeholder="Raison sociale" required />
        <input name="ice" placeholder="ICE" />
        <select name="forme">
          <option>SARL</option><option>SA</option><option>SARL AU</option>
          <option>Personne physique</option><option>Autre</option>
        </select>
        <button>Ajouter</button>
      </form>
      <ul>
        {companies.map((c) => (
          <li key={c.id}>
            <Link href={`/company/${c.id}`}>{c.nom}</Link> — {c.forme} {c.ice && `· ICE ${c.ice}`}
          </li>
        ))}
        {companies.length === 0 && <li>Aucune société pour le moment.</li>}
      </ul>
    </main>
  );
}
