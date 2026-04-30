# Architecture

Een korte rondleiding voor reviewers en je toekomstige zelf.

## Principes

1. **Lichte DDD-laag-indeling.** Domein-logica praat nooit met IO. UI en routes
   praten alleen via use-cases en repositories. Daardoor zijn providers
   verwisselbaar en is de domain-laag puur testbaar.
2. **OOP met factory-validatie.** Domain-classes hebben een private
   constructor en een `static create(...)`-factory die invoer valideert.
   Onmogelijk om een ongeldig domain-object te maken.
3. **Provider-abstracties** voor externe diensten (AI, embeddings).
   Implementaties zijn injecteerbaar — eenvoudig te swappen of te mocken.
4. **Forced JSON-output** voor AI-calls via tool-use, geen vrije-tekst-parsing.
5. **Defense in depth** voor security: middleware, route-level sessie-check,
   en ownership-filters in repositories.

## Lagen

```
┌──────────────────────────────────────────────────────────┐
│  Presentation (src/app, src/components)                  │
│  Next.js routes (Server + Client components), forms,     │
│  stepper, results-list. Praat met use-cases en routes.   │
├──────────────────────────────────────────────────────────┤
│  Application (src/application)                           │
│  Use-cases: IngestDocument, ImportChecklist, RunChecks.  │
│  Orkestreert domain + infrastructure, geen IO-details.   │
├──────────────────────────────────────────────────────────┤
│  Domain (src/domain)                                     │
│  Pure types en regels: ChecklistItem, CheckResult,       │
│  CheckStatus. Geen Prisma, geen fetch, geen Next.        │
├──────────────────────────────────────────────────────────┤
│  Infrastructure (src/infrastructure)                     │
│  IO-gemak voor de buitenwereld: AI-providers,            │
│  embedding service, parsers, repositories, auth.         │
└──────────────────────────────────────────────────────────┘
```

## Data-flow voor een evaluatie

```
User klikt "Start analyse" in WizardClient
  │
  ▼ POST /api/documents/[id]/run (NDJSON streaming)
  │
RouteHandler:
  1. auth.getSession() — sessie verifieren
  2. RateLimiter.check() — < 5/uur
  3. DocumentRepository.findOwned() — ownership-check
  4. ChecklistRepository.findOwned() — ownership-check
  5. zod-validatie van body
  6. RunChecksUseCase.execute(docId, checklistId, sheet, type, onProgress)
       │
       ▼ ChecklistRepository.findApplicable(checklistId, sheet, type)
       │
       ▼ Worker-pool (5 concurrent):
         per item:
           DocumentRetriever.retrieve(docId, description, topK=8)
             ├─ EmbeddingService.embedQuery(description) → 1024-dim
             ├─ Prisma → alle chunks van het document
             └─ VectorStore.search(query, chunks, 8) → top-8
           AnthropicProvider.evaluateCheck({ description, source, fragments })
             ├─ messages.create() met tool-use forced JSON
             └─ valideer output → EvaluateCheckOutput
           CheckResultRepository.upsert(...)
           onProgress(state) → stream-event naar UI
  │
  ▼ stream "done"-event
  │
WizardClient: zet step → "results", router.refresh()
```

## File-organisatie

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx           # gecentreerde auth-card
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx           # app-header + sessie-check
│   │   ├── dashboard/page.tsx   # wizard server-component
│   │   └── documents/[id]/
│   │       └── page.tsx         # resultaten-detail
│   ├── api/
│   │   ├── auth/[...all]/route.ts
│   │   ├── checklists/route.ts
│   │   └── documents/
│   │       ├── route.ts
│   │       └── [id]/run/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                 # homepage
│
├── application/                 # use-cases
│   ├── IngestDocumentUseCase.ts
│   ├── ImportChecklistUseCase.ts
│   └── RunChecksUseCase.ts
│
├── components/                  # React UI
│   ├── app-header.tsx
│   ├── file-drop-zone.tsx
│   ├── logo.tsx
│   ├── results-list.tsx
│   ├── run-checks-button.tsx
│   ├── status-badge.tsx
│   ├── stepper.tsx
│   └── wizard-client.tsx
│
├── domain/
│   ├── checklist/
│   │   ├── ChecklistItem.ts
│   │   ├── ChecklistItem.test.ts
│   │   ├── CheckResult.ts
│   │   └── CheckResult.test.ts
│   └── ...
│
├── infrastructure/
│   ├── ai/
│   │   ├── AIProvider.ts
│   │   ├── AnthropicProvider.ts
│   │   └── EmbeddingService.ts
│   ├── auth/
│   │   ├── auth.ts
│   │   └── auth-client.ts
│   ├── parsing/
│   │   ├── PdfExtractor.ts
│   │   └── ChecklistImporter.ts
│   ├── persistence/
│   │   ├── prisma.ts
│   │   ├── ChecklistRepository.ts
│   │   ├── DocumentRepository.ts
│   │   └── CheckResultRepository.ts
│   └── rag/
│       ├── Chunker.ts
│       ├── VectorStore.ts
│       ├── VectorStore.test.ts
│       └── DocumentRetriever.ts
│
├── lib/
│   └── rate-limiter.ts
│
└── proxy.ts                     # Next.js auth-middleware
```

## Cross-cutting concerns

- **Validation**: zod aan de routes-rand, factory-checks in domain.
- **Errors**: routes geven JSON-errors met passende HTTP-status (4xx user-fout, 5xx server-fout). Use-cases gooien `Error` met heldere messages.
- **Logging**: console-based, gestructureerd genoeg voor lokale dev. In productie zou je dit naar pino/Datadog routeren.
- **Auth**: middleware (proxy.ts) doet snelle cookie-check, routes herveriferen sessie + ownership.
- **Streaming**: progress via NDJSON over `Response(ReadableStream)`. UI leest met `getReader()` + `TextDecoder`.

## Een feature toevoegen — recept

Stel: ondersteuning voor een tweede AI-provider (OpenAI).

1. **Domain ongewijzigd** — `EvaluateCheckInput`/`Output` blijven gelijk.
2. Maak `src/infrastructure/ai/OpenAIProvider.ts` die `AIProvider` implementeert. Gebruik `function_calling` voor gestructureerde output.
3. Voeg een env-var `AI_PROVIDER` toe (`anthropic` | `openai`).
4. In `run-route.ts`: kies de provider obv die env-var bij het bouwen van `RunChecksUseCase`.
5. Schrijf een unit-test die een fake-provider injecteert en bevestigt dat use-case correct delegeert.
   Geen UI-wijziging, geen DB-wijziging.

## Tests

```
npm test          # eenmalig
npm run test:watch
```

Coverage focust op de pure laag (`domain/`) en pure helpers (`VectorStore`).
UI-tests zijn niet in scope — zou ik in productie via Playwright doen.

## CI

Zie [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). Bij elke push
naar `main` of pull-request: install, prisma generate, typecheck, lint,
format-check, tests, build. Dummy env-vars voor het build-stadium; echte
secrets zitten in GitHub Actions secrets bij eventuele deploy-jobs.
