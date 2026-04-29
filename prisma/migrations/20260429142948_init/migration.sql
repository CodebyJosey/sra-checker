-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sheet" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT,
    "appliesGroot" BOOLEAN NOT NULL DEFAULT false,
    "appliesMidden" BOOLEAN NOT NULL DEFAULT false,
    "appliesKlein" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheckResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pageReference" INTEGER,
    "citation" TEXT,
    "reasoning" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckResult_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckResult_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ChecklistItem_sheet_ordering_idx" ON "ChecklistItem"("sheet", "ordering");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- CreateIndex
CREATE INDEX "CheckResult_documentId_idx" ON "CheckResult"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckResult_documentId_checklistItemId_key" ON "CheckResult"("documentId", "checklistItemId");
