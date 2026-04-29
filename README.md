# sra-checker
 
AI-gedreven runner voor SRA-checklist controles op jaarrekeningen. Upload een
PDF, kies een sheet uit de SRA-checklist (we starten met *Grondslagen en
uitgangspunten*), en krijg per check terug of de jaarrekening eraan voldoet —
inclusief paginareferentie, citaat en onderbouwing.
 
> Case-opdracht voor Bonsai Software (stage). Gebouwd in Next.js 15 (App Router)
> met TypeScript, Prisma + SQLite, BetterAuth, en Anthropic Claude.
 
## Quick start
 
```bash
git clone git@github.com:<jouw-username>/sra-checker.git
cd sra-checker
npm install
cp .env.example .env.local   # vul je eigen keys in
npx prisma migrate dev --name init
npm run db:seed              # importeert SRA-checklist (i+d, Grondslagen-sheet)
npm run dev
```
 
Open <http://localhost:3000> en registreer een account.
 
## Vereiste env-vars
 
| Variabele | Waar haal je hem | Verplicht |
|---|---|---|
| `ANTHROPIC_API_KEY` | <https://console.anthropic.com> | ✅ |
| `VOYAGE_API_KEY` | <https://www.voyageai.com> | ✅ |
| `BETTER_AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` | ✅ |
| `BETTER_AUTH_URL` | `http://localhost:3000` voor lokaal | ✅ |
| `DATABASE_URL` | `file:./dev.db` voor lokaal | ✅ |
 
## Architectuur in vogelvlucht
 
```
PDF upload ─► PdfExtractor (per pagina)
              │
              ▼
         Chunker (±800 tokens, met paginanummer)
              │
              ▼
       EmbeddingService (Voyage AI)
              │
              ▼
       VectorStore (SQLite, cosine similarity in-memory)
              │
              ▼ (per checklist-item: top-5 chunks ophalen)
              │
       AIProvider.evaluateCheck (Claude, forced JSON output)
              │
              ▼
       CheckResult opgeslagen ─► UI
```
 
Code-organisatie volgt een lichte DDD-indeling:
 
- `src/domain/` — pure types en regels (geen IO).
- `src/application/` — use-cases die het domein orchestreren.
- `src/infrastructure/` — IO: DB, AI, file, parsers, auth.
- `src/app/` — Next.js routes en UI.
Zie [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) en de ADRs in
[`docs/adr/`](./docs/adr) voor de afwegingen.
 
## Scripts
 
| Script | Doet |
|---|---|
| `npm run dev` | Lokaal draaien (Turbopack). |
| `npm run build` | Productie-build. |
| `npm run lint` | ESLint + TSDoc-checks. |
| `npm run db:migrate` | Prisma migrations toepassen. |
| `npm run db:seed` | SRA-checklist importeren. |
| `npm run db:studio` | Prisma Studio (DB-explorer in browser). |
 
## Security highlights
 
- Alle `/api/*` en `/dashboard/*` routes gaan door auth-middleware.
- Document-routes checken **ownership** (`document.userId === session.user.id`).
- Upload: alleen `application/pdf`, max 20 MB, MIME sniff via `file-type`.
- Rate-limit op de check-runner (5 runs/uur/user).
- Geen secrets ooit in `NEXT_PUBLIC_*`.
- BetterAuth handelt CSRF via same-site cookies.
## Status
 
In ontwikkeling — zie [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) voor de roadmap.
 
## Credits
 
Case door Mees Konijnendijk (Bonsai Software). SRA-checklist © SRA.
 