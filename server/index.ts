import express from 'express';
import { corsMiddleware, helmetMiddleware, globalRateLimiter, strictSecurityRateLimiter } from './middleware/security.js';
import { honeypotTrap } from './middleware/honeypot.js';
import healthRouter, { incrementRequestCounter } from './routes/health.js';
import secopsRouter from './routes/secops.js';
import assetsRouter from './routes/assets.js';
import auditRouter from './routes/audit.js';

const app = express();
const PORT = process.env.PORT || 5001;

// 1. AppSec Defensive Headers & Access Control
app.use(helmetMiddleware);
app.use(corsMiddleware);

// 2. Body Parsing (Strict payload limits)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 3. Telemetry Request Counter & Global Rate Limiting
app.use((_req, _res, next) => {
  incrementRequestCounter();
  next();
});
app.use('/api', globalRateLimiter);

// 4. Infrastructure Health Probes
app.use('/', healthRouter);

// 5. Active Defense Honeypot Traps (Decoy routes that catch automated scanners)
app.all('/api/v1/auth/internal-keys', honeypotTrap('INTERNAL_KEYS_EXTRACTION_PROBE', 'CRITICAL'));
app.all('/api/admin/debug-dump', honeypotTrap('ADMIN_DEBUG_DUMP_PROBE', 'CRITICAL'));
app.all('/.env', honeypotTrap('ENV_SECRET_DISCLOSURE_PROBE', 'CRITICAL'));
app.all('/actuator/health', honeypotTrap('SPRING_ACTUATOR_RECON_PROBE', 'MEDIUM'));
app.all('/wp-login.php', honeypotTrap('WORDPRESS_CMS_SCANNER_PROBE', 'LOW'));

// 6. Security Gateway Core API Routes
app.use('/api/secops', secopsRouter);
app.use('/api/assets', strictSecurityRateLimiter, assetsRouter);
app.use('/api/audit', strictSecurityRateLimiter, auditRouter);

// 7. Fallback Root Information
app.get('/', (_req, res) => {
  res.json({
    name: 'GovAsset 360 Security Gateway & Microservice API',
    version: '2.0.0-Enterprise',
    status: 'OPERATIONAL',
    securityStandard: 'Zero-Trust RBAC & Cryptographic WORM Auditing',
    healthEndpoint: '/healthz',
    metricsEndpoint: '/metrics',
    telemetryEndpoint: '/api/secops/telemetry'
  });
});

// 8. Global 404 Catch-All
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Endpoint Not Found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// 9. Start Server
app.listen(PORT, () => {
  console.log(`\n🛡️  GovAsset 360 Security Gateway running on http://localhost:${PORT}`);
  console.log(`📋 Health Check Probe: http://localhost:${PORT}/healthz`);
  console.log(`📊 Prometheus Metrics: http://localhost:${PORT}/metrics`);
  console.log(`🛰️  SecOps Telemetry:   http://localhost:${PORT}/api/secops/telemetry\n`);
});

export default app;
