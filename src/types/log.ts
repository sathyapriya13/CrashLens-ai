export type LogSeverity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

export interface LogEntry {
  id: string;
  lineNumber: number;
  raw: string;
  timestamp: string | null;
  severity: LogSeverity;
  component: string;
  message: string;
  stackTrace?: string[];
  statusCode?: number;
  traceId?: string;
  ipAddress?: string;
  isAnomaly?: boolean;
}

export interface ErrorCluster {
  signatureId: string;
  pattern: string;
  exampleMessage: string;
  severity: LogSeverity;
  component: string;
  count: number;
  firstSeen: string | null;
  lastSeen: string | null;
  sampleLineNumbers: number[];
  associatedStack?: string[];
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  errorPatternRegex: string;
  symptoms: string[];
  rootCauseSummary: string;
  recommendedFix: string;
  troubleshootingSteps: string[];
  preventionTip: string;
  codeSnippet?: string;
  similarityScore?: number;
}

export interface ActionableFix {
  step: number;
  title: string;
  description: string;
  commandOrCode?: string;
  verification?: string;
}

export interface RootCauseAnalysisResult {
  id: string;
  targetClusterSignature: string;
  errorSnippet: string;
  probableRootCause: string;
  detailedExplanation: string;
  severityAssessment: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  blastRadius: {
    primaryService: string;
    affectedDependencies: string[];
    estimatedBusinessImpact: string;
    riskOfDataLoss: boolean;
  };
  empiricalFacts: string[];
  aiHypotheses: string[];
  actionableFixes: ActionableFix[];
  preventionMeasures: string[];
  retrievedKnowledgeUsed: {
    id: string;
    title: string;
    similarityScore: number;
  }[];
  generatedAt: string;
  isAiGenerated: boolean;
  modelUsed: string;
}

export interface LogAnalysisSummary {
  fileName: string;
  fileSize: number;
  totalEntries: number;
  severityCounts: Record<LogSeverity, number>;
  clusters: ErrorCluster[];
  timeline: {
    timeBucket: string;
    critical: number;
    error: number;
    warning: number;
    info: number;
  }[];
  componentBreakdown: {
    component: string;
    errorCount: number;
    warningCount: number;
    total: number;
  }[];
  detectedAnomalies: {
    type: 'SPIKE' | 'CASCADE_FAILURE' | 'REPEATED_BURST' | 'FATAL_CHAIN';
    description: string;
    severity: LogSeverity;
    timestamp?: string;
    linesInvolved: number[];
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  referencedLines?: number[];
  referencedKnowledge?: string[];
}
