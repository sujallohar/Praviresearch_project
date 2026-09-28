import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Asset, AssetState } from '../../types';
import { Building2, MapPin, ShieldAlert, DollarSign, User, FileText, Loader2, Navigation } from 'lucide-react';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetToEdit?: Asset | null;
  onSuccess: () => void;
}

const ASSET_TYPES = ['Infrastructure', 'Facility', 'Fleet', 'Equipment', 'Utility', 'IT System'];
const DEPARTMENTS = [
  'Public Works',
  'Transportation & Highways',
  'Water Resources & Sanitation',
  'Energy & Power Grid',
  'Parks & Recreation',
  'Emergency & Disaster Relief',
  'Urban Development'
];
const ASSET_STATUSES: AssetState[] = [
  'Planning',
  'Procurement',
  'Implementation',
  'Commissioning',
  'Operational',
  'Maintenance',
  'Retirement'
];
const CONDITIONS: ('Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical')[] = [
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Critical'
];
const RISK_LEVELS: ('Low' | 'Medium' | 'High')[] = ['Low', 'Medium', 'High'];

export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  assetToEdit,
  onSuccess
}) => {
  const isEditing = Boolean(assetToEdit?.id);

  const [name, setName] = useState('');
  const [type, setType] = useState(ASSET_TYPES[0]);
  const [departmentId, setDepartmentId] = useState(DEPARTMENTS[0]);
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<AssetState>('Operational');
  const [condition, setCondition] = useState<'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'>('Good');
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [latitude, setLatitude] = useState<string>('28.6139');
  const [longitude, setLongitude] = useState<string>('77.2090');
  const [owner, setOwner] = useState('');
  const [estimatedValue, setEstimatedValue] = useState<number>(500000);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assetToEdit) {
      setName(assetToEdit.name || '');
      setType(assetToEdit.type || ASSET_TYPES[0]);
      setDepartmentId(assetToEdit.departmentId || DEPARTMENTS[0]);
      setLocation(assetToEdit.location || '');
      setStatus(assetToEdit.status || 'Operational');
      setCondition(assetToEdit.condition || 'Good');
      setRiskLevel(assetToEdit.riskLevel || 'Low');
      setLatitude(assetToEdit.latitude !== undefined ? String(assetToEdit.latitude) : '28.6139');
      setLongitude(assetToEdit.longitude !== undefined ? String(assetToEdit.longitude) : '77.2090');
      setOwner(assetToEdit.owner || '');
      setEstimatedValue((assetToEdit as any).estimatedValue || 500000);
      setDescription(assetToEdit.description || '');
    } else {
      setName('');
      setType(ASSET_TYPES[0]);
      setDepartmentId(DEPARTMENTS[0]);
      setLocation('');
      setStatus('Operational');
      setCondition('Good');
      setRiskLevel('Low');
      const randomOffsetLat = (Math.random() - 0.5) * 0.02;
      const randomOffsetLng = (Math.random() - 0.5) * 0.02;
      setLatitude((23.0225 + randomOffsetLat).toFixed(4));
      setLongitude((72.5714 + randomOffsetLng).toFixed(4));
      setOwner('Municipal Corporation');
      setEstimatedValue(500000);
      setDescription('');
    }
    setError(null);
  }, [assetToEdit, isOpen]);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(6));
          setLongitude(pos.coords.longitude.toFixed(6));
        },
        (err) => {
          console.warn('Geolocation failed:', err);
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Asset name is required.');
      return;
    }

    try {
      setSubmitting(true);

      const parsedLat = parseFloat(latitude);
      const parsedLng = parseFloat(longitude);

      const payload = {
        name: name.trim(),
        type,
        departmentId,
        location: location.trim() || 'Central District',
        status,
        condition,
        riskLevel,
        latitude: isNaN(parsedLat) ? 28.6139 : parsedLat,
        longitude: isNaN(parsedLng) ? 77.2090 : parsedLng,
        owner: owner.trim() || 'Municipal Authority',
        estimatedValue: Number(estimatedValue) || 0,
        description: description.trim(),
        updatedAt: serverTimestamp()
      };

      if (isEditing && assetToEdit?.id) {
        await updateDoc(doc(db, 'assets', assetToEdit.id), payload);
      } else {
        await addDoc(collection(db, 'assets'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving asset:', err);
      setError(err.message || 'Failed to save asset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Update Asset Specification' : 'Register New Government Asset'}
      subtitle={isEditing ? `Editing Asset ID: ${assetToEdit?.id}` : 'Fill in comprehensive asset specifications, geographic coordinates, and lifecycle status'}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Asset Name */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Asset Title / Identifier *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rajiv Gandhi Elevated Flyover or Central Water Treatment Plant"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Asset Category *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Supervising Department *
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Physical Location / Civic Address *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Ring Road Sector 14, New Delhi"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Quick Coordinate Presets */}
          <div className="md:col-span-2 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
            <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
              Quick Geographic Presets (Place asset directly in cluster):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => { setLatitude('23.0225'); setLongitude('72.5714'); }}
                className="text-xs px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded hover:bg-blue-50 transition-colors font-medium"
              >
                🎯 City Hub (23.02, 72.57)
              </button>
              <button
                type="button"
                onClick={() => { setLatitude('23.0450'); setLongitude('72.5800'); }}
                className="text-xs px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded hover:bg-blue-50 transition-colors font-medium"
              >
                📍 North District (23.04, 72.58)
              </button>
              <button
                type="button"
                onClick={() => { setLatitude('23.0150'); setLongitude('72.5650'); }}
                className="text-xs px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded hover:bg-blue-50 transition-colors font-medium"
              >
                📍 West Zone (23.01, 72.56)
              </button>
              <button
                type="button"
                onClick={() => { setLatitude('23.0350'); setLongitude('72.5950'); }}
                className="text-xs px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded hover:bg-blue-50 transition-colors font-medium"
              >
                📍 East Industrial (23.03, 72.59)
              </button>
              <button
                type="button"
                onClick={() => { setLatitude('28.6139'); setLongitude('77.2090'); }}
                className="text-xs px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50 transition-colors"
              >
                Capital Delhi (28.61, 77.20)
              </button>
            </div>
          </div>

          {/* Latitude & Longitude */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Latitude (Decimal) *</span>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-normal lowercase tracking-normal"
              >
                <Navigation className="w-3 h-3" /> auto-locate
              </button>
            </label>
            <input
              type="text"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="23.0225"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Longitude (Decimal) *
            </label>
            <input
              type="text"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="72.5714"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Lifecycle Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Lifecycle Stage *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AssetState)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ASSET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Physical Condition *
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              Risk Classification *
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {RISK_LEVELS.map((r) => (
                <option key={r} value={r}>
                  {r} Risk
                </option>
              ))}
            </select>
          </div>

          {/* Estimated Value */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              Estimated Valuation ($)
            </label>
            <input
              type="number"
              min="0"
              step="10000"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Custodian / Owner */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Designated Custodian / Operating Agency
            </label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g. State Highway Authority or City Municipal Division"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Engineering Description & Notes
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key technical attributes, capacity ratings, construction year, structural notes..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? 'Update Asset' : 'Register Asset'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
