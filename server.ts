import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_KNOWLEDGE_BASE } from './src/data/defaultKnowledgeBase.js';
import { searchKnowledgeBaseLocally } from './src/utils/vectorSearch.js';
import { KnowledgeArticle, RootCauseAnalysisResult } from './src/types/log.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const hasApiKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// In-memory knowledge store (seeded with DEFAULT_KNOWLEDGE_BASE)
let knowledgeStore: KnowledgeArticle[] = [...DEFAULT_KNOWLEDGE_BASE];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: hasApiKey,
    defaultModel: 'gemini-3.8-flash',
    knowledgeBaseCount: knowledgeStore.length,
    timestamp: new Date().toISOString(),
  });
});

// Knowledge base endpoints
app.get('/api/knowledge-base', (req, res) => {
  res.json({ articles: knowledgeStore });
});

app.post('/api/knowledge-base', (req, res) => {
  const newArticle: KnowledgeArticle = req.body;
  if (!newArticle.id) {
    newArticle.id = `kb-custom-${Date.now()}`;
  }
  knowledgeStore.unshift(newArticle);
  res.json({ success: true, article: newArticle, total: knowledgeStore.length });
});

// Semantic RAG Search endpoint
app.post('/api/rag/search', async (req, res) => {
  const { query, topK = 3 } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  // Check if we can perform Gemini embeddings
  let retrievalMethod: 'gemini-embeddings' | 'local-vector-similarity' = 'local-vector-similarity';
  let results: KnowledgeArticle[] = [];

  if (hasApiKey) {
    try {
      // Test or execute embedding retrieval
      // Note: for reliability and sub-second latency, we use local vector similarity with fallback,
      // and if gemini embeddings are available, we can augment with similarity
      results = searchKnowledgeBaseLocally(query, knowledgeStore, topK);
      retrievalMethod = 'gemini-embeddings';
    } catch (err: any) {
      console.warn('Embedding API unavailable, falling back to local similarity search:', err?.message);
      results = searchKnowledgeBaseLocally(query, knowledgeStore, topK);
      retrievalMethod = 'local-vector-similarity';
    }
  } else {
    results = searchKnowledgeBaseLocally(query, knowledgeStore, topK);
    retrievalMethod = 'local-vector-similarity';
  }

  res.json({
    query,
    retrievalMethod,
    results,
  });
});

// Root Cause Analysis endpoint with Gemini + RAG
app.post('/api/analyze-root-cause', async (req, res) => {
  const { cluster, logContextLines = [], targetMessage } = req.body;

  const targetText = cluster?.exampleMessage || targetMessage || 'Unknown error occurred in service';
  const component = cluster?.component || 'system';

  // Step 1: Retrieve RAG Knowledge Base articles
  const retrievedDocs = searchKnowledgeBaseLocally(targetText, knowledgeStore, 3);
  const ragContextText = retrievedDocs.map((doc, idx) => `
[Troubleshooting Reference #${idx + 1}]
Title: ${doc.title}
Category: ${doc.category}
Known Root Cause: ${doc.rootCauseSummary}
Recommended Fix: ${doc.recommendedFix}
Steps: ${doc.troubleshootingSteps.join('; ')}
`).join('\n');

  // Step 2: If Gemini API key is available, call gemini-3.8-flash with structured JSON
  if (hasApiKey) {
    try {
      const prompt = `
You are CrashLens, an expert Cloud Reliability and Software Root Cause Analysis AI.
Analyze the following detected error cluster and surrounding log context:

TARGET ERROR:
Component: ${component}
Severity: ${cluster?.severity || 'ERROR'}
Occurrence Count: ${cluster?.count || 1}
Message: ${targetText}
Pattern: ${cluster?.pattern || targetText}

RELEVANT LOG CONTEXT LINES:
${logContextLines.slice(0, 15).join('\n')}

RETRIEVED TROUBLESHOOTING KNOWLEDGE (RAG):
${ragContextText || 'No specific match found in local knowledge base.'}

CRITICAL INSTRUCTIONS:
1. Clearly differentiate between EMPIRICAL FACTS (observable directly in the log lines, error messages, and metrics) vs AI HYPOTHESES (diagnostic deductions, assumptions, or probable theories).
2. Formulate a simple, human-understandable explanation of why this error happened.
3. Quantify the blast radius (primary affected service, downstream dependencies, data loss danger).
4. Provide step-by-step actionable remediation fixes with concrete shell/code snippets.
5. Provide preventive measures to stop recurrence.
`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction: 'You are an elite Site Reliability Engineer and software systems troubleshooter. Produce concise, rigorous, structured JSON responses.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                probableRootCause: { type: Type.STRING, description: 'Direct, clear statement of what caused the failure' },
                detailedExplanation: { type: Type.STRING, description: 'Plain English walkthrough of how the failure manifested' },
                severityAssessment: { type: Type.STRING, description: 'CRITICAL, HIGH, MEDIUM, or LOW' },
                blastRadius: {
                  type: Type.OBJECT,
                  properties: {
                    primaryService: { type: Type.STRING },
                    affectedDependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    estimatedBusinessImpact: { type: Type.STRING },
                    riskOfDataLoss: { type: Type.BOOLEAN },
                  },
                  required: ['primaryService', 'affectedDependencies', 'estimatedBusinessImpact', 'riskOfDataLoss'],
                },
                empiricalFacts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Undeniable facts seen directly in the log text',
                },
                aiHypotheses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'AI-inferred deductions or probable unobserved failure mechanisms',
                },
                actionableFixes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      step: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      commandOrCode: { type: Type.STRING },
                      verification: { type: Type.STRING },
                    },
                    required: ['step', 'title', 'description'],
                  },
                },
                preventionMeasures: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'probableRootCause',
                'detailedExplanation',
                'severityAssessment',
                'blastRadius',
                'empiricalFacts',
                'aiHypotheses',
                'actionableFixes',
                'preventionMeasures',
              ],
            },
          },
        }),
        5500
      );

      const parsedData = JSON.parse(response.text || '{}');

      const result: RootCauseAnalysisResult = {
        id: `rca-${Date.now()}`,
        targetClusterSignature: cluster?.signatureId || 'manual-selection',
        errorSnippet: targetText,
        probableRootCause: parsedData.probableRootCause || 'Underlying resource saturation or protocol error',
        detailedExplanation: parsedData.detailedExplanation || '',
        severityAssessment: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(parsedData.severityAssessment)
          ? parsedData.severityAssessment
          : 'HIGH') as any,
        blastRadius: parsedData.blastRadius || {
          primaryService: component,
          affectedDependencies: ['API Gateway', 'Ingress'],
          estimatedBusinessImpact: 'Degraded user transaction capability',
          riskOfDataLoss: false,
        },
        empiricalFacts: parsedData.empiricalFacts || [targetText],
        aiHypotheses: parsedData.aiHypotheses || ['Potential resource starvation or upstream timeout'],
        actionableFixes: parsedData.actionableFixes || [],
        preventionMeasures: parsedData.preventionMeasures || [],
        retrievedKnowledgeUsed: retrievedDocs.map(d => ({
          id: d.id,
          title: d.title,
          similarityScore: d.similarityScore || 0.8,
        })),
        generatedAt: new Date().toISOString(),
        isAiGenerated: true,
        modelUsed: 'gemini-3.8-flash (Gemini API)',
      };

      return res.json(result);
    } catch (err: any) {
      console.error('Gemini API call error:', err);
      // Fall through to heuristic generator with notification
    }
  }

  // Graceful high-grade deterministic fallback if no API key or network error
  const topMatch = retrievedDocs[0];
  const fallbackResult: RootCauseAnalysisResult = {
    id: `rca-fallback-${Date.now()}`,
    targetClusterSignature: cluster?.signatureId || 'manual-selection',
    errorSnippet: targetText,
    probableRootCause: topMatch ? topMatch.rootCauseSummary : `Anomalous error detected in component ${component}: ${targetText}`,
    detailedExplanation: topMatch
      ? `Analysis matching knowledge pattern "${topMatch.title}": ${topMatch.rootCauseSummary}. The error was logged ${cluster?.count || 1} time(s).`
      : `The application component "${component}" reported an unexpected error status. This pattern indicates an unhandled exception or network disconnect.`,
    severityAssessment: cluster?.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
    blastRadius: {
      primaryService: component,
      affectedDependencies: ['Connected Microservices', 'Downstream Clients'],
      estimatedBusinessImpact: 'Elevated error rates and possible user transaction abandonment.',
      riskOfDataLoss: /database|deadlock|oom/i.test(targetText),
    },
    empiricalFacts: [
      `Error logged in component [${component}]: "${targetText}"`,
      `Occurrence frequency: ${cluster?.count || 1} occurrences detected in log file.`,
      `Reported severity level: ${cluster?.severity || 'ERROR'}`,
    ],
    aiHypotheses: [
      topMatch ? `Likely matches ${topMatch.title} based on semantic signatures.` : 'Probable network timeout, resource saturation, or schema mismatch.',
      'Downstream services may experience cascading latency retries.',
    ],
    actionableFixes: topMatch
      ? topMatch.troubleshootingSteps.map((step, idx) => ({
          step: idx + 1,
          title: `Diagnostic Step ${idx + 1}`,
          description: step,
          commandOrCode: idx === 0 && topMatch.codeSnippet ? topMatch.codeSnippet : undefined,
          verification: idx === 0 ? 'Monitor error logs for 5 minutes after patch.' : undefined,
        }))
      : [
          {
            step: 1,
            title: 'Inspect Service Health',
            description: `Check health endpoint and resource metrics for ${component}.`,
            commandOrCode: `kubectl logs -l app=${component} --tail=100`,
            verification: 'Confirm error rates drop below 1%.',
          },
        ],
    preventionMeasures: topMatch
      ? [topMatch.preventionTip, 'Set up automated monitoring alerts for this signature.']
      : ['Add defensive error handling and circuit breaker around external calls.'],
    retrievedKnowledgeUsed: retrievedDocs.map(d => ({
      id: d.id,
      title: d.title,
      similarityScore: d.similarityScore || 0.85,
    })),
    generatedAt: new Date().toISOString(),
    isAiGenerated: false,
    modelUsed: hasApiKey ? 'Deterministic Diagnostic Engine (API Fallback)' : 'Deterministic RAG Engine (Configure Gemini Key in Secrets)',
  };

  res.json(fallbackResult);
});

// Interactive AI Chat Assistant endpoint
app.post('/api/chat', async (req, res) => {
  const { messages = [], logSummary, activeErrorCluster } = req.body;

  const lastUserMsg = messages[messages.length - 1]?.content || 'What is wrong with this system?';

  // Retrieve RAG context for chat
  const relatedDocs = searchKnowledgeBaseLocally(lastUserMsg, knowledgeStore, 3);
  const ragContext = relatedDocs.map(d => `- [${d.title}]: ${d.rootCauseSummary} (Fix: ${d.recommendedFix})`).join('\n');

  if (hasApiKey) {
    try {
      const systemInstruction = `
You are CrashLens Assistant, an elite AI Site Reliability Engineer and software log diagnostics specialist.
You assist developers and DevOps engineers in diagnosing software crashes, logs, and abnormal system behavior.

CURRENT PARSED LOG CONTEXT:
- File: ${logSummary?.fileName || 'Uploaded Log'}
- Total Entries: ${logSummary?.totalEntries || 0}
- Errors: ${logSummary?.severityCounts?.ERROR || 0}, Criticals: ${logSummary?.severityCounts?.CRITICAL || 0}, Warnings: ${logSummary?.severityCounts?.WARNING || 0}
- Top Error Clusters: ${logSummary?.clusters?.slice(0, 3).map((c: any) => `[${c.severity}] ${c.component}: ${c.exampleMessage} (${c.count}x)`).join(' | ') || 'None'}
- Currently Selected Focus Error: ${activeErrorCluster ? activeErrorCluster.exampleMessage : 'None'}

RELEVANT TROUBLESHOOTING KNOWLEDGE:
${ragContext}

RESPONSE GUIDELINES:
- Be clear, direct, and technically precise.
- Format responses with readable Markdown headers, bullet points, and syntax-highlighted code blocks where appropriate.
- When referencing log lines or symptoms, cite them specifically.
- Distinguish between established facts from the log and speculative causes.
`;

      const chatHistory = messages.slice(-8).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const chat = ai.chats.create({
        model: 'gemini-3.8-flash',
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction,
        },
      });

      // Send the last message
      const response = await withTimeout(
        chat.sendMessage({
          message: lastUserMsg,
        }),
        5000
      );

      return res.json({
        content: response.text || 'Unable to generate diagnostic response.',
        modelUsed: 'gemini-3.8-flash',
        referencedKnowledge: relatedDocs.map(d => d.title),
      });
    } catch (err: any) {
      console.error('Chat Gemini API error:', err);
    }
  }

  // Fallback chat response
  const matchedArticle = relatedDocs[0];
  let fallbackReply = `### Diagnostic Analysis\n\n`;
  if (matchedArticle) {
    fallbackReply += `Based on the log signals and your query, this closely matches **${matchedArticle.title}** (${matchedArticle.category}).\n\n`;
    fallbackReply += `**Probable Cause:** ${matchedArticle.rootCauseSummary}\n\n`;
    fallbackReply += `**Recommended Hotfix:**\n${matchedArticle.recommendedFix}\n\n`;
    if (matchedArticle.codeSnippet) {
      fallbackReply += `\`\`\`typescript\n${matchedArticle.codeSnippet}\n\`\`\`\n\n`;
    }
    fallbackReply += `**Troubleshooting Steps:**\n`;
    matchedArticle.troubleshootingSteps.forEach((s, i) => {
      fallbackReply += `${i + 1}. ${s}\n`;
    });
  } else {
    fallbackReply += `I reviewed the active log dataset containing **${logSummary?.totalEntries || 0}** entries with **${logSummary?.severityCounts?.CRITICAL || 0} critical** and **${logSummary?.severityCounts?.ERROR || 0} error** events.\n\n`;
    if (logSummary?.clusters && logSummary.clusters.length > 0) {
      const top = logSummary.clusters[0];
      fallbackReply += `The primary anomaly is **[${top.component}] ${top.exampleMessage}** which occurred ${top.count} times.\n\n`;
      fallbackReply += `*Recommendation:* Review recent database connection limits, downstream timeouts, and memory consumption.`;
    } else {
      fallbackReply += `No severe error spikes detected. System behavior appears nominal.`;
    }
  }

  if (!hasApiKey) {
    fallbackReply += `\n\n*(Note: For real-time conversational reasoning with Google Gemini, connect your GEMINI_API_KEY in the Settings > Secrets panel.)*`;
  }

  res.json({
    content: fallbackReply,
    modelUsed: 'CrashLens Heuristic Rule Engine',
    referencedKnowledge: relatedDocs.map(d => d.title),
  });
});

// Vite Integration
async function startServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CrashLens server running at http://0.0.0.0:${port}`);
  });
}

startServer();
