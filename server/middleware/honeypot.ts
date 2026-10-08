import type { Request, Response, NextFunction } from 'express';
import type { ThreatEvent } from '../types.js';

const MAX_LOG_SIZE = 50;
const threatEventsBuffer: ThreatEvent[] = [];
let totalThreatsCounter = 0;

export function recordThreat(event: Omit<ThreatEvent, 'id' | 'timestamp'>): ThreatEvent {
  const fullEvent: ThreatEvent = {
    id: `threat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...event
  };

  threatEventsBuffer.unshift(fullEvent);
  if (threatEventsBuffer.length > MAX_LOG_SIZE) {
    threatEventsBuffer.pop();
  }

  totalThreatsCounter++;
  return fullEvent;
}

export function getThreatEvents(): ThreatEvent[] {
  return [...threatEventsBuffer];
}

export function getTotalThreatsCount(): number {
  return totalThreatsCounter;
}

/**
 * Express middleware that traps automated scanners touching sensitive decoy paths
 */
export function honeypotTrap(signature: string, threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH') {
  return (req: Request, res: Response, _next: NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'Unidentified Scanner';

    const threat = recordThreat({
      ip: clientIp,
      userAgent,
      method: req.method,
      path: req.originalUrl,
      threatLevel,
      signature: `HONEYPOT_HIT: ${signature}`,
      actionTaken: 'HONEYPOT_TRIGGERED',
      payload: {
        headers: {
          host: req.headers.host,
          accept: req.headers.accept
        },
        query: req.query,
        body: req.body
      }
    });

    console.warn(`🚨 [SecOps Active Defense] Honeypot triggered by ${clientIp} touching ${req.originalUrl} (${signature})`);

    // Return deceptive response to scanner
    res.status(403).json({
      status: 403,
      error: 'Security Gateway Violation',
      message: 'Unauthorized access to restricted internal system resources. Incident signature logged to SecOps SOC.',
      incidentId: threat.id,
      timestamp: threat.timestamp
    });
  };
}
