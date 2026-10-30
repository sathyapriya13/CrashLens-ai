import { KnowledgeArticle } from '../types/log';

export const DEFAULT_KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: 'kb-db-pool-exhausted',
    title: 'Database Connection Pool Exhaustion (PostgreSQL / MySQL)',
    category: 'Database & Storage',
    keywords: ['remaining connection slots', 'connection pool', 'max_connections', 'pool exhausted', 'Timeout waiting for idle connection', 'Too many connections'],
    errorPatternRegex: '(remaining connection slots|connection pool exhausted|Timeout waiting for idle connection|Too many connections|ConnectionPoolTimeoutException)',
    symptoms: [
      'Backend HTTP endpoints hang and respond with 500 or 504 Gateway Timeout.',
      'Log message: "FATAL: remaining connection slots are reserved for non-replication superuser connections".',
      'Sudden jump in database connection count reaching server limits.'
    ],
    rootCauseSummary: 'Active connections exceeded max allowed limits, usually caused by connection leaks (connections opened but not closed in finally blocks), slow queries holding transactions open, or serverless autoscaling spawning too many concurrent pool instances.',
    recommendedFix: 'Implement connection pooling proxy like PgBouncer or AWS RDS Proxy, review connection release lifecycle, and configure aggressive connection lease timeouts.',
    troubleshootingSteps: [
      'Query pg_stat_activity to find active and idle-in-transaction connections.',
      'Check if client pool max size (e.g., HikariCP, pg-pool, Prisma) is multiplied across replica pods.',
      'Set idleTimeoutMillis to 10000ms and connectionTimeoutMillis to 5000ms in client pool config.',
      'Deploy PgBouncer in transaction pooling mode to multiplex thousands of client connections into a manageable pool.'
    ],
    preventionTip: 'Always acquire connections via scoped context managers or try-with-resources. Set max_connections alert at 80% capacity.',
    codeSnippet: `// Proper connection pooling with graceful release in Node.js/TypeScript
import { Pool } from 'pg';

const pool = new Pool({
  max: 20, // Limit pool size per container instance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function executeQuery(sql: string, params: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release(); // Crucial: always release in finally block!
  }
}`
  },
  {
    id: 'kb-redis-timeout-readonly',
    title: 'Redis Cluster Failover & Read-Only Replica Write Block',
    category: 'Caching & Session',
    keywords: ['READONLY You can\'t write against a read only replica', 'Redis command timed out', 'JedisConnectionException', 'RedisTimeoutException', 'CLUSTERDOWN'],
    errorPatternRegex: '(READONLY You can\'t write|RedisTimeoutException|JedisConnectionException|CLUSTERDOWN Hash slot not served)',
    symptoms: [
      'Write operations (SET, HSET, LPUSH) immediately fail with READONLY errors.',
      'User session state fails to persist, causing unexpected logouts.',
      'Intermittent spikes in response latency across microservices.'
    ],
    rootCauseSummary: 'A Redis primary node went down and the replica was promoted, but the client SDK cached stale cluster topology and continued directing writes to the old master or a demoted read replica.',
    recommendedFix: 'Enable periodic topology refresh in client library (e.g. Lettuce/ioredis periodicRefresh or enableAutoPipelining) and verify cluster health.',
    troubleshootingSteps: [
      'Run "redis-cli -h <host> -p <port> cluster nodes" or "info replication" to verify current role.',
      'Configure client topology refresh interval to 15 seconds.',
      'Ensure Redis Sentinel or AWS ElastiCache Multi-AZ failover has stabilized.',
      'Verify network security group allows port 6379 & cluster bus port 16379.'
    ],
    preventionTip: 'Enable client-side auto-discovery and implement circuit breakers around Redis cache misses to avoid overwhelming the primary DB.',
    codeSnippet: `// ioredis cluster config with automatic topology refresh
import Redis from 'ioredis';

const cluster = new Redis.Cluster([
  { host: 'redis-node-1.internal', port: 6379 }
], {
  redisOptions: {
    commandTimeout: 2000,
  },
  clusterRetryStrategy: (times) => Math.min(100 * times, 2000),
  slotsRefreshTimeout: 1000,
  enableReadyCheck: true,
  scaleReads: 'slave',
});`
  },
  {
    id: 'kb-oom-killed-137',
    title: 'Kubernetes Container OOMKilled (Exit Code 137 / Heap Space)',
    category: 'Infrastructure & Kubernetes',
    keywords: ['OOMKilled', 'exit code 137', 'OutOfMemoryError', 'Java heap space', 'cgroup memory limit', 'Killed process', 'Memory cgroup out of memory'],
    errorPatternRegex: '(OOMKilled|exit code 137|OutOfMemoryError|Memory cgroup out of memory|cgroup out of memory)',
    symptoms: [
      'Pod abruptly terminates with status CrashLoopBackOff or OOMKilled.',
      'Kubernetes describe pod shows: "Last State: Terminated, Reason: OOMKilled, Exit Code: 137".',
      'System throughput drops to zero as pods restart in rapid succession.'
    ],
    rootCauseSummary: 'The container resident memory (RSS + buffers) exceeded the pod cgroup memory limit specified in the Kubernetes deployment manifest, triggering the Linux kernel out-of-memory killer.',
    recommendedFix: 'Increase container memory limits, fix in-memory payload leaks (unbounded queues, large unpaginated SQL results), and tune runtime JVM/Node heap flags.',
    troubleshootingSteps: [
      'Run "kubectl describe pod <pod-name>" to inspect limits and termination reason.',
      'Inspect memory telemetry before crash: check if memory rises monotonically (leak) or spikes instantaneously on specific endpoints.',
      'For Node.js, pass --max-old-space-size=4096 ensuring it is at 75% of container memory limit.',
      'For Java, configure -XX:MaxRAMPercentage=75.0 instead of hardcoding -Xmx.'
    ],
    preventionTip: 'Enforce streaming responses for large exports or file uploads instead of buffering entire payloads into memory buffers.',
    codeSnippet: `# Kubernetes Resource Config with OOM buffer headroom
spec:
  containers:
  - name: api-service
    image: api-service:v2.4
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "2Gi" # Ensure 500MB+ headroom over application heap limit
    env:
    - name: NODE_OPTIONS
      value: "--max-old-space-size=1536"`
  },
  {
    id: 'kb-kafka-rebalance-timeout',
    title: 'Kafka Consumer Group Rebalance Storm (CommitFailedException)',
    category: 'Streaming & Messaging',
    keywords: ['CommitFailedException', 'max.poll.interval.ms', 'ConsumerCoordinator', 'Group rebalance', 'Offset commit cannot be completed', 'Revoking assigned partitions'],
    errorPatternRegex: '(CommitFailedException|max\\.poll\\.interval\\.ms|ConsumerCoordinator.*rebalance|Offset commit cannot be completed)',
    symptoms: [
      'Consumer logs error: "CommitFailedException: Offset commit cannot be completed since the consumer is not part of the group".',
      'Message processing halts repeatedly as consumer partitions are revoked and reassigned.',
      'End-to-end event latency surges into tens of minutes.'
    ],
    rootCauseSummary: 'The consumer took longer to process a batch of messages than max.poll.interval.ms (default 300,000ms / 5 min). The broker assumed the worker died, kicked it out of the consumer group, and triggered a cluster-wide rebalance.',
    recommendedFix: 'Decrease max.poll.records (e.g. from 500 to 50), increase max.poll.interval.ms, or offload heavy processing to worker thread pool.',
    troubleshootingSteps: [
      'Identify slow downstream calls (external APIs, slow DB queries) inside the message processing loop.',
      'Reduce max.poll.records so each batch completes within a predictable 30-second window.',
      'Verify heartbeat.interval.ms is at least 1/3 of session.timeout.ms.',
      'Adopt cooperative rebalance strategy (CooperativeStickyAssignor) to avoid stop-the-world partition revocations.'
    ],
    preventionTip: 'Never execute blocking long-running operations synchronously inside the Kafka poll loop.',
    codeSnippet: `// Kafka Consumer Configuration tuning
const kafkaConfig = {
  groupId: 'order-processing-v1',
  maxPollIntervalMs: 600000, // 10 minutes
  maxPollRecords: 25,        // Reduced batch size to guarantee completion
  sessionTimeoutMs: 45000,
  heartbeatIntervalMs: 15000,
  partitionAssignors: ['org.apache.kafka.clients.consumer.CooperativeStickyAssignor']
};`
  },
  {
    id: 'kb-stripe-signature-mismatch',
    title: 'Payment Gateway Webhook Signature Verification Failure',
    category: 'Payments & Integrations',
    keywords: ['SignatureVerificationException', 'webhook signing secret', 'No signatures found matching the expected signature', 'stripe-signature'],
    errorPatternRegex: '(SignatureVerificationException|No signatures found matching the expected signature|stripe-signature mismatch|Invalid webhook signature)',
    symptoms: [
      'Inbound webhook returns HTTP 400 Bad Request to Stripe/PayPal.',
      'Customer orders are marked unpaid even though credit card was charged.',
      'Log message: "Webhook Error: No signatures found matching the expected signature for payload".'
    ],
    rootCauseSummary: 'The raw HTTP request body was parsed or altered (by express.json() middleware) before signature verification, invalidating the HMAC SHA-256 digest, or the webhook secret key does not match the environment (test vs live mode mismatch).',
    recommendedFix: 'Pass raw unparsed buffer to stripe.webhooks.constructEvent and verify the signing secret corresponds to the correct endpoint URL.',
    troubleshootingSteps: [
      'Ensure the webhook route is defined BEFORE express.json() or uses express.raw({ type: "application/json" }).',
      'Verify STRIPE_WEBHOOK_SECRET matches the webhook endpoint in the Stripe Dashboard (whsec_...).',
      'Check if reverse proxy (Cloudflare, Nginx) modifies whitespace or headers during forwarding.',
      'Inspect stripe-signature header timestamp to ensure clock drift is under 300 seconds.'
    ],
    preventionTip: 'Always register raw body parsers specifically for webhook ingress paths.',
    codeSnippet: `// Express raw body handler for Webhooks
app.post('/api/webhooks/stripe', 
  express.raw({ type: 'application/json' }), 
  (req, res) => {
    const sig = req.headers['stripe-signature'];
    try {
      const event = stripe.webhooks.constructEvent(
        req.body, // Must be Buffer, not parsed JS object!
        sig, 
        process.env.STRIPE_WEBHOOK_SECRET
      );
      // Process event...
      res.json({ received: true });
    } catch (err: any) {
      res.status(400).send(\`Webhook Error: \${err.message}\`);
    }
});`
  },
  {
    id: 'kb-db-deadlock-1213',
    title: 'Relational Database Deadlock (Error 1213 / SQLSTATE 40P01)',
    category: 'Database & Storage',
    keywords: ['Deadlock found when trying to get lock', 'try restarting transaction', 'deadlock detected', 'SQLSTATE 40P01', 'Lock wait timeout exceeded'],
    errorPatternRegex: '(Deadlock found when trying to get lock|deadlock detected.*Process.*waits for ShareLock|Lock wait timeout exceeded|SQLSTATE 40P01)',
    symptoms: [
      'Database aborts one of two concurrent transactions with error code 1213 or 40P01.',
      'API returns HTTP 500 on high-concurrency checkout or inventory reservation endpoints.',
      'Sudden surge in retry requests compounding server load.'
    ],
    rootCauseSummary: 'Two concurrent transactions acquired row locks in opposing order (Transaction A locked Row 1 then tried locking Row 2; Transaction B locked Row 2 then tried locking Row 1), forming a circular wait condition.',
    recommendedFix: 'Enforce a strict, deterministic ordering of row locks across the entire codebase (e.g. order item IDs numerically before locking) and wrap transactions in automatic retry logic with exponential backoff.',
    troubleshootingSteps: [
      'Run "SHOW ENGINE INNODB STATUS" (MySQL) or examine postgres log for "deadlock detected" query dump.',
      'Identify the tables and specific rows involved in the circular lock dependency.',
      'Ensure SELECT FOR UPDATE statements order primary keys (ORDER BY id ASC).',
      'Keep database transactions short: execute external network calls outside transactions.'
    ],
    preventionTip: 'Sort entities deterministically before batch updates. Implement optimistic concurrency control with version columns where appropriate.',
    codeSnippet: `// Deterministic lock acquisition and retry logic
async function transferInventory(tx: Transaction, items: Array<{ id: number, qty: number }>) {
  // Sort IDs to guarantee every transaction acquires locks in the exact same sequence
  const sortedItems = [...items].sort((a, b) => a.id - b.id);
  
  for (const item of sortedItems) {
    // Locks rows in ascending ID order, eliminating circular wait
    await tx.query(
      'SELECT * FROM inventory WHERE id = $1 FOR UPDATE', 
      [item.id]
    );
    await tx.query(
      'UPDATE inventory SET available = available - $1 WHERE id = $2', 
      [item.qty, item.id]
    );
  }
}`
  },
  {
    id: 'kb-tls-cert-expired',
    title: 'TLS / SSL Handshake Failure & Certificate Expiration',
    category: 'Security & Networking',
    keywords: ['CERTIFICATE_VERIFY_FAILED', 'certificate has expired', 'SSL handshake failed', 'ERR_SSL_PROTOCOL_ERROR', 'PKIX path building failed'],
    errorPatternRegex: '(CERTIFICATE_VERIFY_FAILED|certificate has expired|PKIX path building failed|unable to get local issuer certificate|SSL: CERT_HAS_EXPIRED)',
    symptoms: [
      'Outbound API calls to third-party services fail with SSL/TLS verification errors.',
      'Client logs: "SSL: CERTIFICATE_VERIFY_FAILED: certificate has expired".',
      'Mobile apps and browsers display security warning banners.'
    ],
    rootCauseSummary: 'The SSL/TLS certificate on the target domain or internal service mesh expired, or the client container does not possess updated CA root certificates (ca-certificates package outdated).',
    recommendedFix: 'Renew certificate using automated Let\'s Encrypt / cert-manager ACME provider and update base Docker image ca-certificates bundle.',
    troubleshootingSteps: [
      'Run "openssl s_client -connect <host>:443 -servername <host>" to inspect certificate chain and validity dates.',
      'Check if intermediate certificates are properly bundled in the server SSL chain (fullchain.pem vs cert.pem).',
      'Verify system clock on server is synchronized via NTP (time drift can trigger false expiration).',
      'Update root trust store: run "update-ca-certificates" in Debian/Ubuntu containers.'
    ],
    preventionTip: 'Configure automated Prometheus cert-exporter alerts 30 days before expiration. Use cert-manager in Kubernetes for automatic renewal.',
    codeSnippet: `# Diagnostic command to verify certificate expiration date
openssl s_client -servername api.service.com -connect api.service.com:443 2>/dev/null | openssl x509 -noout -dates

# Expected Output:
# notBefore=Jan 15 00:00:00 2026 GMT
# notAfter=Apr 15 23:59:59 2026 GMT`
  },
  {
    id: 'kb-gateway-502-504',
    title: 'HTTP 502 / 504 Bad Gateway & Upstream Timeout',
    category: 'Web Server & Ingress',
    keywords: ['502 Bad Gateway', '504 Gateway Time-out', 'upstream connect error', 'connection reset by peer', 'upstream timed out', '504 Gateway Timeout'],
    errorPatternRegex: '(502 Bad Gateway|504 Gateway Time-out|upstream connect error|connection reset by peer.*while reading response header from upstream|upstream timed out)',
    symptoms: [
      'Clients receive HTTP 502 Bad Gateway or 504 Gateway Timeout.',
      'Reverse proxy (Nginx, Envoy, Cloudflare, ALB) logs upstream connection failures.',
      'High latency p99 metrics preceding the 504 spikes.'
    ],
    rootCauseSummary: 'For 502: Upstream application process crashed, closed TCP connection abruptly, or failed to start on the target port. For 504: Upstream application took longer to respond than the proxy proxy_read_timeout.',
    recommendedFix: 'Inspect application health check endpoints, adjust proxy timeout thresholds to align with business logic, and verify upstream keep-alive socket reuse.',
    troubleshootingSteps: [
      'Check upstream service process status (systemctl status / docker ps / kubectl get pods).',
      'Align timeouts: Ensure proxy proxy_read_timeout is higher than application processing SLA, but application keepAliveTimeout is HIGHER than proxy upstream timeout (to prevent race conditions).',
      'Inspect application logs for CPU starvation or garbage collection pauses freezing event loops.',
      'Verify security groups and VPC network ACLs allow ingress on internal microservice ports.'
    ],
    preventionTip: 'In Node.js, ensure server.keepAliveTimeout is set to 61000ms if AWS ALB idle timeout is 60000ms to eliminate 502 race conditions.',
    codeSnippet: `// Node.js HTTP Server Keep-Alive Alignment with Load Balancer
const server = app.listen(port, () => {
  console.log(\`Service listening on port \${port}\`);
});

// ALB has 60 second timeout; Node default is 5 seconds.
// Keep-alive must be GREATER than Load Balancer timeout!
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000;   // 66 seconds`
  },
  {
    id: 'kb-jwt-token-expired',
    title: 'Authentication JWT Expiration & Signature Validation Failure',
    category: 'Authentication & Security',
    keywords: ['TokenExpiredError', 'jwt expired', 'invalid signature', 'JsonWebTokenError', 'signature verification failed'],
    errorPatternRegex: '(TokenExpiredError|jwt expired|invalid signature|JsonWebTokenError: jwt malformed|invalid token)',
    symptoms: [
      'Users are continuously rejected with HTTP 401 Unauthorized.',
      'Microservice inter-service requests fail after key rotation.',
      'Sudden influx of 401 response codes in auth telemetry.'
    ],
    rootCauseSummary: 'JWT token has exceeded its exp claim timestamp without silent refresh, or verification was executed with an obsolete public key after an unsynchronized JWKS key rotation.',
    recommendedFix: 'Implement automated refresh token flow with sliding window expiration, support JWKS key rotation cache with grace period, and verify system clock synchronization.',
    troubleshootingSteps: [
      'Decode token header and payload at jwt.io to verify exp and iat claims against UTC now.',
      'Inspect JWKS endpoint to verify kid (Key ID) matches the token header kid.',
      'Check client clock drift against standard NTP time servers.',
      'Verify client intercepts 401 and executes refresh token exchange before retrying original request.'
    ],
    preventionTip: 'Issue short-lived access tokens (15m) paired with rotating refresh tokens (7d). Support dual-key verification during key rotation phases.',
    codeSnippet: `// Robust JWT verification with JWKS rotation and clock tolerance
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://auth.company.com/.well-known/jwks.json',
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    callback(null, key?.getPublicKey());
  });
}

jwt.verify(token, getKey, { 
  clockTolerance: 30, // 30 seconds buffer for clock skew
  algorithms: ['RS256'] 
});`
  },
  {
    id: 'kb-elasticsearch-circuit-breaker',
    title: 'Elasticsearch / OpenSearch Parent CircuitBreakingException',
    category: 'Search & Observability',
    keywords: ['CircuitBreakingException', '[parent] Data too large', 'bytes wanted but only', 'indices.breaker.total.use_real_memory'],
    errorPatternRegex: '(CircuitBreakingException.*Data too large|circuit_breaking_exception|ElasticsearchSecurityException.*circuit breaker)',
    symptoms: [
      'Search and indexing queries fail with 429 Too Many Requests or 503 Service Unavailable.',
      'Log message: "CircuitBreakingException: [parent] Data too large, data for [...] would be [98%]".',
      'Cluster health transitions to YELLOW or RED.'
    ],
    rootCauseSummary: 'Memory required to complete heavy aggregations or wildcard queries exceeded JVM circuit breaker limits (default 95% of heap), tripping the safety mechanism to protect nodes from JVM crash.',
    recommendedFix: 'Refactor unbounded wildcard queries, reduce aggregation bucket size, or scale data nodes with additional RAM.',
    troubleshootingSteps: [
      'Identify expensive aggregation queries (terms aggregations with high cardinality fields).',
      'Run "GET /_nodes/stats/breaker" to see which circuit breaker tripped (parent, fielddata, request).',
      'Do not increase circuit breaker limit as that causes cluster node OOM fatal crashes.',
      'Add dedicated coordinator nodes to distribute query aggregation overhead.'
    ],
    preventionTip: 'Set max_buckets limit in elasticsearch.yml and enforce pagination on all search queries.',
    codeSnippet: `// Safe Elasticsearch query with bounded terms aggregation
const safeSearchQuery = {
  index: 'app-logs-*',
  body: {
    query: {
      range: { '@timestamp': { gte: 'now-1h' } }
    },
    aggs: {
      top_errors: {
        terms: {
          field: 'error.type.keyword',
          size: 20 // Always set a bounded limit on bucket aggregations!
        }
      }
    }
  }
};`
  },
  {
    id: 'kb-dns-eai-again',
    title: 'DNS Resolution Failure & Timeout (EAI_AGAIN / ENOTFOUND)',
    category: 'Networking & Infrastructure',
    keywords: ['getaddrinfo EAI_AGAIN', 'ENOTFOUND', 'Name or service not known', 'Temporary failure in name resolution', 'dns timeout'],
    errorPatternRegex: '(getaddrinfo EAI_AGAIN|getaddrinfo ENOTFOUND|Name or service not known|Temporary failure in name resolution)',
    symptoms: [
      'Microservice cannot connect to external APIs or internal services.',
      'Node.js or Python logs: "Error: getaddrinfo EAI_AGAIN api.stripe.com".',
      'Intermittent bursts of connection timeout errors.'
    ],
    rootCauseSummary: 'CoreDNS in Kubernetes or the local resolver timed out due to conntrack race conditions, single-threaded glibc getaddrinfo lock, or CoreDNS scaling limits during high pod churn.',
    recommendedFix: 'Deploy NodeLocal DNSCache in Kubernetes cluster, configure ndots:2 in pod dnsConfig, and cache resolved DNS entries in application layer.',
    troubleshootingSteps: [
      'Inspect CoreDNS logs: "kubectl logs -n kube-system -l k8s-app=kube-dns".',
      'Review pod /etc/resolv.conf: if "ndots:5" is present, every single external query fires 5 sequential internal domain lookups before trying the external name.',
      'Deploy NodeLocal DNSCache daemonset to handle DNS caching on loopback interface.',
      'Check if UDP packet loss occurs on port 53 via netstat.'
    ],
    preventionTip: 'Always configure ndots: 2 or append trailing dot (e.g., api.stripe.com.) for external hostnames to bypass local search domains.',
    codeSnippet: `# Pod dnsConfig to eliminate 5-stage DNS amplification
spec:
  dnsConfig:
    options:
    - name: ndots
      value: "2"
    - name: timeout
      value: "2"
    - name: attempts
      value: "3"`
  }
];
