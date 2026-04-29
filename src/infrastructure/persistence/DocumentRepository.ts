import type { Document as DbDocument, PrismaClient } from '@prisma/client';
 
/**
 * @summary Persistence-laag voor `Document` en zijn chunks.
 *
 * @remarks
 * Houdt alle Prisma-aanroepen rond `Document` op één plek. UI- en route-code
 * praten alleen via deze class met de DB.
 */
export class DocumentRepository {
  public constructor(private readonly prisma: PrismaClient) {}
 
  /**
   * Maakt een nieuw Document-record aan.
   *
   * @param input - Velden om op te slaan.
   * @returns Het opgeslagen document inclusief gegenereerd `id`.
   */
  public async create(input: {
    userId: string;
    filename: string;
    storagePath: string;
    pageCount: number;
  }): Promise<DbDocument> {
    return this.prisma.document.create({ data: input });
    }
    
  /**
 * Werkt het opslag-pad bij nadat het bestand op disk geschreven is.
 *
 * @param id - Document-id.
 * @param storagePath - Absoluut pad naar de PDF op disk.
 */
public async updateStoragePath(id: string, storagePath: string): Promise<void> {
  await this.prisma.document.update({
    where: { id },
    data: { storagePath },
  });
    }
    
    /**
     * Slaat chunks met pre-berekende embeddings op.
     *
     * @param documentId - Het bovenliggende document.
     * @param chunks - Chunks met content + 1024-dim embedding.
     */
    public async saveChunks(
    documentId: string,
    chunks: readonly { page: number; content: string; embedding: number[] }[],
    ): Promise<void> {
    if (chunks.length === 0) return;
    await this.prisma.documentChunk.createMany({
        data: chunks.map((c) => ({
        documentId,
        page: c.page,
        content: c.content,
        embedding: JSON.stringify(c.embedding),
        })),
    });
    }
  
 
  /**
   * Lijst documenten van één gebruiker, nieuwste eerst.
   *
   * @param userId - De ingelogde gebruiker.
   */
  public async findByUser(userId: string): Promise<DbDocument[]> {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
 
  /**
   * Eén document ophalen met ownership-check ingebakken.
   *
   * @param id - Document-id.
   * @param userId - De huidige gebruiker (moet eigenaar zijn).
   * @returns Het document of `null` als hij niet bestaat of niet van deze user is.
   */
  public async findOwned(id: string, userId: string): Promise<DbDocument | null> {
    return this.prisma.document.findFirst({ where: { id, userId } });
    }
}
 