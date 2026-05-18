-- Enable pgvector extension (requires superuser or extension already available)
-- This migration is optional and only needed if you want to use native vector operations
-- The card system works without it using JSON-stored embeddings

CREATE EXTENSION IF NOT EXISTS vector;

-- Add native vector columns for efficient similarity search
-- Using 1024 dimensions for Voyage embeddings
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "embedding" vector(1024);
ALTER TABLE "concepts" ADD COLUMN IF NOT EXISTS "embedding" vector(1024);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS "claims_embedding_idx" ON "claims" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS "concepts_embedding_idx" ON "concepts" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
