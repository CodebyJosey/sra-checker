import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  EvaluateCheckInput,
  EvaluateCheckOutput,
} from '@/infrastructure/ai/AIProvider';
import type { CheckStatus } from '@/domain/checklist/CheckResult';
 
const TOOL_NAME = 'submit_evaluation';
 
/**
 * Schema dat Claude *moet* invullen via tool-use.
 * Dit garandeert dat we structurele JSON terugkrijgen — geen parsing-bugs.
 */
const EVALUATION_TOOL = {
  name: TOOL_NAME,
  description:
    'Lever je oordeel over de SRA-check. Gebruik PASS alleen als de fragmenten ' +
    'duidelijk laten zien dat de jaarrekening voldoet, FAIL alleen als ze laten ' +
    'zien dat hij niet voldoet, NOT_APPLICABLE als de check niet relevant is ' +
    'voor dit document, en UNCERTAIN als er onvoldoende informatie is.',
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
 
/**
 * @summary Claude-implementatie van {@link AIProvider}.
 *
 * @remarks
 * - Gebruikt **forced tool-use** zodat de output altijd valide JSON is.
 * - Standaard model is `claude-sonnet-4-6` — sterk in lange context en
 *   gestructureerde output. Override-baar via constructor.
 * - Temperature staat op 0 — we willen reproduceerbare oordelen, geen creativiteit.
 *
 * @example
 * ```ts
 * const provider = new AnthropicProvider();
 * const result = await provider.evaluateCheck({
 *   description: 'De grondslagen van waardering...',
 *   source: 'BW 2:384,5',
 *   fragments: [{ page: 8, content: '...' }],
 * });
 * ```
 */
export class AnthropicProvider implements AIProvider {
  private static readonly DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
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
      system:
        'Je bent een ervaren Nederlandse accountant die jaarrekeningen toetst aan ' +
        'de SRA-checklist. Je oordeelt UITSLUITEND op basis van de bijgevoegde ' +
        'fragmenten — niet op algemene kennis over de organisatie. Bij twijfel ' +
        'kies je UNCERTAIN. Antwoord altijd via de submit_evaluation tool.',
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
 
  /**
   * Bouwt het user-bericht met check + fragmenten in XML-tags.
   * Claude is goed getraind op die structuur.
   */
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
      'Beoordeel of de jaarrekening aan deze check voldoet.',
    ].join('\n');
  }
 
  private isValidStatus(value: string): value is CheckStatus {
    return ['PASS', 'FAIL', 'NOT_APPLICABLE', 'UNCERTAIN'].includes(value);
  }
}