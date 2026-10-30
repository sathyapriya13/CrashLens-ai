import { KnowledgeArticle } from '../types/log';

// Lightweight tokenization and normalization
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// Generate term-frequency vector map
function getTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return tf;
}

// Compute Cosine Similarity between two TF vectors
function cosineSimilarity(tfA: Map<string, number>, tfB: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, countA] of tfA.entries()) {
    normA += countA * countA;
    if (tfB.has(term)) {
      dotProduct += countA * (tfB.get(term)!);
    }
  }

  for (const countB of tfB.values()) {
    normB += countB * countB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Comprehensive local semantic and keyword similarity retrieval
export function searchKnowledgeBaseLocally(
  query: string,
  articles: KnowledgeArticle[],
  topK: number = 3
): KnowledgeArticle[] {
  if (!query || articles.length === 0) return [];

  const queryTokens = tokenize(query);
  const queryTf = getTermFrequency(queryTokens);

  const scoredArticles = articles.map(article => {
    // Combine title, keywords, symptoms, and root cause into document text
    const docText = [
      article.title,
      article.category,
      ...article.keywords,
      ...article.symptoms,
      article.rootCauseSummary,
      article.recommendedFix,
    ].join(' ');

    const docTokens = tokenize(docText);
    const docTf = getTermFrequency(docTokens);

    // Baseline TF cosine similarity
    let score = cosineSimilarity(queryTf, docTf);

    // Boost 1: Regex pattern match
    try {
      if (article.errorPatternRegex) {
        const regex = new RegExp(article.errorPatternRegex, 'i');
        if (regex.test(query)) {
          score += 0.45; // Significant boost for exact regex signature match
        }
      }
    } catch {
      // Ignore regex syntax errors in custom inputs
    }

    // Boost 2: Exact keyword match
    for (const keyword of article.keywords) {
      if (query.toLowerCase().includes(keyword.toLowerCase())) {
        score += 0.25;
      }
    }

    // Boost 3: Title phrase overlap
    const titleTokens = tokenize(article.title);
    const titleMatchCount = titleTokens.filter(t => queryTokens.includes(t)).length;
    if (titleMatchCount > 0) {
      score += (titleMatchCount / titleTokens.length) * 0.3;
    }

    // Normalize score to maximum of 0.99
    const finalScore = Math.min(0.99, Math.max(0.05, Math.round(score * 100) / 100));

    return {
      ...article,
      similarityScore: finalScore,
    };
  });

  return scoredArticles
    .filter(a => (a.similarityScore || 0) > 0.15)
    .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))
    .slice(0, topK);
}

// Compute dot product of pre-computed embedding vectors
export function dotProductSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
