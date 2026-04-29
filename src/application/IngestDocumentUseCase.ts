import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { PdfExtractor } from '@/infrastructure/parsing/PdfExtractor';
import type { DocumentRepository } from '@/infrastructure/persistence/DocumentRepository';
 
export interface IngestInput {
  readonly userId: string;
  readonly originalFilename: string;
  readonly mimeType: string;
  readonly bytes: Buffer;
}
 
export interface IngestOutput {
  readonly documentId: string;
  readonly pageCount: number;
}
 
/**
 * @summary Ingest-use-case: ontvangt een geüploade PDF en bereidt hem voor op de RAG-pipeline.
 *
 * @remarks
 * Stappen:
 * 1. Grootte-check als laatste vangnet (route doet de eerste).
 * 2. Tekst per pagina extraheren — als de PDF corrupt is, falen we hier al
 *    en hoeft er niks naar disk.
 * 3. `Document`-record aanmaken (zonder `storagePath`).
 * 4. PDF-bytes naar `uploads/<userId>/<docId>.pdf`.
 * 5. `storagePath` updaten op het record.
 * 6. Pagina's opslaan als chunks zonder embedding (Stap 7 vult ze in).
 *
 * @example
 * ```ts
 * const useCase = new IngestDocumentUseCase(extractor, documentRepo);
 * const { documentId } = await useCase.execute({
 *   userId, originalFilename, mimeType, bytes,
 * });
 * ```
 */
export class IngestDocumentUseCase {
  /** Maximale grootte (20 MB). */
  private static readonly MAX_BYTES = 20 * 1024 * 1024;
 
  public constructor(
    private readonly extractor: PdfExtractor,
    private readonly documents: DocumentRepository,
    /** Override-baar pad voor tests. Default `<cwd>/uploads`. */
    private readonly uploadsDir: string = path.join(process.cwd(), 'uploads'),
  ) {}
 
  /**
   * Voert de ingest uit.
   *
   * @throws Error als het bestand te groot of niet leesbaar is.
   */
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
    await this.documents.saveRawPages(document.id, extracted.pages);
 
    return { documentId: document.id, pageCount: extracted.pageCount };
  }
}
