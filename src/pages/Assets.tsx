import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Asset } from '../types';
import { Link } from 'react-router-dom';
import { 
  Building2, Search, Filter, Plus, Pencil, 
  Trash2, MapPin, Eye, Download, Wrench, RotateCcw 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AssetModal } from '../components/modals/AssetModal';
import { MaintenanceModal } from '../components/modals/MaintenanceModal';

export const Assets: React.FC = () => {
  const { role } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Maintenance Modal
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [maintAssetId, setMaintAssetId] = useState<string | undefined>();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'assets'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Asset));
      setAssets(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenCreate = () => {
    if (role === 'Field Engineer') {
      alert("Access Denied: Field Engineers do not have privileges to register new assets.");
      return;
    }
    setSelectedAsset(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (asset: Asset) => {
    if (role === 'Viewer') {
      alert("Access Denied: Viewers cannot modify asset records.");
      return;
    }
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const handleDelete = async (assetId: string) => {
    if (role !== 'Government Officer') {
      alert("Access Denied: Only Government Officers can delete assets.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete this asset record?")) {
      return;
    }
    try {
      setActionLoadingId(assetId);
      await deleteDoc(doc(db, 'assets', assetId));
    } catch (err: any) {
      alert("Failed to delete asset: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = "Asset ID,Name,Category,Department,Location,Status,Condition,Risk Level,Latitude,Longitude,Custodian\n";
    const rows = filteredAssets.map(a => 
      `"${a.id}","${a.name}","${a.type}","${a.departmentId}","${a.location}","${a.status}","${a.condition}","${a.riskLevel}","${a.latitude || ''}","${a.longitude || ''}","${a.owner || ''}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GovAsset_Registry_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const resetFilters = () => {
    setTypeFilter('All');
    setConditionFilter('All');
    setRiskFilter('All');
    setStatusFilter('All');
    setSearchQuery('');
  };

  const filteredAssets = assets.filter(asset => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (asset.name || '').toLowerCase().includes(query) ||
      (asset.id || '').toLowerCase().includes(query) ||
      (asset.location || '').toLowerCase().includes(query) ||
      (asset.departmentId || '').toLowerCase().includes(query);
    
    const matchesType = typeFilter === 'All' || asset.type === typeFilter;
    const matchesCondition = conditionFilter === 'All' || asset.condition === conditionFilter;
    const matchesRisk = riskFilter === 'All' || asset.riskLevel === riskFilter;
    const matchesStatus = statusFilter === 'All' || asset.status === statusFilter;

    return matchesSearch && matchesType && matchesCondition && matchesRisk && matchesStatus;
  });

  const uniqueTypes = Array.from(new Set(assets.map(a => a.type).filter(Boolean)));
  const hasActiveFilters = typeFilter !== 'All' || conditionFilter !== 'All' || riskFilter !== 'All' || statusFilter !== 'All' || searchQuery !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assets Registry</h1>
          <p className="text-sm text-slate-500 mt-1">
            Central repository of public infrastructure, facilities, utilities, and civic capital.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Register Asset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search & Filter Trigger Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 bg-slate-50/50 justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search assets by name, ID, location, or department..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Expandable Filters Tray */}
        {showFilters && (
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Categories</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Condition
              </label>
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Conditions</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Risk Classification
              </label>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Risk Levels</option>
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Lifecycle Stage
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Stages</option>
                <option value="Planning">Planning</option>
                <option value="Procurement">Procurement</option>
                <option value="Implementation">Implementation</option>
                <option value="Operational">Operational</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Retirement">Retirement</option>
              </select>
            </div>
          </div>
        )}

        {/* Content Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading assets...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Building2 className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No assets found</h3>
            <p className="text-slate-500 mb-4 max-w-sm">
              {hasActiveFilters
                ? 'Try broadening your search or resetting active filters.'
                : 'Get started by registering a new public infrastructure asset.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                Register Asset
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Asset Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location & Coordinates</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4">Condition / Risk</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link 
                        to={`/assets/${asset.id}`} 
                        className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block"
                      >
                        {asset.name}
                      </Link>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{asset.id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {asset.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{asset.location}</span>
                      </div>
                      {asset.latitude !== undefined && asset.longitude !== undefined && (
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {Number(asset.latitude).toFixed(3)}, {Number(asset.longitude).toFixed(3)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {asset.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          asset.condition === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                          asset.condition === 'Poor' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          asset.condition === 'Fair' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {asset.condition}
                        </span>
                        {asset.riskLevel === 'High' && (
                          <span className="block text-[11px] font-bold text-red-600">High Risk</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setMaintAssetId(asset.id);
                            setIsMaintModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Schedule Maintenance"
                        >
                          <Wrench className="w-4 h-4" />
                        </button>
                        <Link 
                          to={`/assets/${asset.id}`}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="View complete record & tabs"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(asset)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit asset properties"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id!)}
                          disabled={actionLoadingId === asset.id}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete asset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Asset Modal */}
      <AssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        assetToEdit={selectedAsset}
        onSuccess={() => {}}
      />

      {/* Dynamic Maintenance Modal */}
      <MaintenanceModal
        isOpen={isMaintModalOpen}
        onClose={() => setIsMaintModalOpen(false)}
        defaultAssetId={maintAssetId}
        onSuccess={() => {}}
      />
    </div>
  );
};
