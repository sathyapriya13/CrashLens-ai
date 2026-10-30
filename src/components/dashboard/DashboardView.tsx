import React from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Activity, 
  Zap, 
  ArrowRight, 
  ShieldAlert,
  Flame,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  AreaChart, 
  Area 
} from 'recharts';
import { LogAnalysisSummary, ErrorCluster } from '../../types/log';

interface DashboardViewProps {
  summary: LogAnalysisSummary;
  onSelectClusterForRca: (cluster: ErrorCluster) => void;
  onNavigateToTab: (tab: any) => void;
  isLoadingRca: boolean;
}

const SEVERITY_COLORS = {
  CRITICAL: '#f43f5e', // rose-500
  ERROR: '#f59e0b',    // amber-500
  WARNING: '#eab308',  // yellow-500
  INFO: '#06b6d4',     // cyan-500
  DEBUG: '#64748b',    // slate-500
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  onSelectClusterForRca,
  onNavigateToTab,
  isLoadingRca,
}) => {
  const {
    totalEntries,
    severityCounts,
    clusters,
    timeline,
    componentBreakdown,
    detectedAnomalies,
  } = summary;

  // Prepare severity chart data
  const severityChartData = [
    { name: 'Critical', value: severityCounts.CRITICAL, color: SEVERITY_COLORS.CRITICAL },
    { name: 'Error', value: severityCounts.ERROR, color: SEVERITY_COLORS.ERROR },
    { name: 'Warning', value: severityCounts.WARNING, color: SEVERITY_COLORS.WARNING },
    { name: 'Info / Other', value: severityCounts.INFO + severityCounts.DEBUG, color: SEVERITY_COLORS.INFO },
  ].filter(d => d.value > 0);

  // Error rate calculation
  const totalErrors = severityCounts.CRITICAL + severityCounts.ERROR;
  const errorRate = totalEntries > 0 ? ((totalErrors / totalEntries) * 100).toFixed(1) : '0.0';

  const primaryCluster = clusters.length > 0 ? clusters[0] : null;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Detected Anomalies Banner if any */}
      {detectedAnomalies.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold">
                  High-Severity Incident Pattern Detected
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                  {detectedAnomalies[0].type}
                </span>
              </div>
              <p className="text-xs text-rose-200 mt-1 font-medium">
                {detectedAnomalies[0].description}
              </p>
            </div>
          </div>
          {primaryCluster && (
            <button
              onClick={() => onSelectClusterForRca(primaryCluster)}
              disabled={isLoadingRca}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-rose-400 hover:bg-rose-300 transition-colors shrink-0 flex items-center gap-1.5 shadow-md shadow-rose-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoadingRca ? 'Analyzing...' : 'Analyze Root Cause with AI'}</span>
            </button>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Entries */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Entries</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {totalEntries.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {summary.fileName}
          </div>
        </div>

        {/* Critical */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Critical Errors</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
            {severityCounts.CRITICAL}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            System crash / OOM
          </div>
        </div>

        {/* Errors */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Errors</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {severityCounts.ERROR}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Exceptions & 5xx
          </div>
        </div>

        {/* Warnings */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Warnings</span>
            <Activity className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-yellow-400 tabular-nums">
            {severityCounts.WARNING}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Resource strain & retry
          </div>
        </div>

        {/* Error Signatures */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Unique Signatures</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
            {clusters.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Clustered patterns
          </div>
        </div>

        {/* Error Rate */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Error Ratio</span>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {errorRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Failures per 100 events
          </div>
        </div>
      </div>

      {/* Charts Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution Donut */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Severity Distribution</span>
              <span className="text-[11px] font-normal text-slate-400">Total {totalEntries}</span>
            </h3>
            <div className="h-52 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
            {severityChartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-400">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-slate-200 tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Timeline / Volume Area Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Error Timeline & Volume Cascade
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-rose-500" /> Critical
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-amber-500" /> Error
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-cyan-500" /> Info
                </span>
              </div>
            </div>
            <div className="h-56 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="timeBucket" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="critical" stackId="1" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="error" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="warning" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="info" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>Visualizes log volume spikes leading to failure events.</span>
            <button 
              onClick={() => onNavigateToTab('analyzer')}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              View Full Stream <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Component Error Frequency Bar Chart & Most Frequent Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Component Breakdown */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono mb-3">
            Error Hotspots by Component
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={componentBreakdown.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="component" type="category" stroke="#94a3b8" fontSize={11} width={90} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="errorCount" fill="#f43f5e" name="Errors" radius={[0, 4, 4, 0]} />
                <Bar dataKey="warningCount" fill="#eab308" name="Warnings" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            Top 5 services experiencing failure pressure.
          </div>
        </div>

        {/* Most Frequent Error Signatures Table */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Most Frequent Error Clusters & Patterns
              </h3>
              <span className="text-xs text-slate-400">
                {clusters.length} unique signatures identified
              </span>
            </div>

            {clusters.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-xs">No repeating error clusters detected in this log dataset.</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-hidden">
                {clusters.slice(0, 4).map((cluster, idx) => (
                  <div
                    key={cluster.signatureId}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                          cluster.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : cluster.severity === 'WARNING'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {cluster.severity}
                        </span>
                        <span className="text-xs font-mono text-cyan-400 truncate font-semibold">
                          [{cluster.component}]
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          Seen {cluster.count}x
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-300 truncate" title={cluster.exampleMessage}>
                        {cluster.exampleMessage}
                      </p>
                    </div>

                    <button
                      onClick={() => onSelectClusterForRca(cluster)}
                      disabled={isLoadingRca}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/50 transition-colors shrink-0 flex items-center gap-1 group-hover:border-cyan-500/60"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Analyze RCA</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Repeated anomalies automatically fingerprinted via pattern abstraction.</span>
            <button
              onClick={() => onNavigateToTab('insights')}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              Full Root Cause Workspace <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
