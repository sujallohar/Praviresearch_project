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
  securityPostureScore: number; // 0-100
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
