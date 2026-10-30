import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { LogAnalyzerView } from './components/analyzer/LogAnalyzerView';
import { RootCauseView } from './components/insights/RootCauseView';
import { KnowledgeBaseView } from './components/rag/KnowledgeBaseView';
import { AIChatAssistantView } from './components/chat/AIChatAssistantView';
import { ReportGeneratorView } from './components/reports/ReportGeneratorView';
import { LogUploadModal } from './components/upload/LogUploadModal';
import { SAMPLE_LOGS } from './data/sampleLogs';
import { parseLogFile } from './utils/logParser';
import { LogAnalysisSummary, LogEntry, ErrorCluster, RootCauseAnalysisResult } from './types/log';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  // Active dataset state - initialized with first sample so app works immediately!
  const initialSample = SAMPLE_LOGS[0];
  const [fileName, setFileName] = useState(initialSample.fileName);
  const [fileContent, setFileContent] = useState(initialSample.content);
  const [fileSize, setFileSize] = useState(new Blob([initialSample.content]).size);

  // Parsed summary and entries
  const [summary, setSummary] = useState<LogAnalysisSummary>(() => {
    return parseLogFile(initialSample.fileName, initialSample.content, new Blob([initialSample.content]).size);
  });

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<ErrorCluster | null>(null);
  const [rcaResult, setRcaResult] = useState<RootCauseAnalysisResult | null>(null);
  const [isLoadingRca, setIsLoadingRca] = useState(false);

  // Check backend health and Gemini API key availability
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setHasGeminiKey(Boolean(data.hasGeminiKey));
        }
      } catch {
        setHasGeminiKey(false);
      }
    };
    checkHealth();
  }, []);

  // Whenever fileContent or fileName changes, re-parse
  useEffect(() => {
    const parsed = parseLogFile(fileName, fileContent, fileSize);
    setSummary(parsed);

    // Also re-parse raw entries for table
    // parseLogFile handles both, let's extract entries
    const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    // Simple fast extraction of raw entries
    const sampleEntries: LogEntry[] = lines.map((line, idx) => {
      const isCrit = /CRITICAL|FATAL|OOMKILLED/i.test(line);
      const isErr = /ERROR|EXCEPTION|ERR|FAIL/i.test(line);
      const isWarn = /WARN|WARNING/i.test(line);
      const isDebug = /DEBUG|TRACE/i.test(line);
      const sev = isCrit ? 'CRITICAL' : isErr ? 'ERROR' : isWarn ? 'WARNING' : isDebug ? 'DEBUG' : 'INFO';

      const bracketMatch = line.match(/\[([a-zA-Z0-9_\-.]+)\]/);
      const comp = bracketMatch ? bracketMatch[1] : 'system';

      return {
        id: `entry-${idx + 1}`,
        lineNumber: idx + 1,
        raw: line,
        timestamp: line.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/)?.[0] || null,
        severity: sev,
        component: comp,
        message: line,
      };
    });
    setEntries(sampleEntries);

    // Default select top cluster
    if (parsed.clusters.length > 0) {
      setSelectedCluster(parsed.clusters[0]);
    } else {
      setSelectedCluster(null);
    }

    // Reset previous RCA
    setRcaResult(null);
  }, [fileName, fileContent, fileSize]);

  // Handler to load new log content
  const handleLoadLog = (name: string, content: string, size: number) => {
    setFileName(name);
    setFileContent(content);
    setFileSize(size);
    setActiveTab('dashboard');
  };

  // Run Root Cause Analysis on selected cluster
  const handleRunRca = async (cluster: ErrorCluster) => {
    setIsLoadingRca(true);
    try {
      // Find surrounding log lines
      const contextLines = entries
        .filter(e => cluster.sampleLineNumbers.includes(e.lineNumber) || e.severity === 'CRITICAL' || e.severity === 'ERROR')
        .slice(0, 15)
        .map(e => `[${e.severity}] [${e.component}] ${e.message}`);

      const res = await fetch('/api/analyze-root-cause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cluster,
          logContextLines: contextLines,
          targetMessage: cluster.exampleMessage,
        }),
      });

      if (!res.ok) {
        throw new Error('Analysis server error');
      }

      const data: RootCauseAnalysisResult = await res.json();
      setRcaResult(data);
      setActiveTab('insights');
    } catch (err: any) {
      console.error('Failed to analyze root cause:', err);
    } finally {
      setIsLoadingRca(false);
    }
  };

  // Run RCA for a specific entry selected in analyzer
  const handleAnalyzeSpecificEntry = (entry: LogEntry) => {
    // Find matching cluster or synthesize a cluster
    const cluster: ErrorCluster = {
      signatureId: `${entry.component}::${entry.message.slice(0, 50)}`,
      pattern: entry.message,
      exampleMessage: entry.message,
      severity: entry.severity,
      component: entry.component,
      count: 1,
      firstSeen: entry.timestamp,
      lastSeen: entry.timestamp,
      sampleLineNumbers: [entry.lineNumber],
      associatedStack: entry.stackTrace,
    };
    setSelectedCluster(cluster);
    handleRunRca(cluster);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 antialiased font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        errorCount={summary.severityCounts.ERROR}
        criticalCount={summary.severityCounts.CRITICAL}
        hasAnalyzedRca={Boolean(rcaResult)}
        activeFileName={fileName}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          onOpenSamples={() => setIsUploadModalOpen(true)}
          hasApiKey={hasGeminiKey}
          totalEntries={summary.totalEntries}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              onSelectClusterForRca={(c) => {
                setSelectedCluster(c);
                handleRunRca(c);
              }}
              onNavigateToTab={setActiveTab}
              isLoadingRca={isLoadingRca}
            />
          )}

          {activeTab === 'analyzer' && (
            <LogAnalyzerView
              entries={entries}
              fileName={fileName}
              onAnalyzeSpecificEntry={handleAnalyzeSpecificEntry}
              isLoadingRca={isLoadingRca}
            />
          )}

          {activeTab === 'insights' && (
            <RootCauseView
              rcaResult={rcaResult}
              clusters={summary.clusters}
              selectedCluster={selectedCluster}
              onSelectCluster={setSelectedCluster}
              onRunRca={handleRunRca}
              isLoading={isLoadingRca}
            />
          )}

          {activeTab === 'rag' && (
            <KnowledgeBaseView hasGeminiKey={hasGeminiKey} />
          )}

          {activeTab === 'reports' && (
            <ReportGeneratorView
              summary={summary}
              rcaResult={rcaResult}
            />
          )}

          {activeTab === 'chat' && (
            <AIChatAssistantView
              summary={summary}
              activeCluster={selectedCluster}
              hasGeminiKey={hasGeminiKey}
            />
          )}
        </main>
      </div>

      {/* Upload and Sample Log Modal */}
      <LogUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onLoadLog={handleLoadLog}
      />
    </div>
  );
}
