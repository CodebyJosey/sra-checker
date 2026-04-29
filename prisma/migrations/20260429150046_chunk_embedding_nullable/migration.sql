-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DocumentChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT,
    CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DocumentChunk" ("content", "documentId", "embedding", "id", "page") SELECT "content", "documentId", "embedding", "id", "page" FROM "DocumentChunk";
DROP TABLE "DocumentChunk";
ALTER TABLE "new_DocumentChunk" RENAME TO "DocumentChunk";
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
