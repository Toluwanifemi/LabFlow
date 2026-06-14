-- Add research_fields (JSON array) to labs
ALTER TABLE "labs" ADD COLUMN "research_fields" JSONB NOT NULL DEFAULT '[]';

-- Add onboarding_completed to users
ALTER TABLE "users" ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;
