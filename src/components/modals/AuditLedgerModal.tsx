import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { 
  ShieldCheck, ShieldAlert, Link as LinkIcon, 
  Download, RefreshCw, CheckCircle2, AlertTriangle, 
  Copy, Check, Play, RotateCcw
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AuditBlock } from '../../types';
import { verifyLedgerIntegrity, ensureGenesisBlock } from '../../utils/cryptoAudit';

interface AuditLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLedgerModal: React.FC<AuditLedgerModalProps> = ({ isOpen, onClose }) => {
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    totalVerified: number;
    brokenIndex?: number;
    brokenReason?: string;
    timeTakenMs: number;
  } | null>(null);

  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [isSimulatedTamper, setIsSimulatedTamper] = useState(false);
  const [genuineBlocksCache, setGenuineBlocksCache] = useState<AuditBlock[]>([]);

  // Real-time synchronization of the cryptographic ledger
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const q = query(collection(db, 'auditLedger'), orderBy('index', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AuditBlock[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as AuditBlock));

      if (list.length === 0) {
        // Initialize Genesis Block if empty
        ensureGenesisBlock();
      } else {
        setBlocks(list);
        setGenuineBlocksCache(list);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Could not subscribe to auditLedger (falling back to cache):', err);
      try {
        const cached = localStorage.getItem('govasset_crypto_audit_chain');
        if (cached) {
          const parsed = JSON.parse(cached);
          setBlocks(parsed);
          setGenuineBlocksCache(parsed);
        }
      } catch {
        // Ignore
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Run mathematical SHA-256 chain verification
  const handleVerify = async () => {
    setVerifying(true);
    setVerificationResult(null);

    // Simulated short delay for realism & UI clarity
    await new Promise(r => setTimeout(r, 400));

    const result = await verifyLedgerIntegrity(blocks);
    setVerificationResult(result);
    setVerifying(false);
  };

  // Educational Demo: Simulate an attacker attempting to modify a record
  const handleSimulateTamper = () => {
    if (blocks.length === 0) return;

    // Mutate block 0 or block 1 payload to demonstrate detection
    const targetIdx = blocks.length > 1 ? 1 : 0;
    const tampered = blocks.map((b, idx) => {
      if (idx === targetIdx) {
        return {
          ...b,
          details: {
            ...b.details,
            UNAUTHORIZED_MODIFICATION: 'Attacker forged budget amount: $99,999,999',
            tamperedTimestamp: new Date().toISOString()
          }
        };
      }
      return b;
    });

    setBlocks(tampered);
    setIsSimulatedTamper(true);
    setVerificationResult(null);
  };

  const handleResetToGenuine = () => {
    setBlocks(genuineBlocksCache);
    setIsSimulatedTamper(false);
    setVerificationResult(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(blocks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `govasset-audit-ledger-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getActionColor = (action: string) => {
    if (action.includes('APPROVED')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (action.includes('REJECTED')) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (action.includes('CREATED')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (action.includes('UPDATED')) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-purple-100 text-purple-800 border-purple-300';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cryptographic Audit Ledger (SHA-256 Hash Chain)"
      subtitle="Immutable WORM Architecture • Real-Time Mathematical Proof of Authenticity & Zero Tampering"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Top Control Bar & Verification Action */}
        <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                WORM Ledger Protocol Active
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {blocks.length} Cryptographic Blocks
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Every sensitive municipal action produces an append-only block containing a hash of the preceding block. Any tampering instantly severs the chain.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleVerify}
              disabled={verifying || blocks.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Verifying Hashes...' : 'Verify Chain Integrity'}</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={blocks.length === 0}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1"
              title="Download cryptographic audit proof in JSON format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Proof</span>
            </button>

            {!isSimulatedTamper ? (
              <button
                onClick={handleSimulateTamper}
                className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold transition-colors border border-amber-500/40 flex items-center gap-1"
                title="Simulate an attacker altering a past block to test detection"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulate Attack</span>
              </button>
            ) : (
              <button
                onClick={handleResetToGenuine}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                title="Restore genuine unaltered ledger"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Chain</span>
              </button>
            )}
          </div>
        </div>

        {/* Verification Result Banner */}
        {verificationResult && (
          <div className={`p-4 rounded-xl border text-xs leading-relaxed animate-in fade-in duration-200 ${
            verificationResult.isValid
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
              : 'bg-rose-50/90 border-rose-300 text-rose-900'
          }`}>
            <div className="flex items-start gap-3">
              {verificationResult.isValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm">
                    {verificationResult.isValid
                      ? 'Cryptographic Verification Passed: 100% Chain Integrity Confirmed'
                      : 'Security Warning: Cryptographic Hash Mismatch Detected!'}
                  </h4>
                  <span className="font-mono text-[10px] opacity-75">
                    Verified in {verificationResult.timeTakenMs}ms
                  </span>
                </div>
                <p className="mt-1">
                  {verificationResult.isValid
                    ? `All ${verificationResult.totalVerified} sequential blocks were mathematically recalculated from Genesis. Zero broken links or altered payloads detected.`
                    : verificationResult.brokenReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Simulated Attack Indicator */}
        {isSimulatedTamper && !verificationResult && (
          <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-2 animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Simulated Tamper active: Payload in memory has been modified. Click <strong>"Verify Chain Integrity"</strong> to observe detection.</span>
            </div>
            <button
              onClick={handleResetToGenuine}
              className="text-xs font-bold text-blue-700 underline shrink-0 hover:text-blue-900"
            >
              Reset
            </button>
          </div>
        )}

        {/* Ledger Blocks Timeline */}
        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              Loading cryptographic ledger...
            </div>
          ) : blocks.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No audit blocks found. Initializing Genesis block...
            </div>
          ) : (
            blocks.map((block) => (
              <div
                key={block.id || block.index}
                className={`p-4 rounded-xl border bg-white shadow-2xs transition-all ${
                  verificationResult && !verificationResult.isValid && verificationResult.brokenIndex === block.index
                    ? 'border-rose-500 ring-2 ring-rose-400/40 bg-rose-50/30'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono font-bold text-xs">
                      Block #{block.index}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getActionColor(block.action)}`}>
                      {block.action}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Target: <strong className="text-slate-800">{block.targetId}</strong> ({block.targetType})
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(block.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Authorized Actor:
                    </span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {block.actorEmail || block.actorId} <span className="text-slate-500 font-normal">({block.actorRole})</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Payload Details:
                    </span>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200 truncate">
                      {JSON.stringify(block.details)}
                    </div>
                  </div>
                </div>

                {/* Hashes Row */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        Current Hash:
                      </span>
                      <span className="text-blue-700 font-semibold truncate">
                        {block.hash}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(block.hash)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                      title="Copy SHA-256 hash"
                    >
                      {copiedHash === block.hash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
                    <LinkIcon className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                      Previous Hash:
                    </span>
                    <span className="truncate text-slate-600 text-[10px]">
                      {block.previousHash}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
