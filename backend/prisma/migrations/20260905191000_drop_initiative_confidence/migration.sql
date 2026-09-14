-- Drop initiativeConfidence (confidence concept removed; company score is the signal)
ALTER TABLE "company_intelligence" DROP COLUMN IF EXISTS "initiativeConfidence";
