# sra-checker
 
AI-gedreven runner voor SRA-checklist controles op jaarrekeningen. Een gebruiker
upload een SRA-checklist (.xlsm) en een jaarrekening (.pdf), kiest welk onderdeel
van de checklist gecontroleerd moet worden, en krijgt per i+d-check een oordeel
van Claude met paginareferentie, citaat en onderbouwing.
 
> Case-opdracht voor Bonsai Software · gebouwd door Josey van Aarsen · 2026.
 
## Quick start
 
```bash
git clone git@github.com:CodebyJosey/sra-checker.git
cd sra-checker
npm install
cp .env.example .env.local   # vul de keys in (zie 'Environment' hieronder)
npm run db:migrate           # SQLite + tabellen
npm run dev
```
 
Open <http://localhost:3000>.
 
## Environment
 
| Variabele | Waarvoor | Waar te halen |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude-evaluator | <https://console.anthropic.com> |
| `COHERE_API_KEY` | Embeddings (RAG) | <https://cohere.com> (gratis trial, geen kaart) |
| `BETTER_AUTH_SECRET` | Sessie-cookie sigs | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `BETTER_AUTH_URL` | Auth callback origin | `http://localhost:3000` voor lokaal |
| `DATABASE_URL` | SQLite-bestand | `file:./dev.db` voor lokaal |
 
## Hoe het werkt
 
```
                ┌───────────────────────────┐
   PDF upload   │  PdfExtractor             │  per pagina tekst
       ─────►   │  (unpdf)                  │  ─────►
                └───────────────────────────┘
                ┌───────────────────────────┐
                │  Chunker                  │  ~1500 char chunks
                │  (sliding window)         │  met paginanummer
                └───────────────────────────┘
                ┌───────────────────────────┐
                │  EmbeddingService         │  1024-dim vectors
                │  (Cohere multilingual-v3) │  → opgeslagen in DB
                └───────────────────────────┘
 
   SRA Excel    ┌───────────────────────────┐
       ─────►   │  ChecklistImporter        │  filtert op `i+d`
                │  (exceljs, alle sheets)   │  per sheet
                └───────────────────────────┘
 
   Per check:
                ┌───────────────────────────┐
                │  DocumentRetriever        │  query embedded,
                │  + VectorStore            │  cosine top-K=8
                │  (in-memory)              │  fragmenten
                └───────────────────────────┘
                ┌───────────────────────────┐
                │  AnthropicProvider        │  forced JSON via
                │  (Claude Sonnet 4.6)      │  tool-use
                └───────────────────────────┘
                       │
                       ▼
                ┌───────────────────────────┐
                │  CheckResultRepository    │  PASS/FAIL/N/A/UNCERTAIN
                │  (Prisma + SQLite)        │  + page-ref + citaat
                └───────────────────────────┘
```
 
## Tech stack & rationale
 
| Keuze | Waarom |
|---|---|
| **Next.js 16 App Router (TypeScript strict)** | Vereiste van de case. App Router voor full-stack in één codebase. `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` voor maximale type-safety. |
| **Prisma 6 + SQLite** | Simpel, één bestand, perfect voor demo. Pinned op `^6` na Prisma 7's breaking config-change (zie ADR 0001). |
| **BetterAuth (email/password)** | Vereiste van de case. Modern, eigen sessie-handling, eenvoudig uit te breiden. |
| **Cohere voor embeddings** | Switchten van Voyage naar Cohere omdat Voyage's gratis tier 10K TPM is — onbruikbaar voor 100+ chunks (zie ADR 0004). |
| **Claude Sonnet 4.6 + tool-use** | Sterk in lange context en gestructureerde output. Tool-use forceert valide JSON i.p.v. handmatig parsen. |
| **In-memory cosine similarity** | Voor case-schaal (~100 chunks/document) in-memory ranking sub-millisecond. Productie zou pgvector zijn (zie ADR 0002). |
 
## Code-organisatie
 
Lichte DDD-indeling om OOP en swappable providers af te dwingen:
 
```
src/
├── app/                    # Next.js routes & UI
├── domain/                 # Pure business types (ChecklistItem, CheckResult)
├── application/            # Use-cases (Ingest, Import, RunChecks)
├── infrastructure/         # IO-laag
│   ├── ai/                 # AIProvider + AnthropicProvider, EmbeddingService
│   ├── parsing/            # PdfExtractor, ChecklistImporter
│   ├── persistence/        # Prisma client + Repositories
│   ├── rag/                # Chunker, VectorStore, DocumentRetriever
│   └── auth/               # BetterAuth setup
├── components/             # React UI
└── lib/                    # Kleine helpers (RateLimiter)
```
 
De domain-laag praat nooit met IO. Routes en UI praten alleen via repositories
en use-cases. Daardoor is de provider-laag verwisselbaar — zie `AIProvider`
interface, gebruikt door `AnthropicProvider`. Een toekomstige `OpenAIProvider`
zou een drop-in vervanging zijn.
 
## Security
 
- **Auth + middleware**: alle `/dashboard` en `/api/*` routes (behalve `/api/auth`) eisen een sessie-cookie. Routes herveriferen de sessie server-side (defense-in-depth).
- **Ownership-checks**: elke route die een document of checklist opvraagt filtert op `userId`. 404 i.p.v. 403 om geen IDs te lekken.
- **Input-validatie**: zod-schemas op alle JSON-bodies. Strict MIME + size-checks op uploads.
- **Rate-limiting**: 5 evaluaties/uur en 30 uploads/uur per gebruiker. Beschermt tegen runaway API-kosten en spam.
- **Secrets**: alleen server-side, nooit in `NEXT_PUBLIC_*`. `.env.local` in `.gitignore`.
- **Security-headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, en `Strict-Transport-Security`.
- **CSRF**: BetterAuth handelt same-site cookies af. Mutating server-actions gebruiken cookies + same-origin checks.
## Verantwoording van keuzes
 
Zie [`docs/adr/`](./docs/adr/):
 
- [ADR 0001 — Database: Prisma 6 + SQLite](./docs/adr/0001-database-keuze.md)
- [ADR 0002 — RAG-strategie: in-memory cosine](./docs/adr/0002-rag-strategie.md)
- [ADR 0003 — AI-provider abstractie](./docs/adr/0003-ai-provider-abstractie.md)
- [ADR 0004 — Embedding-provider Cohere](./docs/adr/0004-embedding-provider.md)
## Scripts
 
| Script | Doet |
|---|---|
| `npm run dev` | Lokaal draaien (Turbopack). |
| `npm run build` | Productie-build. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | Next ESLint + tsdoc syntax. |
| `npm run format` | Prettier write. |
| `npm run db:migrate` | Prisma migrations. |
| `npm run db:reset` | Drop + recreate DB. |
| `npm run db:studio` | Prisma Studio. |
| `npm run db:retrieval-test` | Smoke-test van de RAG-pipeline op het laatste document. |
 
## Limitations & roadmap
 
**Niet in scope**:
- OAuth / 2FA — buiten case-tijd.
- Productie-deploy — werkt lokaal; voor Vercel switchen naar Postgres + pgvector + S3-storage (geplande v2).
- PDF-preview met paginareferentie als klikbare link.
- Multi-tenancy / teams.
- Re-embedding bij modelwissel.
**Bekende beperkingen**:
- Met de `voorbeeldjaarrekening-gemeenten-2023.pdf` zal je veel `NOT_APPLICABLE` of `UNCERTAIN` krijgen — die is voor lagere overheden, niet voor MKB. Met een echte MKB-jaarrekening werkt de evaluator scherper.
- Type-rechtspersoon staat hard op `midden`. In een v2 zou je dit detecteren uit de PDF-tekst (BW 2:396/397 grenzen) of uit een gebruiker-input.
## Credits
 
- Case door Mees Konijnendijk (Bonsai Software).
- SRA-checklist © SRA.