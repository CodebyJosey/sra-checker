# ADR 0003 — AI-provider abstractie

**Status**: Accepted · 2026-04

## Context

De case-tip benoemt expliciet _"verschillende AI providers"_. Daarnaast wil
ik de business-logica van de evaluator kunnen testen zonder elke keer een
echte API-call te doen. Tot slot wil ik in productie kunnen switchen
(bv. naar OpenAI als prijs/kwaliteit verschuift) zonder use-cases aan te raken.

## Decision

Definieer `AIProvider` als TypeScript-interface met één methode
`evaluateCheck(input): Promise<output>`. Implementeer voor nu één concrete
provider: `AnthropicProvider`. De `RunChecksUseCase` accepteert de interface
in z'n constructor.

## Eigenschappen

- `EvaluateCheckInput` bevat de check-tekst, optionele bron, en RAG-fragmenten.
- `EvaluateCheckOutput` is gestructureerd: `status` (gesloten enum),
  `pageReference`, `citation`, `reasoning`, `modelUsed` (voor traceability).
- `AnthropicProvider` gebruikt **forced tool-use**: het model móet via de
  `submit_evaluation`-tool antwoorden. Daardoor krijgen we altijd valide JSON.
- Temperature 0 voor reproduceerbare oordelen.
- System-prompt is expliciet over wanneer welke status te gebruiken.

## Alternatieven overwogen

| Optie                                           | Waarom afgewezen                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| Direct `new Anthropic()` aanroepen in use-case  | Tight coupling, niet testbaar, niet swappable.                      |
| Vercel AI SDK met provider-abstractie ingebouwd | Extra dependency; hun streaming-features hadden we hier niet nodig. |
| LangChain                                       | Te zwaar voor één evaluator-call.                                   |

## Consequences

- Een `OpenAIProvider` toevoegen kost ~30 minuten: zelfde interface
  implementeren met OpenAI's `tools` / `function_calling`.
- Tests voor `RunChecksUseCase` kunnen een fake provider injecteren
  die direct een vooraf-gedefinieerde output teruggeeft.
- De prompt-tekst zit centraal in `AnthropicProvider` — bij prompt-tweaks
  wijzigt er één file.
