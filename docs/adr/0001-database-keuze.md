# ADR 0001 — Database: Prisma 6 + SQLite

**Status**: Accepted · 2026-04

## Context

We hebben persistence nodig voor: users + sessies (BetterAuth), uploaded
documenten + chunks + embeddings, geüploade SRA-checklists + items, en
evaluatie-resultaten. Voor een case-project geldt: zo min mogelijk operationele
overhead, zodat reviewers het project in 60 seconden lokaal kunnen draaien.

## Decision

Prisma als ORM, SQLite als store. Prisma gepind op `^6` om Prisma 7's breaking
config-change (datasource-block niet meer in schema) te vermijden.

## Alternatieven

| Optie                   | Voordeel                                                     | Nadeel                                                                     |
| ----------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Prisma 6 + SQLite** ✓ | Eén bestand, geen server, type-safe queries, snelle iteratie | Geen native vector-types, geen native concurrency voor schrijven op schaal |
| Prisma 6 + PostgreSQL   | Productie-grade, pgvector beschikbaar                        | Vereist Docker of cloud-DB, meer setup voor reviewer                       |
| Drizzle + SQLite        | Lichter dan Prisma                                           | Minder mature, type-inference iets minder volwassen                        |
| Postgres + Drizzle      | Productie-grade én licht                                     | Combineert nadelen van bovenstaande                                        |

## Consequences

- Tabellen zijn snel te creëren met `npm run db:migrate`.
- `embedding` kolom wordt opgeslagen als JSON-string (SQLite kan geen native
  vector). Cosine similarity gebeurt in-memory in JS — zie ADR 0002.
- `status` op `CheckResult` is een `String` met domeinlogica — SQLite + Prisma
  ondersteunt geen enum. We valideren in TypeScript bij de class-factory
  (`CheckResult.create`).
- Een productie-migratie naar Postgres + pgvector zou betekenen:
  schema-aanpassingen voor vector-kolom, een `embedding @vector(1024)`-type,
  en het vervangen van `VectorStore.search` door een SQL-query. De rest van
  de code (use-cases, AI-provider, UI) blijft ongemoeid.
