import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Terminal, 
  Copy, 
  Check, 
  RotateCw, 
  ChevronRight, 
  Flame, 
  Network, 
  FileCheck, 
  BookOpen,
  Info
} from 'lucide-react';
import { RootCauseAnalysisResult, ErrorCluster } from '../../types/log';

interface RootCauseViewProps {
  rcaResult: RootCauseAnalysisResult | null;
  clusters: ErrorCluster[];
  selectedCluster: ErrorCluster | null;
  onSelectCluster: (cluster: ErrorCluster) => void;
  onRunRca: (cluster: ErrorCluster) => void;
  isLoading: boolean;
}

export const RootCauseView: React.FC<RootCauseViewProps> = ({
  rcaResult,
  clusters,
  selectedCluster,
  onSelectCluster,
  onRunRca,
  isLoading,
}) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const handleCopyCode = (idx: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Cluster Target Selector Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Target Incident Cluster</span>
              {selectedCluster && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  selectedCluster.severity === 'CRITICAL' 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {selectedCluster.severity}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 truncate max-w-xl">
              {selectedCluster ? selectedCluster.exampleMessage : 'Select an error pattern to trigger root cause analysis'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedCluster?.signatureId || ''}
            onChange={(e) => {
              const found = clusters.find(c => c.signatureId === e.target.value);
              if (found) onSelectCluster(found);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 max-w-xs"
          >
            {clusters.map((c) => (
              <option key={c.signatureId} value={c.signatureId}>
                [{c.severity}] {c.component} ({c.count}x)
              </option>
            ))}
          </select>

          {selectedCluster && (
            <button
              onClick={() => onRunRca(selectedCluster)}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Diagnosing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Analysis</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="p-12 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">
            Synthesizing Root Cause & Blast Radius...
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Retrieving semantic RAG knowledge vectors, cross-referencing stack traces with incident patterns, and evaluating blast radius.
          </p>
        </div>
      )}

      {!isLoading && !rcaResult && (
        <div className="p-16 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <BrainCircuit className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200 mb-1">
            No Root Cause Analysis Generated Yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Select an error signature above or from the Dashboard and click "Run Analysis" to generate an AI-powered post-mortem and remediation runbook.
          </p>
          {selectedCluster && (
            <button
              onClick={() => onRunRca(selectedCluster)}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm"
            >
              Start Analysis Now
            </button>
          )}
        </div>
      )}

      {!isLoading && rcaResult && (
        <div className="space-y-6">
          {/* Diagnostic Engine Model & Timestamp Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Analysis Engine:</span>
              <span className="text-cyan-400 font-semibold">{rcaResult.modelUsed}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <span className="text-slate-400">Generated:</span>
              <span className="text-slate-300">{new Date(rcaResult.generatedAt).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Probable Root Cause Primary Card */}
          <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Probable Root Cause
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  rcaResult.severityAssessment === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {rcaResult.severityAssessment} Severity
                </span>
              </div>
            </div>

            <div className="text-lg font-bold text-slate-100 leading-snug">
              {rcaResult.probableRootCause}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {rcaResult.detailedExplanation}
            </p>
          </div>

          {/* Blast Radius & Impact Mapping */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Primary Affected Service */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
                <Network className="w-4 h-4 text-cyan-400" />
                <span>Primary Affected Service</span>
              </div>
              <div className="text-base font-bold font-mono text-cyan-300 mt-1">
                {rcaResult.blastRadius.primaryService}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Origin point of the failure cascade
              </div>
            </div>

            {/* Downstream Dependencies */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Downstream Impact</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {rcaResult.blastRadius.affectedDependencies.map((dep, idx) => (
                  <span key={idx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {dep}
                  </span>
                ))}
              </div>
            </div>

            {/* Data Loss Risk & Business Impact */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Business & Data Risk</span>
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                {rcaResult.blastRadius.estimatedBusinessImpact}
              </div>
              <div className="text-[11px] font-mono mt-1 flex items-center gap-1.5">
                <span className="text-slate-400">Data Loss Threat:</span>
                <span className={rcaResult.blastRadius.riskOfDataLoss ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {rcaResult.blastRadius.riskOfDataLoss ? 'ELEVATED' : 'LOW / NONE'}
                </span>
              </div>
            </div>
          </div>

          {/* CRITICAL REQUIREMENT: Clear Distinction between Empirical Facts vs AI Hypotheses */}
          <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Info className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
                Evidence Audit: Empirical Log Facts vs. AI Diagnostic Hypotheses
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Empirical Detected Log Facts */}
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>1. Empirical Detected Facts (In Log)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Direct observations verbatim from timestamped events and system signals:
                </p>
                <ul className="space-y-1.5 text-xs text-slate-200 font-mono">
                  {rcaResult.empiricalFacts.map((fact, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 select-none">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Diagnostic Hypotheses */}
              <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>2. AI Diagnostic Hypotheses (Inferred)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Model deductions regarding internal states and unobserved race conditions:
                </p>
                <ul className="space-y-1.5 text-xs text-slate-200 font-mono">
                  {rcaResult.aiHypotheses.map((hypo, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-400 select-none">•</span>
                      <span>{hypo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step-by-Step Actionable Fixes */}
          <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Actionable Remediation Runbook</span>
            </h3>

            <div className="space-y-3">
              {rcaResult.actionableFixes.map((fix, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold flex items-center justify-center">
                        {fix.step}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-100">
                        {fix.title}
                      </h4>
                    </div>
                    {fix.verification && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                        Verification: {fix.verification}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {fix.description}
                  </p>

                  {fix.commandOrCode && (
                    <div className="relative mt-2">
                      <div className="flex items-center justify-between px-3 py-1 bg-slate-900 rounded-t border-t border-x border-slate-800 text-[10px] font-mono text-slate-400">
                        <span>Patch / CLI Execution</span>
                        <button
                          onClick={() => handleCopyCode(idx, fix.commandOrCode!)}
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          {copiedCodeIdx === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-950 border border-slate-800 rounded-b text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed">
                        {fix.commandOrCode}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Prevention Measures & Grounded RAG Knowledge Sources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prevention Measures */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Long-Term Prevention</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {rcaResult.preventionMeasures.map((measure, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{measure}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Retrieved Knowledge Base Articles Grounding */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Grounded RAG Troubleshooting Knowledge</span>
              </h4>
              {rcaResult.retrievedKnowledgeUsed.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No direct knowledge base articles were cited for this specific error signature.
                </p>
              ) : (
                <div className="space-y-2">
                  {rcaResult.retrievedKnowledgeUsed.map((doc, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200 truncate max-w-xs">{doc.title}</span>
                      <span className="font-mono text-[10px] text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/40">
                        {Math.round(doc.similarityScore * 100)}% match
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
