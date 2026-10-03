import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Printer, Copy, Check, X, Shield, MapPin, Building2 } from 'lucide-react';
import type { Asset } from '../../types';
import { downloadDataUrl } from '../../utils/fileDownloader';

interface AssetQrTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
}

export const AssetQrTagModal: React.FC<AssetQrTagModalProps> = ({ isOpen, onClose, asset }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const badgeRef = useRef<HTMLDivElement | null>(null);

  const appOrigin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://govasset-360.web.app';
  const verificationUrl = asset ? `${appOrigin}/assets/${asset.id}` : '';

  useEffect(() => {
    if (asset && isOpen) {
      // Universal HTTPS URL: scannable by any mobile phone camera, Google Lens, or GovAsset in-app scanner
      QRCode.toDataURL(
        verificationUrl,
        {
          width: 320,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        }
      )
        .then(setQrDataUrl)
        .catch((err) => console.error('Failed to generate QR:', err));
    }
  }, [asset, isOpen, verificationUrl]);

  if (!isOpen || !asset) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    downloadDataUrl(qrDataUrl, `GovAsset_QR_Tag_${asset.id}.png`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Physical Asset QR Tag</h3>
              <p className="text-[11px] text-slate-400">Printable on-site field laminate identifier</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Physical Badge Preview */}
        <div className="p-6 bg-slate-50 flex flex-col items-center">
          <div 
            ref={badgeRef}
            className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-md w-full max-w-xs flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Top Security Banner */}
            <div className="w-full bg-slate-900 text-white py-1.5 px-3 rounded-lg mb-3 flex items-center justify-between text-[10px] font-bold tracking-wider">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-400" /> MUNICIPAL ASSET
              </span>
              <span className="text-blue-300 font-mono text-[9px]">{asset.departmentId || 'PWD'}</span>
            </div>

            {/* Asset Title & ID */}
            <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2 mb-1">
              {asset.name}
            </h4>
            <div className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-xs font-bold text-slate-700 mb-3">
              {asset.id}
            </div>

            {/* High-Resolution QR Code */}
            <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-inner mb-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR Code for ${asset.name}`} className="w-44 h-44 object-contain" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Metadata Footer */}
            <div className="w-full text-left text-[10px] text-slate-500 space-y-1 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Building2 className="w-3 h-3 text-slate-400" /> Type:
                </span>
                <span className="truncate">{asset.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <MapPin className="w-3 h-3 text-slate-400" /> Location:
                </span>
                <span className="truncate max-w-[130px]">{asset.location || 'Municipal Zone'}</span>
              </div>
              {asset.latitude !== undefined && asset.longitude !== undefined && (
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span>GPS Coordinates:</span>
                  <span>{asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}</span>
                </div>
              )}
            </div>

            {/* Micro instruction */}
            <p className="text-[8px] text-slate-400 mt-2">
              Scan with GovAsset 360 App to audit condition or log maintenance.
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPng}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
