import React from 'react';
import { 
  LayoutDashboard, 
  Terminal, 
  BrainCircuit, 
  Database, 
  FileCheck2, 
  MessageSquareCode,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'analyzer' | 'insights' | 'rag' | 'reports' | 'chat';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  errorCount: number;
  criticalCount: number;
  hasAnalyzedRca: boolean;
  activeFileName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  errorCount,
  criticalCount,
  hasAnalyzedRca,
  activeFileName,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: criticalCount > 0 ? `${criticalCount} crit` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'analyzer' as ActiveTab,
      label: 'Log Analyzer',
      icon: Terminal,
      badge: errorCount > 0 ? `${errorCount} err` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'insights' as ActiveTab,
      label: 'AI Root Cause',
      icon: BrainCircuit,
      badge: hasAnalyzedRca ? 'Ready' : 'Pending',
      badgeColor: hasAnalyzedRca ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-slate-800 text-slate-400 border-slate-700',
    },
    {
      id: 'rag' as ActiveTab,
      label: 'RAG Knowledge',
      icon: Database,
    },
    {
      id: 'reports' as ActiveTab,
      label: 'Incident Reports',
      icon: FileCheck2,
    },
    {
      id: 'chat' as ActiveTab,
      label: 'AI Chat Assistant',
      icon: MessageSquareCode,
      badge: 'Gemini',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none backdrop-blur-md">
      <div>
        {/* Brand header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block leading-none">
              CrashLens
            </span>
            <span className="text-[11px] font-mono text-slate-400 block mt-1">
              AI Error & RCA Suite
            </span>
          </div>
        </div>

        {/* Current Active Log File Pill */}
        <div className="px-4 py-3 mx-3 my-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Active Dataset
          </div>
          <div className="text-xs font-mono font-medium text-slate-200 truncate mt-0.5" title={activeFileName}>
            {activeFileName || 'No log uploaded'}
          </div>
        </div>

        {/* Navigation list */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System status footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Engine Status</span>
          <span className="text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Online
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          RAG Vector Engine · Gemini 3.8
        </div>
      </div>
    </aside>
  );
};
