/**
 * GovAsset 360 SecOps API Client
 * Enterprise Full-Stack Microservice Connector with Resilient Offline Fallback
 */

export interface ThreatEvent {
  id: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  method: string;
  path: string;
  payload?: any;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signature: string;
  actionTaken: 'BLOCKED' | 'RATE_LIMITED' | 'HONEYPOT_TRIGGERED';
}

export interface SecOpsTelemetry {
  status: 'OPTIMAL' | 'DEGRADED' | 'ELEVATED_RISK';
  securityPostureScore: number;
  uptimeSeconds: number;
  activeMemoryMB: number;
  totalRequestsServed: number;
  totalThreatsNeutralized: number;
  recentThreatEvents: ThreatEvent[];
  defenseControls: {
    helmetHeaders: boolean;
    rateLimitingActive: boolean;
    zodRuntimeValidation: boolean;
    sha256AuditLedger: boolean;
    activeHoneypotTraps: boolean;
  };
}

const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Resilient Fallback Telemetry (ensures zero crashes if server isn't running locally)
const FALLBACK_TELEMETRY: SecOpsTelemetry = {
  status: 'OPTIMAL',
  securityPostureScore: 98,
  uptimeSeconds: 84320,
  activeMemoryMB: 24,
  totalRequestsServed: 1420,
  totalThreatsNeutralized: 18,
  recentThreatEvents: [
    {
      id: 'threat-mock-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
      ip: '198.51.100.42',
      userAgent: 'sqlmap/1.7.2#stable',
      method: 'GET',
      path: '/api/assets?filter=1%27%20OR%201=1',
      threatLevel: 'CRITICAL',
      signature: 'HONEYPOT_HIT: SQLI_PROBE_BLOCKED',
      actionTaken: 'BLOCKED'
    },
    {
      id: 'threat-mock-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      ip: '203.0.113.19',
      userAgent: 'Mozilla/5.0 (compatible; Nmap Scripting Engine)',
      method: 'GET',
      path: '/.env',
      threatLevel: 'CRITICAL',
      signature: 'HONEYPOT_HIT: ENV_SECRET_DISCLOSURE_PROBE',
      actionTaken: 'HONEYPOT_TRIGGERED'
    },
    {
      id: 'threat-mock-3',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      ip: '192.0.2.77',
      userAgent: 'Mozilla/5.0 Scanner',
      method: 'POST',
      path: '/wp-login.php',
      threatLevel: 'LOW',
      signature: 'HONEYPOT_HIT: WORDPRESS_CMS_SCANNER_PROBE',
      actionTaken: 'HONEYPOT_TRIGGERED'
    }
  ],
  defenseControls: {
    helmetHeaders: true,
    rateLimitingActive: true,
    zodRuntimeValidation: true,
    sha256AuditLedger: true,
    activeHoneypotTraps: true
  }
};

/**
 * Check if the Express Gateway microservice is live
 */
export async function checkGatewayHealth(): Promise<{ online: boolean; details?: any }> {
  try {
    const res = await fetch(`${DEFAULT_API_URL}/healthz`, { method: 'GET', signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      return { online: true, details: data };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

/**
 * Fetch SecOps Telemetry with live microservice or fallback data
 */
export async function getSecOpsTelemetry(): Promise<{ telemetry: SecOpsTelemetry; isLive: boolean }> {
  try {
    const res = await fetch(`${DEFAULT_API_URL}/api/secops/telemetry`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      return { telemetry: data, isLive: true };
    }
  } catch {
    // Backend offline; fallback cleanly
  }
  return { telemetry: FALLBACK_TELEMETRY, isLive: false };
}

/**
 * Simulate attack probe against active defense honeypot
 */
export async function simulateThreatProbe(probeType: 'SQLI' | 'PRIVILEGE_ESCALATION' | 'XSS' | 'GENERIC'): Promise<{ success: boolean; threat?: ThreatEvent; message?: string }> {
  try {
    const res = await fetch(`${DEFAULT_API_URL}/api/secops/simulate-probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ probeType }),
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, threat: data.threat };
    }
  } catch {
    // Offline simulated response
  }

  // Fallback local simulation if gateway is not currently started
  const simulatedThreat: ThreatEvent = {
    id: `threat-local-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ip: '127.0.0.1 (Simulated)',
    userAgent: 'GovAsset Security Simulator',
    method: 'POST',
    path: `/api/secops/probe/${probeType.toLowerCase()}`,
    threatLevel: probeType === 'SQLI' || probeType === 'PRIVILEGE_ESCALATION' ? 'CRITICAL' : 'HIGH',
    signature: `SIMULATED_INTERCEPTION: ${probeType}_ATTACK_VECTOR`,
    actionTaken: 'BLOCKED'
  };

  return {
    success: true,
    threat: simulatedThreat,
    message: 'Simulated locally (Gateway in standalone browser mode)'
  };
}

/**
 * Trigger server-side cryptographic audit ledger verification
 */
export async function verifyAuditLedgerServerSide(blocks: any[]): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const res = await fetch(`${DEFAULT_API_URL}/api/audit/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
      signal: AbortSignal.timeout(3000)
    });
    const data = await res.json();
    return { success: res.ok, result: data, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gateway connection timed out' };
  }
}
