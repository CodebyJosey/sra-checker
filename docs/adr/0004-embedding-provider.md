# ADR 0004 — Embedding-provider: Cohere (na Voyage)

**Status**: Accepted · 2026-04

## Context

Voor de RAG-pipeline hebben we een embedding-provider nodig. Initieel kozen
we Voyage AI omdat Anthropic die expliciet aanbeveelt en `voyage-3` goed
presteert op meertalige tekst. In de praktijk liep dat vast.

## Wat ging er mis met Voyage

1. **Kapotte SDK**: `voyageai@npm` publiceerde fouten in zijn ESM-imports
   (relatieve paden naar `../Client`, `../api`, etc. die niet in de
   package zaten). Niet werkbaar in Turbopack.
2. **Strikte free-tier rate-limits**: 3 RPM en 10K tokens/minuut zonder
   creditcard. Onze 100 chunks zijn ±40K tokens — kreeg meteen `429`.

## Decision

Switchen naar Cohere `embed-multilingual-v3.0`:

- Gratis trial-tier zónder creditcard.
- 1024-dim vectoren (zelfde als `voyage-3`, dus geen schema-aanpassing nodig).
- Multilingual, ondersteunt Nederlands goed.
- REST-API direct via `fetch` (geen SDK-dependency).

## Alternatieven overwogen

| Optie                              | Waarom (toch) niet nu                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| OpenAI `text-embedding-3-small`    | $5 free credits — beperkt; vereist account-setup.                                  |
| Lokaal `@huggingface/transformers` | Geen externe afhankelijkheid maar 120 MB model-download en CPU-bound (~5x trager). |
| Google Vertex AI                   | Account/project setup zwaar voor case-scope.                                       |

## Consequences

- `EmbeddingService.embedBatched` praat direct met Cohere's `/v2/embed`-endpoint.
  Geen broken-SDK-zorg, één externe afhankelijkheid minder in `package.json`.
- Hergebruik van een centrale `EmbeddingService` betekent dat een toekomstige
  switch naar Voyage of OpenAI alleen die file raakt.
- Voor productie zou ik een retry-met-backoff toevoegen aan `embedBatched`
  voor netwerk-flutters; nu falen we hard met een duidelijke error-message.
