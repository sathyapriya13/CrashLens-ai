import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquareCode, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  RotateCcw, 
  Terminal, 
  BookOpen, 
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { ChatMessage, LogAnalysisSummary, ErrorCluster } from '../../types/log';

interface AIChatAssistantViewProps {
  summary: LogAnalysisSummary;
  activeCluster: ErrorCluster | null;
  hasGeminiKey: boolean;
}

const DEFAULT_PROMPTS = [
  'Which component failed first and triggered the cascade?',
  'Give me a step-by-step hotfix shell script to resolve this outage.',
  'Is there a risk of customer transaction loss or data corruption?',
  'Why did the container terminate with exit code 137?',
];

export const AIChatAssistantView: React.FC<AIChatAssistantViewProps> = ({
  summary,
  activeCluster,
  hasGeminiKey,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm CrashLens SRE Assistant. I've ingested **${summary.fileName}** (${summary.totalEntries} entries, ${summary.severityCounts.CRITICAL} critical, ${summary.severityCounts.ERROR} errors). Ask me anything about log patterns, root causes, or remediation steps.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          logSummary: summary,
          activeErrorCluster: activeCluster,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const aiReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.content || 'I could not synthesize an answer.',
        timestamp: new Date().toLocaleTimeString(),
        referencedKnowledge: data.referencedKnowledge,
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error communicating with diagnostic engine: ${err.message || 'Please check server logs.'}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Chat session reset. Ready to answer questions about **${summary.fileName}**.`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-2xl animate-in fade-in duration-200">
      {/* Chat Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100">CrashLens AI Copilot</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                Grounding: {summary.fileName}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Interactive SRE Root Cause Reasoning & Knowledge Retrieval
            </span>
          </div>
        </div>

        <button
          onClick={handleResetChat}
          className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-mono ${
                  isUser
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-2xl rounded-xl p-4 text-xs leading-relaxed space-y-2 relative group ${
                  isUser
                    ? 'bg-cyan-950/40 border border-cyan-800/40 text-slate-100'
                    : 'bg-slate-950/70 border border-slate-800/90 text-slate-200'
                }`}
              >
                {/* Copy button */}
                <button
                  onClick={() => handleCopyMessage(msg.id, msg.content)}
                  className="absolute right-2 top-2 p-1 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy message"
                >
                  {copiedMsgId === msg.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>

                {/* Content formatted with basic markdown rendering */}
                <div className="prose prose-invert prose-xs max-w-none space-y-2">
                  {msg.content.split('\n\n').map((paragraph, pIdx) => {
                    // Check if paragraph is code block
                    if (paragraph.startsWith('```')) {
                      const lines = paragraph.split('\n');
                      const lang = lines[0].replace('```', '') || 'sh';
                      const code = lines.slice(1, -1).join('\n') || lines.slice(1).join('\n').replace('```', '');
                      return (
                        <pre key={pIdx} className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] text-cyan-300 overflow-x-auto my-2">
                          <code>{code}</code>
                        </pre>
                      );
                    }
                    if (paragraph.startsWith('### ')) {
                      return <h4 key={pIdx} className="text-xs font-bold text-cyan-300 font-mono mt-1">{paragraph.replace('### ', '')}</h4>;
                    }
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      return <p key={pIdx} className="font-semibold text-slate-100">{paragraph.replace(/\*\*/g, '')}</p>;
                    }
                    return <p key={pIdx} className="text-slate-300 whitespace-pre-wrap">{paragraph}</p>;
                  })}
                </div>

                {/* Referenced Knowledge Tags if any */}
                {msg.referencedKnowledge && msg.referencedKnowledge.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-400">Cited Knowledge:</span>
                    {msg.referencedKnowledge.map((k, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                        {k}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-[10px] font-mono text-slate-400 text-right select-none pt-1">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing log context with Gemini SRE engine...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      <div className="px-5 py-2.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">Suggested:</span>
        {DEFAULT_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            disabled={isSending}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors whitespace-nowrap"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about error causes, stack traces, mitigation commands, or prevention..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
