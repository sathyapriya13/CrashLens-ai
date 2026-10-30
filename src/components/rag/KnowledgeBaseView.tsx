import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Sparkles, 
  Cpu, 
  BookOpen, 
  Plus, 
  X, 
  Check, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { KnowledgeArticle } from '../../types/log';
import { DEFAULT_KNOWLEDGE_BASE } from '../../data/defaultKnowledgeBase';
import { searchKnowledgeBaseLocally } from '../../utils/vectorSearch';

interface KnowledgeBaseViewProps {
  hasGeminiKey: boolean;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ hasGeminiKey }) => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>(DEFAULT_KNOWLEDGE_BASE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [retrievalMethod, setRetrievalMethod] = useState<'gemini-embeddings' | 'local-vector-similarity'>(
    hasGeminiKey ? 'gemini-embeddings' : 'local-vector-similarity'
  );
  const [isSearching, setIsSearching] = useState(false);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  // New Article Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Microservices & Ingress');
  const [newKeywords, setNewKeywords] = useState('');
  const [newRegex, setNewRegex] = useState('');
  const [newSymptoms, setNewSymptoms] = useState('');
  const [newRootCause, setNewRootCause] = useState('');
  const [newRecommendedFix, setNewRecommendedFix] = useState('');
  const [newSteps, setNewSteps] = useState('');
  const [newCodeSnippet, setNewCodeSnippet] = useState('');

  // Extract categories
  const categories = ['ALL', ...Array.from(new Set(articles.map(a => a.category)))];

  // Perform search (via server /api/rag/search or local vector engine)
  const handlePerformSearch = async (queryText: string) => {
    if (!queryText.trim()) {
      setArticles(DEFAULT_KNOWLEDGE_BASE);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, topK: 10 }),
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(data.results || []);
        if (data.retrievalMethod) {
          setRetrievalMethod(data.retrievalMethod);
        }
      } else {
        throw new Error('Server RAG failed');
      }
    } catch {
      // Fallback local search
      const localResults = searchKnowledgeBaseLocally(queryText, DEFAULT_KNOWLEDGE_BASE, 10);
      setArticles(localResults);
      setRetrievalMethod('local-vector-similarity');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePerformSearch(searchQuery);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newRootCause.trim()) return;

    const article: KnowledgeArticle = {
      id: `kb-custom-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory.trim(),
      keywords: newKeywords.split(',').map(k => k.trim()).filter(Boolean),
      errorPatternRegex: newRegex.trim(),
      symptoms: newSymptoms.split('\n').map(s => s.trim()).filter(Boolean),
      rootCauseSummary: newRootCause.trim(),
      recommendedFix: newRecommendedFix.trim(),
      troubleshootingSteps: newSteps.split('\n').map(s => s.trim()).filter(Boolean),
      preventionTip: 'Implement automated canary validation and circuit breakers.',
      codeSnippet: newCodeSnippet.trim() || undefined,
    };

    try {
      await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article),
      });
    } catch {
      // Keep local
    }

    setArticles([article, ...articles]);
    setIsAddModalOpen(false);

    // Reset form
    setNewTitle('');
    setNewKeywords('');
    setNewRegex('');
    setNewSymptoms('');
    setNewRootCause('');
    setNewRecommendedFix('');
    setNewSteps('');
    setNewCodeSnippet('');
  };

  // Filter articles by category if not ALL
  const displayArticles = selectedCategory === 'ALL'
    ? articles
    : articles.filter(a => a.category === selectedCategory);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Search & Engine Status Header */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              RAG Knowledge Repository & Vector Grounding
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Curated software reliability runbooks used to ground Gemini root cause analysis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Explicit Labeling of Retrieval Engine */}
            <div className={`px-2.5 py-1 rounded text-[11px] font-mono border flex items-center gap-1.5 ${
              retrievalMethod === 'gemini-embeddings'
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            }`}>
              <Cpu className="w-3.5 h-3.5" />
              <span>
                {retrievalMethod === 'gemini-embeddings'
                  ? 'Gemini Vector Embeddings'
                  : 'Local TF-IDF Cosine Similarity Fallback'}
              </span>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Runbook</span>
            </button>
          </div>
        </div>

        {/* Semantic Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Test semantic similarity: e.g. 'out of memory error', 'deadlock transaction 1213', 'jwt signature mismatch'..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSearching ? 'Retrieving...' : 'Semantic Search'}</span>
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setArticles(DEFAULT_KNOWLEDGE_BASE); }}
              className="px-3 py-2 rounded-lg text-xs font-mono text-slate-400 bg-slate-800 hover:text-slate-200 transition-colors"
            >
              Reset
            </button>
          )}
        </form>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-mono mr-2">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {cat}
            </button>
          ))}
          <span className="ml-auto text-xs font-mono text-slate-400">
            {displayArticles.length} Runbook Articles
          </span>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayArticles.map((article) => {
          const isExpanded = expandedArticleId === article.id;
          return (
            <div
              key={article.id}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700/80 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header tags */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
                    {article.category}
                  </span>
                  {article.similarityScore !== undefined && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      Score: {Math.round(article.similarityScore * 100)}%
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-100 leading-snug">
                  {article.title}
                </h3>

                {/* Root Cause Summary */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {article.rootCauseSummary}
                </p>

                {/* Keywords */}
                <div className="flex flex-wrap gap-1">
                  {article.keywords.slice(0, 4).map((kw, idx) => (
                    <span key={idx} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {kw}
                    </span>
                  ))}
                  {article.keywords.length > 4 && (
                    <span className="text-[10px] font-mono text-slate-400">
                      +{article.keywords.length - 4} more
                    </span>
                  )}
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-800 space-y-3 font-mono text-xs animate-in fade-in duration-150">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Common Symptoms:</span>
                      <ul className="space-y-1 text-slate-300 list-disc list-inside">
                        {article.symptoms.map((s, idx) => (
                          <li key={idx} className="text-xs">{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Recommended Solution:</span>
                      <p className="text-xs text-emerald-300 font-sans">{article.recommendedFix}</p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Troubleshooting Steps:</span>
                      <ol className="space-y-1 text-slate-300 list-decimal list-inside text-xs">
                        {article.troubleshootingSteps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {article.codeSnippet && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>Reference Code / Config</span>
                          <button
                            onClick={() => handleCopyCode(article.id, article.codeSnippet!)}
                            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                          >
                            {copiedSnippetId === article.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-200 overflow-x-auto">
                          {article.codeSnippet}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Toggle expand button */}
              <div className="pt-3 mt-3 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={() => setExpandedArticleId(isExpanded ? null : article.id)}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <span>{isExpanded ? 'Collapse Runbook' : 'View Full Runbook & Steps'}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Runbook Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Add New Troubleshooting Runbook
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddArticle} className="p-6 overflow-y-auto space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-mono">Article Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. AWS S3 503 SlowDown Rate Limit"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Cloud & Object Storage"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">Keywords (comma-separated)</label>
                  <input
                    type="text"
                    value={newKeywords}
                    onChange={(e) => setNewKeywords(e.target.value)}
                    placeholder="SlowDown, S3 503, rate limit"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">Regex Matcher Pattern</label>
                <input
                  type="text"
                  value={newRegex}
                  onChange={(e) => setNewRegex(e.target.value)}
                  placeholder="e.g. (SlowDown|503 Service Unavailable.*s3)"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">Root Cause Summary *</label>
                <textarea
                  required
                  rows={2}
                  value={newRootCause}
                  onChange={(e) => setNewRootCause(e.target.value)}
                  placeholder="Why this error happens..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">Recommended Fix</label>
                <input
                  type="text"
                  value={newRecommendedFix}
                  onChange={(e) => setNewRecommendedFix(e.target.value)}
                  placeholder="e.g. Add jittered exponential backoff and partition S3 prefixes."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">Troubleshooting Steps (1 per line)</label>
                <textarea
                  rows={2}
                  value={newSteps}
                  onChange={(e) => setNewSteps(e.target.value)}
                  placeholder="Step 1: Check CloudWatch metrics&#10;Step 2: Add hash prefixes"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">Code / Config Snippet</label>
                <textarea
                  rows={3}
                  value={newCodeSnippet}
                  onChange={(e) => setNewCodeSnippet(e.target.value)}
                  placeholder="// Paste fix snippet..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300"
                >
                  Save to Knowledge Base
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
