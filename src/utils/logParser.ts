import { LogEntry, LogSeverity, ErrorCluster, LogAnalysisSummary } from '../types/log';

// Helper to normalize error message into an abstraction signature
export function extractSignaturePattern(message: string): string {
  return message
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>')
    .replace(/\b0x[a-f0-9]+\b/gi, '<HEX>')
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/g, '<IP>')
    .replace(/\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(\.\d+)?Z?\b/g, '<TIMESTAMP>')
    .replace(/\b[A-Za-z0-9_-]+-[0-9a-f]{8,10}-[0-9a-z]{5}\b/g, '<POD_NAME>')
    .replace(/\b(id|order|evt|tr|user|usr)[_=][a-zA-Z0-9_-]+\b/gi, '<ID>')
    .replace(/\b\d+\b/g, '<NUM>')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectSeverity(rawText: string): LogSeverity {
  const upper = rawText.toUpperCase();
  if (/\b(CRITICAL|FATAL|EMERGENCY|ALERT|PANIC|OOMKILLED)\b/.test(upper)) {
    return 'CRITICAL';
  }
  if (/\b(ERROR|EXCEPTION|ERR|FAILURE|FAILED)\b/.test(upper)) {
    return 'ERROR';
  }
  if (/\b(WARN|WARNING)\b/.test(upper)) {
    return 'WARNING';
  }
  if (/\b(DEBUG|TRACE)\b/.test(upper)) {
    return 'DEBUG';
  }
  return 'INFO';
}

function extractTimestamp(raw: string): string | null {
  const isoMatch = raw.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(\.\d+)?Z?/);
  if (isoMatch) return isoMatch[0];

  const dateMatch = raw.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\b/i);
  if (dateMatch) return dateMatch[0];

  return null;
}

function extractComponent(raw: string): string {
  // Try pattern [component-name]
  const bracketMatch = raw.match(/\[([a-zA-Z0-9_\-.]+)\]/);
  if (bracketMatch) return bracketMatch[1];

  // Try pattern (component-name)
  const parenMatch = raw.match(/\(([a-zA-Z0-9_\-.]+)\)/);
  if (parenMatch) return parenMatch[1];

  // Try pattern "component-name:" or "component-name -"
  const prefixMatch = raw.match(/^([a-zA-Z0-9_\-.]+):/);
  if (prefixMatch) return prefixMatch[1];

  return 'system';
}

function extractStatusCode(raw: string): number | undefined {
  const match = raw.match(/\b(HTTP|status=)?\s*(1\d\d|2\d\d|3\d\d|4\d\d|5\d\d)\b/i);
  if (match) {
    const code = parseInt(match[2], 10);
    if (!isNaN(code)) return code;
  }
  return undefined;
}

function extractTraceId(raw: string): string | undefined {
  const match = raw.match(/trace[_-]?id=([a-zA-Z0-9_\-]+)/i);
  return match ? match[1] : undefined;
}

function extractIp(raw: string): string | undefined {
  const match = raw.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  return match ? match[0] : undefined;
}

// Parse CSV content if format matches
function parseCSV(content: string): LogEntry[] | null {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return null;

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));

  const timestampIdx = headers.findIndex(h => h.includes('time') || h.includes('date'));
  const severityIdx = headers.findIndex(h => h.includes('severity') || h.includes('level'));
  const messageIdx = headers.findIndex(h => h.includes('message') || h.includes('msg') || h.includes('error') || h.includes('log'));
  const componentIdx = headers.findIndex(h => h.includes('component') || h.includes('service') || h.includes('app') || h.includes('logger'));

  if (messageIdx === -1 && severityIdx === -1) {
    return null; // Not a structured CSV log
  }

  const entries: LogEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // CSV splitter supporting quoted strings
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim().replace(/^["']|["']$/g, ''));

    const msg = messageIdx >= 0 && cols[messageIdx] ? cols[messageIdx] : rawLine;
    const sevRaw = severityIdx >= 0 && cols[severityIdx] ? cols[severityIdx] : msg;
    const comp = componentIdx >= 0 && cols[componentIdx] ? cols[componentIdx] : extractComponent(rawLine);
    const ts = timestampIdx >= 0 && cols[timestampIdx] ? cols[timestampIdx] : extractTimestamp(rawLine);

    entries.push({
      id: `entry-${i}`,
      lineNumber: i + 1,
      raw: rawLine,
      timestamp: ts,
      severity: detectSeverity(sevRaw),
      component: comp,
      message: msg,
      statusCode: extractStatusCode(rawLine),
      traceId: extractTraceId(rawLine),
      ipAddress: extractIp(rawLine),
    });
  }

  return entries.length > 0 ? entries : null;
}

// Standard multi-line log parser
function parseStandardLogs(content: string): LogEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: LogEntry[] = [];
  let currentEntry: LogEntry | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Check if this line is a continuation of previous entry (e.g., stack trace)
    const isStackTrace = /^\s+(at\s+|Caused by:|Traceback|\.\.\.\s+\d+\s+more|File\s+".*")/i.test(line);

    if (isStackTrace && currentEntry) {
      if (!currentEntry.stackTrace) currentEntry.stackTrace = [];
      currentEntry.stackTrace.push(line.trim());
      currentEntry.raw += '\n' + line;
      continue;
    }

    // New log entry
    const severity = detectSeverity(line);
    const timestamp = extractTimestamp(line);
    const component = extractComponent(line);
    
    // Clean message
    let message = line;
    if (timestamp) message = message.replace(timestamp, '');
    message = message.replace(/\[(INFO|WARN|WARNING|ERROR|CRITICAL|FATAL|DEBUG|TRACE)\]/i, '');
    message = message.replace(/\[([a-zA-Z0-9_\-.]+)\]/, '');
    message = message.trim();

    currentEntry = {
      id: `entry-${entries.length + 1}`,
      lineNumber: i + 1,
      raw: line,
      timestamp,
      severity,
      component,
      message: message || line,
      statusCode: extractStatusCode(line),
      traceId: extractTraceId(line),
      ipAddress: extractIp(line),
    };
    entries.push(currentEntry);
  }

  return entries;
}

export function parseLogFile(fileName: string, content: string, fileSize: number): LogAnalysisSummary {
  let entries: LogEntry[] = [];

  if (fileName.toLowerCase().endsWith('.csv') || content.trim().startsWith('timestamp,') || content.trim().startsWith('time,')) {
    const csvResult = parseCSV(content);
    if (csvResult && csvResult.length > 0) {
      entries = csvResult;
    }
  }

  if (entries.length === 0) {
    entries = parseStandardLogs(content);
  }

  // Count severities
  const severityCounts: Record<LogSeverity, number> = {
    CRITICAL: 0,
    ERROR: 0,
    WARNING: 0,
    INFO: 0,
    DEBUG: 0,
  };

  entries.forEach(e => {
    severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1;
  });

  // Cluster errors and warnings
  const clusterMap = new Map<string, ErrorCluster>();
  const errorEntries = entries.filter(e => e.severity === 'ERROR' || e.severity === 'CRITICAL' || e.severity === 'WARNING');

  errorEntries.forEach(entry => {
    const pattern = extractSignaturePattern(entry.message);
    const signatureId = `${entry.component}::${pattern.slice(0, 70)}`;

    const existing = clusterMap.get(signatureId);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = entry.timestamp || existing.lastSeen;
      if (existing.sampleLineNumbers.length < 5) {
        existing.sampleLineNumbers.push(entry.lineNumber);
      }
      if (!existing.associatedStack && entry.stackTrace) {
        existing.associatedStack = entry.stackTrace;
      }
      // Escalate cluster severity if critical instance appears
      if (entry.severity === 'CRITICAL' && existing.severity !== 'CRITICAL') {
        existing.severity = 'CRITICAL';
      }
    } else {
      clusterMap.set(signatureId, {
        signatureId,
        pattern,
        exampleMessage: entry.message,
        severity: entry.severity,
        component: entry.component,
        count: 1,
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp,
        sampleLineNumbers: [entry.lineNumber],
        associatedStack: entry.stackTrace,
      });
    }
  });

  const clusters = Array.from(clusterMap.values()).sort((a, b) => {
    // Prioritize critical then error count
    if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
    if (b.severity === 'CRITICAL' && a.severity !== 'CRITICAL') return 1;
    return b.count - a.count;
  });

  // Build Component Breakdown
  const compMap = new Map<string, { errorCount: number; warningCount: number; total: number }>();
  entries.forEach(e => {
    const current = compMap.get(e.component) || { errorCount: 0, warningCount: 0, total: 0 };
    current.total += 1;
    if (e.severity === 'CRITICAL' || e.severity === 'ERROR') {
      current.errorCount += 1;
    } else if (e.severity === 'WARNING') {
      current.warningCount += 1;
    }
    compMap.set(e.component, current);
  });

  const componentBreakdown = Array.from(compMap.entries())
    .map(([component, stats]) => ({
      component,
      errorCount: stats.errorCount,
      warningCount: stats.warningCount,
      total: stats.total,
    }))
    .sort((a, b) => (b.errorCount + b.warningCount) - (a.errorCount + a.warningCount));

  // Build Timeline (bucketed by sequence or timestamp)
  const bucketCount = Math.min(10, Math.max(4, Math.ceil(entries.length / 5)));
  const bucketSize = Math.max(1, Math.floor(entries.length / bucketCount));
  const timeline: LogAnalysisSummary['timeline'] = [];

  for (let b = 0; b < bucketCount; b++) {
    const startIdx = b * bucketSize;
    const endIdx = Math.min(entries.length, (b + 1) * bucketSize);
    const slice = entries.slice(startIdx, endIdx);
    if (slice.length === 0) continue;

    const firstTs = slice[0].timestamp;
    const timeLabel = firstTs
      ? firstTs.split('T')[1]?.slice(0, 8) || firstTs.slice(-8)
      : `P${b + 1}`;

    const bucketCounts = {
      critical: 0,
      error: 0,
      warning: 0,
      info: 0,
    };

    slice.forEach(s => {
      if (s.severity === 'CRITICAL') bucketCounts.critical++;
      else if (s.severity === 'ERROR') bucketCounts.error++;
      else if (s.severity === 'WARNING') bucketCounts.warning++;
      else bucketCounts.info++;
    });

    timeline.push({
      timeBucket: timeLabel,
      ...bucketCounts,
    });
  }

  // Detect Anomalies (Spikes, Cascade Failures, Fatal Chains)
  const detectedAnomalies: LogAnalysisSummary['detectedAnomalies'] = [];

  // 1. Check for OOM or Fatal exit
  const oomEntries = entries.filter(e => /OOMKilled|exit code 137|OutOfMemoryError|Memory cgroup/i.test(e.raw));
  if (oomEntries.length > 0) {
    detectedAnomalies.push({
      type: 'FATAL_CHAIN',
      description: 'Container Termination / Out of Memory killer executed (Exit code 137). Process killed.',
      severity: 'CRITICAL',
      linesInvolved: oomEntries.map(e => e.lineNumber),
      timestamp: oomEntries[0].timestamp || undefined,
    });
  }

  // 2. Cascade Failure check (DB error followed by HTTP 500/504)
  const dbErrors = entries.filter(e => /connection pool|PSQLException|deadlock|remaining connection slots/i.test(e.raw));
  const gatewayTimeouts = entries.filter(e => /504|Gateway Timeout|502 Bad Gateway/i.test(e.raw));
  if (dbErrors.length > 0 && gatewayTimeouts.length > 0) {
    detectedAnomalies.push({
      type: 'CASCADE_FAILURE',
      description: 'Cascading Dependency Failure: Core storage saturation triggered upstream API Gateway timeouts (502/504).',
      severity: 'CRITICAL',
      linesInvolved: [...dbErrors.slice(0, 3).map(e => e.lineNumber), ...gatewayTimeouts.slice(0, 3).map(e => e.lineNumber)],
    });
  }

  // 3. Error Spike Check
  const maxCluster = clusters[0];
  if (maxCluster && maxCluster.count >= 3) {
    detectedAnomalies.push({
      type: 'REPEATED_BURST',
      description: `Repeated Error Burst: "${maxCluster.pattern.slice(0, 60)}..." triggered ${maxCluster.count} times.`,
      severity: maxCluster.severity,
      linesInvolved: maxCluster.sampleLineNumbers,
    });
  }

  return {
    fileName,
    fileSize,
    totalEntries: entries.length,
    severityCounts,
    clusters,
    timeline,
    componentBreakdown,
    detectedAnomalies,
  };
}
