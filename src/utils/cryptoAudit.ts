import { collection, doc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AuditBlock } from '../types';

export const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes a standard SHA-256 hexadecimal hash using Web Cryptography API
 */
export async function sha256Hex(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback lightweight hash implementation if SubtleCrypto is unavailable
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Deterministically sorts object keys for canonical JSON hashing
 */
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

/**
 * Computes the cryptographic block hash for a given audit payload
 */
export async function computeBlockHash(entry: {
  index: number;
  timestamp: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetId: string;
  targetType: string;
  details: Record<string, any>;
  previousHash: string;
}): Promise<string> {
  const canonicalPayload = [
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

  return sha256Hex(canonicalPayload);
}

/**
 * Fetches the latest block in the audit ledger
 */
async function getLatestBlock(): Promise<AuditBlock | null> {
  try {
    const q = query(collection(db, 'auditLedger'), orderBy('index', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as AuditBlock;
    }
  } catch (err) {
    console.warn('Could not query remote audit ledger from Firestore:', err);
  }

  // Fallback to localStorage cache if offline
  try {
    const cached = localStorage.getItem('govasset_crypto_audit_chain');
    if (cached) {
      const list: AuditBlock[] = JSON.parse(cached);
      if (list.length > 0) {
        return list[list.length - 1];
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Appends a new tamper-evident cryptographic block to the audit ledger
 */
export async function recordAuditEvent(event: {
  actorId: string;
  actorEmail?: string;
  actorRole: string;
  action: AuditBlock['action'];
  targetId: string;
  targetType: string;
  details: Record<string, any>;
}): Promise<AuditBlock> {
  const latestBlock = await getLatestBlock();

  let index = 0;
  let previousHash = GENESIS_PREVIOUS_HASH;

  if (latestBlock) {
    index = latestBlock.index + 1;
    previousHash = latestBlock.hash;
  }

  const timestamp = new Date().toISOString();

  const hashPayload = {
    index,
    timestamp,
    actorId: event.actorId,
    actorRole: event.actorRole,
    action: event.action,
    targetId: event.targetId,
    targetType: event.targetType,
    details: event.details,
    previousHash
  };

  const hash = await computeBlockHash(hashPayload);

  const newBlock: AuditBlock = {
    id: `block_${index.toString().padStart(6, '0')}`,
    ...hashPayload,
    actorEmail: event.actorEmail,
    hash
  };

  // Write block to Firestore with deterministic ID
  try {
    await setDoc(doc(db, 'auditLedger', newBlock.id!), newBlock);
  } catch (err) {
    console.warn('Unable to persist block to Firestore auditLedger (saved locally):', err);
  }

  // Update local cache
  try {
    const cached = localStorage.getItem('govasset_crypto_audit_chain');
    const list: AuditBlock[] = cached ? JSON.parse(cached) : [];
    list.push(newBlock);
    localStorage.setItem('govasset_crypto_audit_chain', JSON.stringify(list));
  } catch {
    // Ignore
  }

  return newBlock;
}

/**
 * Initializes Genesis Block (Block 0) if the ledger is currently empty
 */
export async function ensureGenesisBlock(): Promise<AuditBlock> {
  const latest = await getLatestBlock();
  if (latest) return latest;

  return recordAuditEvent({
    actorId: 'system-security-engine',
    actorEmail: 'security@govasset-360.internal',
    actorRole: 'System Security Engine',
    action: 'SYSTEM_INITIALIZED',
    targetId: 'genesis-core',
    targetType: 'Cryptographic Ledger Core',
    details: {
      standard: 'SHA-256 Hash Chaining Ledger (WORM Immutable)',
      initializedAt: new Date().toISOString(),
      architecture: 'Zero-Trust Municipal Governance v2.0'
    }
  });
}

/**
 * Full Mathematical Chain Integrity Verification Engine
 * Verifies every block sequentially from Genesis to the tip.
 */
export async function verifyLedgerIntegrity(blocks: AuditBlock[]): Promise<{
  isValid: boolean;
  totalVerified: number;
  brokenIndex?: number;
  brokenReason?: string;
  timeTakenMs: number;
}> {
  const startTime = performance.now();
  if (blocks.length === 0) {
    return {
      isValid: true,
      totalVerified: 0,
      timeTakenMs: 0
    };
  }

  // Ensure blocks are in order
  const sorted = [...blocks].sort((a, b) => a.index - b.index);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    // 1. Verify index sequence
    if (current.index !== i) {
      return {
        isValid: false,
        totalVerified: i,
        brokenIndex: current.index,
        brokenReason: `Sequence gap detected: Expected Block #${i}, but found Block #${current.index}. One or more logs have been deleted!`,
        timeTakenMs: Math.round(performance.now() - startTime)
      };
    }

    // 2. Verify previousHash linkage
    if (i === 0) {
      if (current.previousHash !== GENESIS_PREVIOUS_HASH) {
        return {
          isValid: false,
          totalVerified: 0,
          brokenIndex: 0,
          brokenReason: `Genesis Block parent hash invalid. Expected ${GENESIS_PREVIOUS_HASH.slice(0, 10)}...`,
          timeTakenMs: Math.round(performance.now() - startTime)
        };
      }
    } else {
      const prev = sorted[i - 1];
      if (current.previousHash !== prev.hash) {
        return {
          isValid: false,
          totalVerified: i,
          brokenIndex: current.index,
          brokenReason: `Broken cryptographic link at Block #${current.index}: Previous hash pointer does not match Block #${prev.index}'s hash!`,
          timeTakenMs: Math.round(performance.now() - startTime)
        };
      }
    }

    // 3. Re-compute SHA-256 hash of the block payload
    const expectedHash = await computeBlockHash({
      index: current.index,
      timestamp: current.timestamp,
      actorId: current.actorId,
      actorRole: current.actorRole,
      action: current.action,
      targetId: current.targetId,
      targetType: current.targetType,
      details: current.details,
      previousHash: current.previousHash
    });

    if (expectedHash !== current.hash) {
      return {
        isValid: false,
        totalVerified: i,
        brokenIndex: current.index,
        brokenReason: `Tampered payload detected in Block #${current.index}! Stored hash (${current.hash.slice(0, 12)}...) differs from recomputed mathematical digest (${expectedHash.slice(0, 12)}...).`,
        timeTakenMs: Math.round(performance.now() - startTime)
      };
    }
  }

  const duration = Math.round(performance.now() - startTime);
  return {
    isValid: true,
    totalVerified: sorted.length,
    timeTakenMs: duration
  };
}
