import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Sparkles, 
  Terminal, 
  Download, 
  Layers,
  Info
} from 'lucide-react';
import { LogEntry, LogSeverity, ErrorCluster } from '../../types/log';

interface LogAnalyzerViewProps {
  entries: LogEntry[];
  fileName: string;
  onAnalyzeSpecificEntry: (entry: LogEntry) => void;
  isLoadingRca: boolean;
}

export const LogAnalyzerView: React.FC<LogAnalyzerViewProps> = ({
  entries,
  fileName,
  onAnalyzeSpecificEntry,
  isLoadingRca,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedComponent, setSelectedComponent] = useState<string>('ALL');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique components
  const componentsList = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => set.add(e.component));
    return ['ALL', ...Array.from(set).sort()];
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      // Severity filter
      if (selectedSeverity !== 'ALL' && e.severity !== selectedSeverity) {
        return false;
      }
      // Component filter
      if (selectedComponent !== 'ALL' && e.component !== selectedComponent) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMsg = e.message.toLowerCase().includes(q);
        const matchesRaw = e.raw.toLowerCase().includes(q);
        const matchesComp = e.component.toLowerCase().includes(q);
        const matchesLine = e.lineNumber.toString() === q;
        if (!matchesMsg && !matchesRaw && !matchesComp && !matchesLine) {
          return false;
        }
      }
      return true;
    });
  }, [entries, selectedSeverity, selectedComponent, searchQuery]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportFiltered = () => {
    const rawExport = filteredEntries.map(e => e.raw).join('\n');
    const blob = new Blob([rawExport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filtered-${fileName}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityBadgeClass = (severity: LogSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'ERROR':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'WARNING':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'INFO':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'DEBUG':
        return 'bg-slate-700/40 text-slate-400 border-slate-600/30';
    }
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Filter and Control Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in log lines, error messages, stack traces, or line #..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Component Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">Component:</span>
            <select
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {componentsList.map((comp) => (
                <option key={comp} value={comp}>
                  {comp === 'ALL' ? 'All Components' : comp}
                </option>
              ))}
            </select>

            {/* Export button */}
            <button
              onClick={handleExportFiltered}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors whitespace-nowrap"
              title="Download currently filtered lines as .log"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Export Filtered</span>
            </button>
          </div>
        </div>

        {/* Severity Segmented Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-mono mr-2">Severity:</span>
          {(['ALL', 'CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'] as const).map((sev) => {
            const isActive = selectedSeverity === sev;
            return (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {sev}
              </button>
            );
          })}

          <div className="ml-auto text-xs font-mono text-slate-400">
            Showing <span className="text-cyan-400 font-semibold">{filteredEntries.length}</span> of {entries.length} entries
          </div>
        </div>
      </div>

      {/* Log Entries Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
        {filteredEntries.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Terminal className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-xs font-medium">No log events match your query or active filters.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedSeverity('ALL'); setSelectedComponent('ALL'); }}
              className="mt-3 px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 underline font-mono"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-16 text-right">#</th>
                  <th className="py-2.5 px-3 w-24">Severity</th>
                  <th className="py-2.5 px-3 w-40">Timestamp</th>
                  <th className="py-2.5 px-3 w-36">Component</th>
                  <th className="py-2.5 px-3">Message</th>
                  <th className="py-2.5 px-3 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEntries.slice(0, 150).map((entry) => {
                  const isExpanded = expandedEntryId === entry.id;
                  const isErrorOrCrit = entry.severity === 'ERROR' || entry.severity === 'CRITICAL';

                  return (
                    <React.Fragment key={entry.id}>
                      <tr 
                        className={`hover:bg-slate-800/40 transition-colors group cursor-pointer ${
                          isExpanded ? 'bg-slate-800/50' : ''
                        }`}
                        onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      >
                        {/* Line Number */}
                        <td className="py-2 px-3 text-slate-400 text-right tabular-nums select-none">
                          {entry.lineNumber}
                        </td>

                        {/* Severity */}
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getSeverityBadgeClass(entry.severity)}`}>
                            {entry.severity}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap tabular-nums">
                          {entry.timestamp ? entry.timestamp.split('T')[1]?.slice(0, 12) || entry.timestamp : '—'}
                        </td>

                        {/* Component */}
                        <td className="py-2 px-3 text-cyan-300 font-semibold truncate max-w-[140px]" title={entry.component}>
                          {entry.component}
                        </td>

                        {/* Message */}
                        <td className="py-2 px-3 text-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-xl block" title={entry.message}>
                              {entry.message}
                            </span>
                            {entry.stackTrace && entry.stackTrace.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-sans">
                                +{entry.stackTrace.length} stack
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {isErrorOrCrit && (
                              <button
                                onClick={() => onAnalyzeSpecificEntry(entry)}
                                disabled={isLoadingRca}
                                className="p-1 px-2 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 text-[11px] font-sans flex items-center gap-1 transition-colors"
                                title="Run AI Root Cause Analysis on this error"
                              >
                                <Sparkles className="w-3 h-3 text-cyan-400" />
                                <span className="hidden xl:inline">AI RCA</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleCopy(entry.id, entry.raw)}
                              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                              title="Copy raw log line"
                            >
                              {copiedId === entry.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Detail Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-slate-800">
                          <td colSpan={6} className="p-4">
                            <div className="space-y-3 font-mono text-xs">
                              {/* Metadata tags */}
                              <div className="flex flex-wrap gap-4 text-[11px] text-slate-400 pb-2 border-b border-slate-800">
                                <div><span className="text-slate-400">Line:</span> <span className="text-slate-200">{entry.lineNumber}</span></div>
                                <div><span className="text-slate-400">Timestamp:</span> <span className="text-slate-200">{entry.timestamp || 'Not recorded'}</span></div>
                                <div><span className="text-slate-400">Component:</span> <span className="text-cyan-400">{entry.component}</span></div>
                                {entry.statusCode && (
                                  <div><span className="text-slate-400">HTTP Status:</span> <span className="text-amber-400 font-bold">{entry.statusCode}</span></div>
                                )}
                                {entry.traceId && (
                                  <div><span className="text-slate-400">Trace ID:</span> <span className="text-indigo-400">{entry.traceId}</span></div>
                                )}
                                {entry.ipAddress && (
                                  <div><span className="text-slate-400">Client IP:</span> <span className="text-slate-200">{entry.ipAddress}</span></div>
                                )}
                              </div>

                              {/* Raw Log & Stack Trace */}
                              <div>
                                <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                                  <span>Raw Event & Stack Trace</span>
                                  <button
                                    onClick={() => handleCopy(`${entry.id}-full`, entry.raw)}
                                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Stack</span>
                                  </button>
                                </div>
                                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300 overflow-x-auto text-[11px] leading-relaxed max-h-56">
                                  {entry.raw}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {filteredEntries.length > 150 && (
              <div className="p-3 text-center text-xs font-mono text-slate-400 bg-slate-950/40 border-t border-slate-800">
                Displaying first 150 of {filteredEntries.length} entries for performance. Filter to narrow results.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
