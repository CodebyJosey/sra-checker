/*
  Warnings:

  - Added the required column `checklistId` to the `ChecklistItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sheets" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Checklist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checklistId" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT,
    "appliesGroot" BOOLEAN NOT NULL DEFAULT false,
    "appliesMidden" BOOLEAN NOT NULL DEFAULT false,
    "appliesKlein" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChecklistItem" ("appliesGroot", "appliesKlein", "appliesMidden", "description", "id", "ordering", "sheet", "source") SELECT "appliesGroot", "appliesKlein", "appliesMidden", "description", "id", "ordering", "sheet", "source" FROM "ChecklistItem";
DROP TABLE "ChecklistItem";
ALTER TABLE "new_ChecklistItem" RENAME TO "ChecklistItem";
CREATE INDEX "ChecklistItem_checklistId_sheet_ordering_idx" ON "ChecklistItem"("checklistId", "sheet", "ordering");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Checklist_userId_idx" ON "Checklist"("userId");
