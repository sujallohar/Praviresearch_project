import { Router } from 'express';
import crypto from 'node:crypto';

const router = Router();
const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalStringify).join(',')}]`;
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(k => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
  return `{${pairs.join(',')}}`;
}

function computeServerBlockHash(entry: any): string {
  const payload = [
    entry.index.toString(),
    entry.timestamp,
    entry.actorId,
    entry.actorRole,
    entry.action,
    entry.targetId,
    entry.targetType,
    canonicalStringify(entry.details),
    entry.previousHash
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

// Server-Side Verification Endpoint
router.post('/verify', (req, res) => {
  const { blocks } = req.body;

  if (!Array.isArray(blocks) || blocks.length === 0) {
    res.status(400).json({
      success: false,
      message: 'No cryptographic blocks provided for verification.'
    });
    return;
  }

  const startTime = performance.now();
  const sorted = [...blocks].sort((a, b) => a.index - b.index);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    // Sequence check
    if (current.index !== i) {
      res.status(409).json({
        success: false,
        brokenIndex: current.index,
        error: `Sequence gap detected: Block #${i} missing!`
      });
      return;
    }

    // Pointer check
    if (i === 0) {
      if (current.previousHash !== GENESIS_PREVIOUS_HASH) {
        res.status(409).json({
          success: false,
          brokenIndex: 0,
          error: 'Genesis Block root pointer invalid.'
        });
        return;
      }
    } else {
      const prev = sorted[i - 1];
      if (current.previousHash !== prev.hash) {
        res.status(409).json({
          success: false,
          brokenIndex: current.index,
          error: `Severed link at Block #${current.index}: does not match Block #${prev.index}.`
        });
        return;
      }
    }

    // Hash integrity
    const recomputed = computeServerBlockHash(current);
    if (recomputed !== current.hash) {
      res.status(409).json({
        success: false,
        brokenIndex: current.index,
        error: `Payload tamper detected in Block #${current.index}!`
      });
      return;
    }
  }

  const durationMs = Math.round(performance.now() - startTime);

  res.status(200).json({
    success: true,
    totalVerified: sorted.length,
    verificationDurationMs: durationMs,
    integrityStatus: '100% Cryptographically Verified (Server Certified)',
    certifiedAt: new Date().toISOString()
  });
});

export default router;
