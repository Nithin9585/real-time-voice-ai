import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function addDocument(content, embedding) {
  const { error } = await supabase.from('documents').insert({
    content,
    embedding
  });

  if (error) {
    console.error('❌ Failed to insert document:', error.message);
  } else {
    console.log('✅ Document added to Supabase');
  }
}
// vectorStore.js
export async function searchSimilarDocuments(embedding, matchThreshold = 0.75, matchCount = 3) {
  try {
    console.log('🔍 Searching with embedding:', embedding);

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,  // Ensure embedding is a numeric array
      match_threshold: matchThreshold,
      match_count: matchCount
    });

    if (error) {
      console.error('❌ Vector search failed:', error.message, error.details);
      return [];
    }

    console.log('🔍 Vector search results:', data);

    return data;
  } catch (err) {
    console.error('❌ Unexpected error in vector search:', err.message);
    return [];
  }
}