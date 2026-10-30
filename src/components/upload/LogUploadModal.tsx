import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileCode, 
  AlertTriangle, 
  CheckCircle, 
  ClipboardCopy, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { SAMPLE_LOGS, SampleLogDefinition } from '../../data/sampleLogs';

interface LogUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadLog: (fileName: string, content: string, fileSize: number) => void;
}

export const LogUploadModal: React.FC<LogUploadModalProps> = ({
  isOpen,
  onClose,
  onLoadLog,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'paste'>('samples');
  const [isDragging, setIsDragging] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [pasteFileName, setPasteFileName] = useState('custom-incident.log');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['.txt', '.log', '.csv'];
    const name = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => name.endsWith(ext));

    if (!hasValidExt) {
      setErrorMessage('Please upload a valid log file format: .log, .txt, or .csv');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content || content.trim().length === 0) {
        setErrorMessage('Uploaded file is empty.');
        return;
      }
      onLoadLog(file.name, content, file.size);
      onClose();
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: SampleLogDefinition) => {
    onLoadLog(sample.fileName, sample.content, new Blob([sample.content]).size);
    onClose();
  };

  const handlePasteSubmit = () => {
    if (!pasteContent.trim()) {
      setErrorMessage('Please paste log content before continuing.');
      return;
    }
    const cleanName = pasteFileName.trim() || 'pasted-log-entry.log';
    onLoadLog(cleanName, pasteContent, new Blob([pasteContent]).size);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Load Software Logs for Analysis
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload local files, pick realistic benchmark logs, or paste raw telemetry.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('samples')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'samples'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pre-Configured Scenarios (4)</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File (.log, .txt, .csv)</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'paste'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            <span>Paste Raw Logs</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">
                Select a real-world incident scenario to immediately see root cause analysis, RAG retrieval, and visualizations in action:
              </p>
              {SAMPLE_LOGS.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className="group p-3.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-cyan-500/40 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                        {sample.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                        .{sample.format}
                      </span>
                    </div>
                    <span className="text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-mono">
                      Load Scenario <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {sample.description}
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <span className="text-slate-400">Target Signature:</span>
                    <span className="text-amber-400 truncate max-w-sm">{sample.expectedPrimaryIssue}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-cyan-400 bg-cyan-950/20' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".log,.txt,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-cyan-400">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">
                Drag and drop your log file here
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Supports Apache, Nginx, Kubernetes, Spring, Python traceback, syslog, and CSV formats (.log, .txt, .csv)
              </p>
              <button 
                type="button"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm"
              >
                Browse Files
              </button>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">
                  Virtual Log File Name
                </label>
                <input
                  type="text"
                  value={pasteFileName}
                  onChange={(e) => setPasteFileName(e.target.value)}
                  placeholder="e.g. error-dump-2026.log"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">
                  Raw Log Lines / Stack Trace
                </label>
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Paste stack traces, syslog lines, or error dumps here..."
                  rows={9}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handlePasteSubmit}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm"
                >
                  Analyze Pasted Logs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
