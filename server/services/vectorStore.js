import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function addDocument(content, embedding, userId) {
  const { error } = await supabase.from('documents').insert({
    user_id: userId,
    content,
    embedding
  });

  if (error) {
    console.error('❌ Failed to insert document:', error.message);
  } else {
    console.log('✅ Document added to Supabase');
  }
}
export async function searchSimilarDocuments(embedding, userId, matchThreshold = 0.75, matchCount = 3) {
  try {
    console.log(`🔍 Searching for user ${userId} with embedding`);

    const { data, error } = await supabase.rpc('documents', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      user_id: userId
    });

    if (error) {
      console.error('❌ Vector search failed:', error.message, error.details);
      return [];
    }

    console.log('🔍 Raw vector search results:', data);

    if (!data || data.length === 0) {
      console.warn('⚠️ No matching documents found.');
      return [];
    }

    const userFilteredResults = data;
    console.log('🔍 Filtered vector search results:', userFilteredResults);

    return userFilteredResults;

  } catch (err) {
    console.error('❌ Unexpected error in vector search:', err.message);
    return [];
  }
}
