import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { sql, init } from '@/lib/db';
import { CLASSES } from '@/lib/cgnc';

export const dynamic = 'force-dynamic';

async function save(fd) {
  'use server';
  const companyId = Number(fd.get('company_id'));
  const exercice = Number(fd.get('exercice'));
  const codes = [], montants = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('c_')) { codes.push(k.slice(2)); montants.push(Number(v) || 0); }
  }
  await init();
  await sql`INSERT INTO bilan_entries(company_id,exercice,code,montant)
    SELECT ${companyId}::int, ${exercice}::int, t.c, t.m
    FROM unnest(${codes}::text[], ${montants}::float8[]) AS t(c,m)
    ON CONFLICT (company_id,exercice,code) DO UPDATE SET montant = EXCLUDED.montant`;
  revalidatePath(`/company/${companyId}`);
}

export default async function CompanyPage({ params, searchParams }) {
  const id = Number(params.id);
  const exercice = Number(searchParams?.exercice) || new Date().getFullYear();
  await init();
  const [company] = Number.isInteger(id) ? await sql`SELECT * FROM companies WHERE id=${id}` : [];
  if (!company) return <main>Société introuvable. <Link href="/">Retour</Link></main>;

  const rows = await sql`SELECT a.code, a.libelle, a.side, COALESCE(e.montant,0)::float8 AS montant
    FROM accounts a LEFT JOIN bilan_entries e
      ON e.code=a.code AND e.company_id=${id} AND e.exercice=${exercice}
    ORDER BY a.code`;

  const sum = (s) => rows.filter((r) => r.side === s).reduce((t, r) => t + r.montant, 0);
  const brut = sum('A'), amort = sum('D'), net = brut - amort, passif = sum('P');
  const diff = net - passif;
  const fmt = (n) => n.toLocaleString('fr-MA', { minimumFractionDigits: 2 });

  return (
    <main>
      <Link href="/">← Sociétés</Link>
      <h1>{company.nom} — Bilan {exercice}</h1>
      <form className="row">
        <input name="exercice" type="number" defaultValue={exercice} />
        <button>Changer d&apos;exercice</button>
      </form>

      <form action={save}>
        <input type="hidden" name="company_id" value={id} />
        <input type="hidden" name="exercice" value={exercice} />
        {Object.entries(CLASSES).map(([cl, titre]) => (
          <section key={cl}>
            <h2>{titre}</h2>
            <table>
              <tbody>
                {rows.filter((r) => r.code[0] === cl).map((r) => (
                  <tr key={r.code}>
                    <td>{r.code}</td>
                    <td>{r.libelle}<br /><small>{r.side === 'A' ? 'Actif' : r.side === 'D' ? 'Amort./Provisions' : 'Passif'}</small></td>
                    <td className="num"><input name={`c_${r.code}`} type="number" step="0.01" defaultValue={r.montant} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        <button>Enregistrer le bilan</button>
      </form>

      <h2>Synthèse</h2>
      <div className="tot">
        <span>Actif brut : {fmt(brut)}</span>
        <span>Amort. &amp; prov. : {fmt(amort)}</span>
        <span>Actif net : {fmt(net)}</span>
        <span>Passif : {fmt(passif)}</span>
      </div>
      <p className={Math.abs(diff) < 0.005 ? 'ok' : 'ko'}>
        {Math.abs(diff) < 0.005 ? 'Bilan équilibré ✔' : `Écart actif net − passif : ${fmt(diff)}`}
      </p>
    </main>
  );
}
