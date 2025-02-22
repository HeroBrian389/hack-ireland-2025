-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnalysisStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "hasEnoughInformation" BOOLEAN,
    "missingCriticalInfo" TEXT,
    "recommendedNextSteps" TEXT,
    "urgencyLevel" TEXT,
    "reasoning" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisStatus_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AnalysisStatus" ("hasEnoughInformation", "id", "missingCriticalInfo", "reasoning", "recommendedNextSteps", "sessionId", "timestamp", "urgencyLevel") SELECT "hasEnoughInformation", "id", "missingCriticalInfo", "reasoning", "recommendedNextSteps", "sessionId", "timestamp", "urgencyLevel" FROM "AnalysisStatus";
DROP TABLE "AnalysisStatus";
ALTER TABLE "new_AnalysisStatus" RENAME TO "AnalysisStatus";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
