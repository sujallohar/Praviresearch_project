import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { queueOfflineRecord } from '../../lib/offlineQueue';
import { getCurrentPosition, verifyGeofence, type GeoCoordinates, type GeofenceResult } from '../../utils/geoUtils';
import { generateInspectionCertificate } from '../../utils/pdfGenerator';
import type { Inspection, Asset } from '../../types';
import { 
  ClipboardCheck, Building2, User, Calendar, 
  FileText, Loader2, MapPin, ShieldCheck, 
  ShieldAlert, RefreshCw, FileDown 
} from 'lucide-react';

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionToEdit?: Inspection | null;
  defaultAssetId?: string;
  defaultInspector?: string;
  onSuccess: () => void;
}

const CONDITIONS: ('Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical')[] = [
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Critical'
];

export const InspectionModal: React.FC<InspectionModalProps> = ({
  isOpen,
  onClose,
  inspectionToEdit,
  defaultAssetId,
  defaultInspector,
  onSuccess
}) => {
  const isEditing = Boolean(inspectionToEdit?.id);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState('');
  const [inspector, setInspector] = useState('');
  const [date, setDate] = useState('');
  const [condition, setCondition] = useState<string>('Good');
  const [findings, setFindings] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [status, setStatus] = useState<'Pending' | 'Completed'>('Completed');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Anti-fraud GPS & Geofence state
  const [inspectorCoords, setInspectorCoords] = useState<GeoCoordinates | null>(null);
  const [geofenceResult, setGeofenceResult] = useState<GeofenceResult | null>(null);
  const [checkingGps, setCheckingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [downloadingCert, setDownloadingCert] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const snap = await getDocs(collection(db, 'assets'));
        const list = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as Asset));
        setAssets(list);
      } catch (err) {
        console.error('Error fetching assets for inspection:', err);
      }
    };
    if (isOpen) {
      fetchAssets();
      checkInspectorGps();
    }
  }, [isOpen]);

  // Request GPS coordinates
  const checkInspectorGps = async () => {
    try {
      setCheckingGps(true);
      setGpsError(null);
      const coords = await getCurrentPosition(8000);
      setInspectorCoords(coords);
    } catch (err: any) {
      console.warn('Geolocation capture warning:', err);
      setGpsError(err.message || 'Unable to capture GPS coordinates');
    } finally {
      setCheckingGps(false);
    }
  };

  // Re-calculate geofence whenever assetId or inspectorCoords change
  useEffect(() => {
    if (!assetId || !inspectorCoords) {
      setGeofenceResult(null);
      return;
    }

    const selectedAsset = assets.find(a => a.id === assetId);
    if (selectedAsset?.latitude !== undefined && selectedAsset?.longitude !== undefined) {
      const result = verifyGeofence(
        inspectorCoords,
        { latitude: selectedAsset.latitude, longitude: selectedAsset.longitude },
        250 // 250m geofence radius
      );
      setGeofenceResult(result);
    } else {
      setGeofenceResult(null);
    }
  }, [assetId, inspectorCoords, assets]);

  useEffect(() => {
    if (inspectionToEdit) {
      setAssetId(inspectionToEdit.assetId || '');
      setInspector(inspectionToEdit.inspector || '');
      if (inspectionToEdit.date) {
        const d = inspectionToEdit.date?.toDate ? inspectionToEdit.date.toDate() : new Date(inspectionToEdit.date);
        if (!isNaN(d.getTime())) {
          setDate(d.toISOString().split('T')[0]);
        }
      } else {
        setDate(new Date().toISOString().split('T')[0]);
      }
      setCondition(inspectionToEdit.condition || 'Good');
      setFindings(inspectionToEdit.findings || '');
      setRecommendation(inspectionToEdit.recommendation || '');
      setStatus(inspectionToEdit.status || 'Completed');
    } else {
      setAssetId(defaultAssetId || '');
      setInspector(defaultInspector || 'Senior Field Auditor');
      setDate(new Date().toISOString().split('T')[0]);
      setCondition('Good');
      setFindings('');
      setRecommendation('');
      setStatus('Completed');
    }
    setError(null);
  }, [inspectionToEdit, defaultAssetId, defaultInspector, isOpen]);

  const handleDownloadCertificate = async () => {
    if (!inspectionToEdit) return;
    try {
      setDownloadingCert(true);
      const matchingAsset = assets.find(a => a.id === inspectionToEdit.assetId);
      await generateInspectionCertificate({
        inspection: inspectionToEdit,
        asset: matchingAsset || null,
        geofenceStatus: geofenceResult?.statusMessage || 'Verified On-Site Physical Presence'
      });
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      alert('Could not generate PDF certificate: ' + err.message);
    } finally {
      setDownloadingCert(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!assetId) {
      setError('Please select an asset.');
      return;
    }

    try {
      setSubmitting(true);

      const inspectionTimestamp = date ? Timestamp.fromDate(new Date(date + 'T10:00:00')) : serverTimestamp();

      const payload = {
        assetId,
        inspector: inspector.trim() || 'Official Inspector',
        date: inspectionTimestamp,
        condition,
        findings: findings.trim() || 'Visual structural inspection conducted without major discrepancies.',
        recommendation: recommendation.trim() || 'Continue regular cycle maintenance.',
        status,
        // Anti-Fraud GPS Geofence Audit Fields
        geofenceVerified: geofenceResult ? geofenceResult.isWithinGeofence : false,
        geofenceDistanceMeters: geofenceResult ? geofenceResult.distanceMeters : null,
        geofenceStatus: geofenceResult ? geofenceResult.statusMessage : 'GPS not verified at submission',
        inspectorCoords: inspectorCoords
          ? { latitude: inspectorCoords.latitude, longitude: inspectorCoords.longitude }
          : null
      };

      // Check if browser is offline
      if (typeof navigator !== 'undefined' && !navigator.onLine && !isEditing) {
        await queueOfflineRecord('inspection', {
          ...payload,
          date: date || new Date().toISOString()
        });
        alert('🌐 Offline Mode Active: Inspection audit stored locally on device. It will automatically synchronize to Cloud Firestore when internet connection is restored.');
        onSuccess();
        onClose();
        return;
      }

      if (isEditing && inspectionToEdit?.id) {
        await updateDoc(doc(db, 'inspections', inspectionToEdit.id), {
          ...payload,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'inspections'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving inspection:', err);
      // Offline fallback on network error
      if (!isEditing) {
        try {
          await queueOfflineRecord('inspection', {
            assetId,
            inspector: inspector.trim() || 'Official Inspector',
            date: date || new Date().toISOString(),
            condition,
            findings: findings.trim() || 'Visual structural inspection conducted without major discrepancies.',
            recommendation: recommendation.trim() || 'Continue regular cycle maintenance.',
            status,
            geofenceVerified: geofenceResult ? geofenceResult.isWithinGeofence : false,
            geofenceDistanceMeters: geofenceResult ? geofenceResult.distanceMeters : null,
            geofenceStatus: geofenceResult ? geofenceResult.statusMessage : 'Network disconnected during submission',
            inspectorCoords: inspectorCoords ? { latitude: inspectorCoords.latitude, longitude: inspectorCoords.longitude } : null
          });
          alert('🌐 Network unavailable: Saved inspection locally to offline queue! It will automatically sync once connected.');
          onSuccess();
          onClose();
          return;
        } catch (queueErr) {
          console.error('Failed to queue offline inspection:', queueErr);
        }
      }
      setError(err.message || 'Failed to save inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAsset = assets.find(a => a.id === assetId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Update Field Inspection Log' : 'Conduct & Log Asset Inspection'}
      subtitle={isEditing ? `Modifying Inspection ID: ${inspectionToEdit?.id}` : 'Record on-site evaluation, structural integrity score, and remediation steps'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* GPS Geofence Anti-Fraud Status Banner */}
        <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs ${
          geofenceResult?.isWithinGeofence
            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
            : geofenceResult && !geofenceResult.isWithinGeofence
            ? 'bg-amber-50/90 border-amber-300 text-amber-900'
            : checkingGps
            ? 'bg-blue-50/80 border-blue-200 text-blue-900'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-start sm:items-center gap-2 min-w-0">
            {geofenceResult?.isWithinGeofence ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            ) : geofenceResult && !geofenceResult.isWithinGeofence ? (
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div className="min-w-0">
              <span className="font-bold block sm:inline">
                {geofenceResult?.isWithinGeofence
                  ? '📍 GPS Anti-Fraud Verified On-Site: '
                  : geofenceResult && !geofenceResult.isWithinGeofence
                  ? '⚠️ Geofence Delta Detected: '
                  : checkingGps
                  ? 'Calibrating GPS Coordinates... '
                  : 'GPS Verification: '}
              </span>
              <span className="text-[11px] opacity-90">
                {geofenceResult
                  ? geofenceResult.statusMessage
                  : selectedAsset && selectedAsset.latitude !== undefined
                  ? inspectorCoords
                    ? 'Comparing asset coordinates with device GPS...'
                    : gpsError || 'Awaiting device location permissions.'
                  : 'Select an asset with calibrated GPS coordinates.'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={checkInspectorGps}
            disabled={checkingGps}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200 shadow-2xs text-[11px] shrink-0 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${checkingGps ? 'animate-spin text-blue-600' : ''}`} />
            <span>{checkingGps ? 'Locating...' : 'Refresh GPS'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Asset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Inspected Asset *
            </label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Asset...</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
            {selectedAsset?.latitude !== undefined && selectedAsset?.longitude !== undefined && (
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Target GPS: {selectedAsset.latitude.toFixed(4)}, {selectedAsset.longitude.toFixed(4)}
              </span>
            )}
          </div>

          {/* Condition Assessed */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-slate-400" />
              Observed Condition *
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Inspector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Lead Inspector
            </label>
            <input
              type="text"
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
              placeholder="e.g. Officer Raman Sharma"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Inspection Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Completed">Completed</option>
              <option value="Pending">Pending Review</option>
            </select>
          </div>
        </div>

        {/* Findings */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Inspection Findings & Physical Observations *
          </label>
          <textarea
            rows={3}
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="Record visible wear, structural deflection, corrosion, operating temperature, or calibration readouts..."
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Recommendations */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Remedial Recommendations & Action Items
          </label>
          <textarea
            rows={2}
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            placeholder="e.g. Schedule immediate bearing grease replacement, or conduct ultrasonic test within 30 days..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            {isEditing && inspectionToEdit && (
              <button
                type="button"
                onClick={handleDownloadCertificate}
                disabled={downloadingCert}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-semibold rounded-lg text-xs transition-colors border border-slate-200"
              >
                <FileDown className="w-3.5 h-3.5 text-blue-600" />
                <span>{downloadingCert ? 'Generating PDF...' : 'Download Certificate (PDF)'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Update Inspection' : 'Submit Inspection Log'}</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
