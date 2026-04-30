import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  EvaluateCheckInput,
  EvaluateCheckOutput,
} from '@/infrastructure/ai/AIProvider';
import type { CheckStatus } from '@/domain/checklist/CheckResult';

const TOOL_NAME = 'submit_evaluation';

const EVALUATION_TOOL = {
  name: TOOL_NAME,
  description:
    'Lever een onderbouwd oordeel over de SRA-check. Wees decisief — kies UNCERTAIN ' +
    'alleen als de fragmenten compleet over andere onderwerpen gaan.',
  input_schema: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        enum: ['PASS', 'FAIL', 'NOT_APPLICABLE', 'UNCERTAIN'] as const,
      },
      pageReference: {
        type: ['integer', 'null'],
        description: 'Paginanummer van het belangrijkste bewijs, of null.',
      },
      citation: {
        type: ['string', 'null'],
        description:
          'Kort letterlijk citaat (max ~200 tekens) uit de fragmenten dat het ' +
          'oordeel onderbouwt. Null als er geen relevante passage is gevonden.',
      },
      reasoning: {
        type: 'string',
        description:
          'Onderbouwing in het Nederlands, 1-3 zinnen. Verwijs naar het ' +
          'paginanummer waar relevant.',
      },
    },
    required: ['status', 'reasoning'],
  },
};

const SYSTEM_PROMPT = `Je bent een ervaren Nederlandse accountant die jaarrekeningen toetst aan de SRA-checklist. Je oordeelt op basis van de bijgevoegde fragmenten uit de jaarrekening.
 
Belangrijke principes:
 
1. WEES DECISIEF. Jaarrekeningen formuleren dingen zelden letterlijk zoals de checklist. Als de fragmenten een sectie tonen die over hetzelfde onderwerp gaat, beoordeel inhoudelijk — niet alleen op letterlijke woorden.
 
2. STATUSSEN — kies bewust:
   • PASS — de fragmenten laten zien dat de jaarrekening aan deze check voldoet (eventueel in andere bewoording).
   • FAIL — de fragmenten gaan duidelijk over deze check, maar laten zien dat NIET wordt voldaan, of dat verplichte informatie ontbreekt.
   • NOT_APPLICABLE — de check is niet relevant voor deze organisatie (bv. een check over deelnemingen bij een organisatie zonder dochters; of MKB-specifieke checks bij een gemeente).
   • UNCERTAIN — UITSLUITEND als de fragmenten compleet over andere onderwerpen gaan en je dus écht geen oordeel kan vormen. Dit zou een minderheid van de gevallen moeten zijn.
 
3. CITAAT EN PAGINA — bij PASS of FAIL geef je altijd het meest relevante fragment als citaat (max ~200 tekens) en het paginanummer. Bij NOT_APPLICABLE/UNCERTAIN mag dit null zijn.
 
4. ONDERBOUWING — 1-3 zinnen, Nederlands, concreet. Niet "ik zie iets dat erop lijkt" maar "Op pagina 8 staat ... Dit voldoet aan de check omdat ...".
 
Antwoord altijd via de submit_evaluation tool.`;

/**
 * @summary Claude-implementatie van {@link AIProvider}.
 */
export class AnthropicProvider implements AIProvider {
  private static readonly DEFAULT_MODEL = 'claude-sonnet-4-6';
  private readonly client: Anthropic;

  public constructor(
    apiKey: string = process.env['ANTHROPIC_API_KEY'] ?? '',
    private readonly model: string = AnthropicProvider.DEFAULT_MODEL,
  ) {
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY ontbreekt in .env.local');
    this.client = new Anthropic({ apiKey });
  }

  public async evaluateCheck(input: EvaluateCheckInput): Promise<EvaluateCheckOutput> {
    const userMessage = this.buildPrompt(input);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      tools: [EVALUATION_TOOL],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [{ role: 'user', content: userMessage }],
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Claude leverde geen tool-use block; output onbruikbaar');
    }

    const args = toolUse.input as {
      status?: string;
      pageReference?: number | null;
      citation?: string | null;
      reasoning?: string;
    };

    if (!args.status || !args.reasoning) {
      throw new Error('Claude tool-output mist verplichte velden');
    }
    if (!this.isValidStatus(args.status)) {
      throw new Error(`Ongeldige status van Claude: "${args.status}"`);
    }

    return {
      status: args.status,
      pageReference: typeof args.pageReference === 'number' ? args.pageReference : null,
      citation: typeof args.citation === 'string' ? args.citation : null,
      reasoning: args.reasoning,
      modelUsed: this.model,
    };
  }

  private buildPrompt(input: EvaluateCheckInput): string {
    const sourceLine = input.source ? `\nBron: ${input.source}` : '';
    const fragmentBlocks = input.fragments
      .map((f) => `<fragment pagina="${f.page}">\n${f.content}\n</fragment>`)
      .join('\n\n');

    return [
      '<check>',
      input.description + sourceLine,
      '</check>',
      '',
      '<fragmenten>',
      fragmentBlocks,
      '</fragmenten>',
      '',
      'Beoordeel of de jaarrekening aan deze check voldoet. Wees decisief.',
    ].join('\n');
  }

  private isValidStatus(value: string): value is CheckStatus {
    return ['PASS', 'FAIL', 'NOT_APPLICABLE', 'UNCERTAIN'].includes(value);
  }
}
