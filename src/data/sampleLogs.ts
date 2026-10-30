export interface SampleLogDefinition {
  id: string;
  name: string;
  fileName: string;
  format: 'txt' | 'log' | 'csv';
  description: string;
  expectedPrimaryIssue: string;
  content: string;
}

export const SAMPLE_LOGS: SampleLogDefinition[] = [
  {
    id: 'k8s-cascade-failure',
    name: 'Kubernetes Microservices Cascade Outage',
    fileName: 'production-k8s-cascade-incident.log',
    format: 'log',
    description: 'PostgreSQL connection exhaustion propagating upstream through Auth service into Envoy gateway 504 timeouts, culminating in container OOMKilled.',
    expectedPrimaryIssue: 'Database Connection Pool Exhaustion -> Container OOMKilled 137',
    content: `2026-10-30T06:14:02.102Z [INFO] [api-gateway] Ingress request GET /api/v1/orders/live status=200 duration=14ms ip=192.168.1.42
2026-10-30T06:14:05.340Z [INFO] [auth-service] Validating session token for user_id=usr_99812 trace_id=tr_8a9f02
2026-10-30T06:14:10.119Z [WARN] [db-pool-manager] Connection pool usage at 82% (82/100 connections in use)
2026-10-30T06:14:15.820Z [WARN] [db-pool-manager] Connection pool usage at 96% (96/100 connections in use)
2026-10-30T06:14:19.412Z [ERROR] [order-service] org.postgresql.util.PSQLException: FATAL: remaining connection slots are reserved for non-replication superuser connections
    at org.postgresql.core.v3.ConnectionFactoryImpl.openConnectionImpl(ConnectionFactoryImpl.java:317)
    at org.postgresql.core.ConnectionFactory.openConnection(ConnectionFactory.java:54)
    at com.zaxxer.hikari.pool.PoolBase.newConnection(PoolBase.java:364)
    at com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:162)
2026-10-30T06:14:20.004Z [ERROR] [order-service] Timeout waiting for idle connection from pool after 5002ms (active=100, idle=0, waiting=24)
2026-10-30T06:14:21.312Z [ERROR] [payment-service] org.postgresql.util.PSQLException: FATAL: remaining connection slots are reserved for non-replication superuser connections
    at com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:162)
2026-10-30T06:14:22.510Z [WARN] [envoy-proxy] Upstream response delayed for /api/v1/checkout - latency=4890ms
2026-10-30T06:14:24.015Z [CRITICAL] [order-service] DatabaseConnectionError: All 100 connection slots saturated. Rejecting incoming database query.
2026-10-30T06:14:24.901Z [ERROR] [api-gateway] HTTP 504 Gateway Timeout on POST /api/v1/checkout/confirm client_ip=10.0.4.120 duration=5001ms
2026-10-30T06:14:25.112Z [ERROR] [api-gateway] HTTP 504 Gateway Timeout on POST /api/v1/checkout/confirm client_ip=10.0.4.121 duration=5000ms
2026-10-30T06:14:25.882Z [ERROR] [order-service] org.postgresql.util.PSQLException: FATAL: remaining connection slots are reserved for non-replication superuser connections
2026-10-30T06:14:26.404Z [WARN] [kube-scheduler] Pod order-service-7bb69f8c6b-q4x9z memory usage exceeds 92% of limit (1880Mi / 2048Mi)
2026-10-30T06:14:28.190Z [CRITICAL] [kubelet] Container order-service failed liveness probe HTTP GET http://10.244.2.14:8080/healthz: connection refused
2026-10-30T06:14:29.001Z [CRITICAL] [kernel] Memory cgroup out of memory: Killed process 8192 (java) total-vm:4210408kB, anon-rss:2097152kB, file-rss:0kB
2026-10-30T06:14:29.245Z [CRITICAL] [k8s-pod-lifecycle] Pod order-service-7bb69f8c6b-q4x9z terminated: OOMKilled exit code 137
2026-10-30T06:14:30.104Z [ERROR] [api-gateway] HTTP 502 Bad Gateway upstream connect error or disconnect/reset before headers
2026-10-30T06:14:31.050Z [ERROR] [api-gateway] HTTP 502 Bad Gateway upstream connect error or disconnect/reset before headers
2026-10-30T06:14:32.400Z [INFO] [kubelet] Restarting container order-service in pod order-service-7bb69f8c6b-q4x9z`
  },
  {
    id: 'payment-deadlock-kafka',
    name: 'E-Commerce Payment Deadlock & Webhook Storm',
    fileName: 'payment-pipeline-deadlock.csv',
    format: 'csv',
    description: 'High concurrency checkout operations triggering MySQL row deadlocks and Stripe webhook HMAC signature mismatches with Kafka consumer rebalances.',
    expectedPrimaryIssue: 'MySQL Deadlock Error 1213 & Stripe Webhook SignatureVerificationException',
    content: `timestamp,severity,component,message,trace_id
2026-10-30 08:30:00,INFO,payment-api,"Received checkout webhook event evt_10928374",tr_pay_01
2026-10-30 08:30:02,WARN,webhook-ingress,"Header stripe-signature timestamp delta is 280 seconds",tr_pay_02
2026-10-30 08:30:05,ERROR,webhook-ingress,"SignatureVerificationException: No signatures found matching the expected signature for payload",tr_pay_03
2026-10-30 08:30:06,ERROR,webhook-ingress,"SignatureVerificationException: No signatures found matching the expected signature for payload",tr_pay_04
2026-10-30 08:30:10,INFO,inventory-worker,"Reserving SKU_A9981 and SKU_B1123 for order ORD-5501",tr_inv_01
2026-10-30 08:30:10,INFO,inventory-worker,"Reserving SKU_B1123 and SKU_A9981 for order ORD-5502",tr_inv_02
2026-10-30 08:30:12,CRITICAL,database-cluster,"Deadlock found when trying to get lock; try restarting transaction: UPDATE inventory SET stock = stock - 1 WHERE sku = 'SKU_A9981'",tr_inv_01
2026-10-30 08:30:12,ERROR,inventory-worker,"Transaction rolled back due to MySQL error 1213: Deadlock found when trying to get lock; try restarting transaction",tr_inv_01
2026-10-30 08:30:13,WARN,inventory-worker,"Retrying transaction for order ORD-5501 attempt=1",tr_inv_01
2026-10-30 08:30:18,ERROR,kafka-consumer,"CommitFailedException: Offset commit cannot be completed since the consumer is not part of the group",tr_kfk_09
2026-10-30 08:30:19,WARN,kafka-consumer,"ConsumerCoordinator: max.poll.interval.ms exceeded. Triggering group rebalance",tr_kfk_09
2026-10-30 08:30:22,CRITICAL,database-cluster,"Deadlock found when trying to get lock; try restarting transaction: UPDATE inventory SET stock = stock - 1 WHERE sku = 'SKU_B1123'",tr_inv_02
2026-10-30 08:30:25,ERROR,notification-service,"Failed to send order confirmation email: connection reset by peer",tr_notif_01`
  },
  {
    id: 'security-auth-incident',
    name: 'Security Brute-Force & Token Abuse',
    fileName: 'security-audit-auth-breach.txt',
    format: 'txt',
    description: 'Distributed brute-force credential stuffing leading to Redis rate-limit circuit breaking, expired JWT tokens, and TLS handshake warnings.',
    expectedPrimaryIssue: 'Authentication Flood, Expired JWT & Rate Limiter Saturation',
    content: `2026-10-30 09:00:01 [INFO] [auth-gateway] Handshake established from client ip 185.220.101.5:44302
2026-10-30 09:00:02 [WARN] [rate-limiter] IP 185.220.101.5 exceeded 50 requests/sec threshold (count=142)
2026-10-30 09:00:03 [ERROR] [auth-service] TokenExpiredError: jwt expired at 2026-10-30T08:50:00.000Z
2026-10-30 09:00:04 [ERROR] [auth-service] TokenExpiredError: jwt expired at 2026-10-30T08:50:00.000Z
2026-10-30 09:00:05 [WARN] [waf-engine] Potential SQL injection detected in parameter 'username': "admin' OR '1'='1"
2026-10-30 09:00:05 [ERROR] [waf-engine] Blocked malicious request HTTP 403 Forbidden client_ip=185.220.101.5
2026-10-30 09:00:06 [ERROR] [auth-service] JsonWebTokenError: invalid signature on bearer token
2026-10-30 09:00:08 [CRITICAL] [redis-sentinel] READONLY You can't write against a read only replica during rate-limit increment
2026-10-30 09:00:09 [CRITICAL] [redis-sentinel] RedisTimeoutException: command EVAL timed out after 3000ms
2026-10-30 09:00:10 [ERROR] [rate-limiter] Fail-open mode activated: Redis cluster unavailable
2026-10-30 09:00:12 [WARN] [tls-termination] SSL: CERTIFICATE_VERIFY_FAILED: self-signed certificate in certificate chain from upstream auth-core
2026-10-30 09:00:15 [INFO] [auth-gateway] Automated ban applied to IP CIDR 185.220.101.0/24 for 3600 seconds`
  },
  {
    id: 'clean-baseline-system',
    name: 'Nominal Production System (Healthy Baseline)',
    fileName: 'production-system-healthy-baseline.log',
    format: 'log',
    description: 'Clean enterprise system logs demonstrating standard background cron jobs, successful transactions, and minor routine warning.',
    expectedPrimaryIssue: 'No critical failures detected. Routine cache eviction warning.',
    content: `2026-10-30T10:00:00.012Z [INFO] [system-kernel] Boot sequence completed successfully. Node agent v4.12 ready.
2026-10-30T10:00:05.140Z [INFO] [cron-dispatcher] Starting periodic telemetry sync job #4491
2026-10-30T10:00:10.820Z [INFO] [payment-processor] Processed settlement batch #1102: 450 transactions, 0 failed
2026-10-30T10:00:15.301Z [INFO] [user-directory] Syncing LDAP directory attributes: 120 users synchronized
2026-10-30T10:00:20.940Z [WARN] [cache-eviction] Local LRU cache size reached 85% capacity. Evicting 250 expired keys.
2026-10-30T10:00:25.500Z [INFO] [http-server] GET /healthz 200 OK duration=2ms
2026-10-30T10:00:30.010Z [INFO] [http-server] GET /metrics 200 OK duration=4ms
2026-10-30T10:00:35.200Z [INFO] [cron-dispatcher] Job #4491 completed in 30.18s with exit code 0`
  }
];
