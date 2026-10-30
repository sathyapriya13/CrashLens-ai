import React from 'react';
import { UploadCloud, Sparkles, FolderOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface HeaderProps {
  activeTab: ActiveTab;
  onOpenUpload: () => void;
  onOpenSamples: () => void;
  hasApiKey: boolean;
  totalEntries: number;
}

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Incident Telemetry & Error Distribution',
    subtitle: 'System anomaly alerts, frequency clusters, and log timeline',
  },
  analyzer: {
    title: 'Log Stream Explorer',
    subtitle: 'Filter, inspect, and trace raw and parsed events',
  },
  insights: {
    title: 'AI Root Cause Analysis & Blast Radius',
    subtitle: 'Automated hypothesis deduction, component impact, and remediation steps',
  },
  rag: {
    title: 'RAG Troubleshooting Knowledge Base',
    subtitle: 'Semantic similarity search and vector knowledge retrieval',
  },
  reports: {
    title: 'Incident Analysis Reports',
    subtitle: 'Exportable post-mortem documentation and structured summaries',
  },
  chat: {
    title: 'AI Diagnostics Assistant',
    subtitle: 'Interactive root cause debugging with contextual log grounding',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenUpload,
  onOpenSamples,
  hasApiKey,
  totalEntries,
}) => {
  const current = TAB_TITLES[activeTab];

  return (
    <header className="h-16 px-6 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between gap-6 shrink-0 z-10">
      {/* Zone 1 & 2: Context & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>{current.title}</span>
            <span className="text-slate-600 font-normal">/</span>
            <span className="text-xs font-mono font-normal text-cyan-400">
              {totalEntries.toLocaleString()} events loaded
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Gemini status badge */}
        <div 
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border ${
            hasApiKey 
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
          }`}
          title={hasApiKey ? 'Gemini 3.8 Flash API Connected' : 'Running in local fallback mode (Add GEMINI_API_KEY in Secrets for live AI)'}
        >
          {hasApiKey ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Gemini AI Active</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Local RAG Engine</span>
            </>
          )}
        </div>

        {/* Load sample button */}
        <button
          onClick={onOpenSamples}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors whitespace-nowrap"
        >
          <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sample Logs</span>
        </button>

        {/* Upload log file primary action */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 shadow-md shadow-cyan-500/20 transition-all whitespace-nowrap"
        >
          <UploadCloud className="w-3.5 h-3.5 text-slate-950" />
          <span>Upload Log</span>
        </button>
      </div>
    </header>
  );
};
