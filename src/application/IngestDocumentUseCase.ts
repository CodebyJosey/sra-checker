import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { PdfExtractor } from '@/infrastructure/parsing/PdfExtractor';
import type { DocumentRepository } from '@/infrastructure/persistence/DocumentRepository';
import type { Chunker } from '@/infrastructure/rag/Chunker';
import type { EmbeddingService } from '@/infrastructure/ai/EmbeddingService';
 
export interface IngestInput {
  readonly userId: string;
  readonly originalFilename: string;
  readonly mimeType: string;
  readonly bytes: Buffer;
}
 
export interface IngestOutput {
  readonly documentId: string;
  readonly pageCount: number;
  readonly chunkCount: number;
}
 
/**
 * @summary Ingest-use-case: PDF binnen → klaar voor RAG-checks.
 *
 * @remarks
 * Pijplijn:
 * 1. Grootte-check.
 * 2. Tekst per pagina extraheren (corrupt? falen voordat we naar disk schrijven).
 * 3. Document-record aanmaken.
 * 4. Bestand naar disk.
 * 5. Chunken met overlap (paginanummer wordt bewaard).
 * 6. Chunks in batches embedden via Voyage AI.
 * 7. Chunks + embeddings persisteren.
 *
 * Stap 6 + 7 is bewust synchroon: voor een case-project hou je het zo dichter
 * bij elkaar; in productie zou je dit asynchroon via een queue afhandelen.
 *
 * @example
 * ```ts
 * const useCase = new IngestDocumentUseCase(extractor, repo, chunker, embeddings);
 * const { documentId, chunkCount } = await useCase.execute({ userId, ... });
 * ```
 */
export class IngestDocumentUseCase {
  private static readonly MAX_BYTES = 20 * 1024 * 1024;
 
  public constructor(
    private readonly extractor: PdfExtractor,
    private readonly documents: DocumentRepository,
    private readonly chunker: Chunker,
    private readonly embeddings: EmbeddingService,
    private readonly uploadsDir: string = path.join(process.cwd(), 'uploads'),
  ) {}
 
  public async execute(input: IngestInput): Promise<IngestOutput> {
    if (input.bytes.length > IngestDocumentUseCase.MAX_BYTES) {
      throw new Error('Bestand is te groot (max 20 MB)');
    }
 
    const extracted = await this.extractor.extract(input.bytes);
 
    const document = await this.documents.create({
      userId: input.userId,
      filename: input.originalFilename,
      storagePath: '',
      pageCount: extracted.pageCount,
    });
 
    const userDir = path.join(this.uploadsDir, input.userId);
    await fs.mkdir(userDir, { recursive: true });
    const storagePath = path.join(userDir, `${document.id}.pdf`);
    await fs.writeFile(storagePath, input.bytes);
    await this.documents.updateStoragePath(document.id, storagePath);
 
    const rawChunks = this.chunker.chunk(extracted.pages);
    if (rawChunks.length === 0) {
      // Document had geen extracteerbare tekst (bv. scan zonder OCR).
      return { documentId: document.id, pageCount: extracted.pageCount, chunkCount: 0 };
    }
 
    const vectors = await this.embeddings.embedDocuments(rawChunks.map((c) => c.content));
 
    const enriched = rawChunks.map((c, i) => {
      const vec = vectors[i];
      if (!vec) {
        throw new Error(`Geen embedding teruggekregen voor chunk ${c.position}`);
      }
      return { page: c.page, content: c.content, embedding: vec };
    });
 
    await this.documents.saveChunks(document.id, enriched);
 
    return {
      documentId: document.id,
      pageCount: extracted.pageCount,
      chunkCount: enriched.length,
    };
  }
}
 