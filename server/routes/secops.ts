import { Router } from 'express';
import { getThreatEvents, getTotalThreatsCount, recordThreat } from '../middleware/honeypot.js';
import { getRequestCount } from './health.js';
import type { SecOpsTelemetry } from '../types.js';

const router = Router();
const startTime = Date.now();

// SecOps Dashboard Telemetry & Health Feed
router.get('/telemetry', (_req, res) => {
  const threats = getThreatEvents();
  const totalThreats = getTotalThreatsCount();
  const memoryUsage = process.memoryUsage();

  // Dynamic security posture calculation based on threat density
  let postureScore = 98;
  const criticalThreats = threats.filter(t => t.threatLevel === 'CRITICAL').length;
  postureScore -= Math.min(criticalThreats * 4, 25);

  const telemetry: SecOpsTelemetry = {
    status: postureScore > 85 ? 'OPTIMAL' : 'ELEVATED_RISK',
    securityPostureScore: Math.max(postureScore, 70),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    activeMemoryMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    totalRequestsServed: getRequestCount(),
    totalThreatsNeutralized: totalThreats,
    recentThreatEvents: threats.slice(0, 15),
    defenseControls: {
      helmetHeaders: true,
      rateLimitingActive: true,
      zodRuntimeValidation: true,
      sha256AuditLedger: true,
      activeHoneypotTraps: true
    }
  };

  res.status(200).json(telemetry);
});

// Interactive Educational Probe Simulator (Demo tool for interviews & tests)
router.post('/simulate-probe', (req, res) => {
  const { probeType } = req.body || {};

  let signature = 'PATH_TRAVERSAL_PROBE';
  let threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH';
  let path = '/etc/passwd';

  if (probeType === 'SQLI') {
    signature = 'SQL_INJECTION_RECONNAISSANCE: UNION SELECT 1,2,@@version';
    threatLevel = 'CRITICAL';
    path = '/api/assets?filter=1%27%20OR%20%271%27=%271';
  } else if (probeType === 'PRIVILEGE_ESCALATION') {
    signature = 'UNAUTHORIZED_ROLE_ELEVATION_ATTEMPT';
    threatLevel = 'CRITICAL';
    path = '/api/admin/elevate-privilege';
  } else if (probeType === 'XSS') {
    signature = 'CROSS_SITE_SCRIPTING_VECTOR: <script>alert(1)</script>';
    threatLevel = 'MEDIUM';
    path = '/api/search?q=%3Cscript%3Ealert(1)%3C/script%3E';
  }

  const threat = recordThreat({
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '192.168.1.105',
    userAgent: 'Nikto/2.1.6 Vulnerability Scanner',
    method: 'GET',
    path,
    threatLevel,
    signature,
    actionTaken: 'BLOCKED',
    payload: { probeType: probeType || 'GENERIC_RECON', interceptedAt: new Date().toISOString() }
  });

  res.status(201).json({
    status: 'Threat Intercepted & Neutralized',
    threat
  });
});

export default router;
