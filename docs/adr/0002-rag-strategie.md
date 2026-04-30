# ADR 0002 — RAG-strategie: in-memory cosine similarity
 
**Status**: Accepted · 2026-04
 
## Context
 
Voor RAG hebben we een vector-store nodig die per document een set chunks kan
ranken op cosine similarity. SQLite heeft geen native vector-type. Productie-
oplossingen (pgvector, Pinecone, Weaviate, etc.) brengen ofwel meer infra,
ofwel een betaalde dienst.
 
## Decision
 
Cosine similarity in-memory in pure JavaScript via `VectorStore.search`.
Embeddings worden als JSON-string per chunk opgeslagen. Bij een retrieval-call
worden alle chunks van het betreffende document opgehaald en in JS geranked.
 
## Cijfers
 
| Aspect | Waarde |
|---|---|
| Embedding-dimensie | 1024 (Cohere `embed-multilingual-v3.0`) |
| Chunks per document | typisch 70-200 |
| Geheugen per document | ±1 MB |
| Sort-tijd voor top-K | sub-millisecond |
 
## Alternatieven
 
| Optie | Voordeel | Nadeel |
|---|---|---|
| **In-memory cosine** ✓ | Geen extra infra, simpel, snel genoeg voor case-schaal | Schaalt niet boven ~10k chunks per document |
| pgvector | Native vector-zoek, schaalt naar miljoenen chunks | Vereist Postgres (zie ADR 0001) |
| SQLite + sqlite-vec | Native vector in SQLite | Beta, niet ondersteund door Prisma |
| Pinecone / Weaviate | Productie-grade, managed | Externe afhankelijkheid, account, kosten |
 
## Consequences
 
- Werkt prima voor de case-demo en de meeste reële MKB-jaarrekeningen
  (typisch < 200 pagina's).
- Een productie-versie zou pgvector gebruiken; de overstap is geïsoleerd
  in de `VectorStore`- en `DocumentRetriever`-classes.
- Het patroon van "alle chunks ophalen + sorteren" komt natuurlijk over
  als naïef. In de architectuur-uitleg benoemen we dat dit een bewuste
  trade-off is voor case-scope, niet onwetendheid.
 