import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Project } from '../types';
import { FolderKanban, Plus, Search, Filter, Pencil, Trash2, DollarSign, TrendingUp, HardHat, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProjectModal } from '../components/modals/ProjectModal';

export const Projects: React.FC = () => {
  const { role } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpenCreate = () => {
    if (role === 'Field Engineer') {
      alert("Access Denied: Only Admins or Officers can create projects.");
      return;
    }
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    if (role === 'Viewer') {
      alert("Access Denied: Viewers cannot modify projects.");
      return;
    }
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    if (role !== 'Government Officer') {
      alert("Access Denied: Only Government Officers can delete projects.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this project?")) {
      return;
    }
    try {
      setActionLoadingId(projectId);
      await deleteDoc(doc(db, 'projects', projectId));
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err: any) {
      alert("Failed to delete project: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredProjects = projects.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (p.name || '').toLowerCase().includes(query) ||
      (p.contractor || '').toLowerCase().includes(query) ||
      (p.departmentId || '').toLowerCase().includes(query) ||
      (p.assetId || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (Number(p.spent) || 0), 0);
  const avgProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + (Number(p.progressPercent) || 0), 0) / projects.length)
    : 0;

  const handleExportCSV = () => {
    const headers = "Project ID,Project Name,Asset ID,Department,Status,Progress %,Contractor,Budget,Spent\n";
    const rows = filteredProjects.map(p => 
      `"${p.id}","${p.name}","${p.assetId}","${p.departmentId}","${p.status}","${p.progressPercent}%","${p.contractor}","${p.budget}","${p.spent}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GovAsset_Projects_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Lifecycle & Execution</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track capital projects, expenditure disbursement, contractor performance, and milestone completion.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button 
            onClick={handleOpenCreate} 
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Projects</p>
            <p className="text-2xl font-bold text-slate-900">{projects.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Completion</p>
            <p className="text-2xl font-bold text-slate-900">{avgProgress}%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Allocated</p>
            <p className="text-2xl font-bold text-slate-900">${(totalBudget / 1000000).toFixed(2)}M</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Disbursed</p>
            <p className="text-2xl font-bold text-slate-900">${(totalSpent / 1000000).toFixed(2)}M</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search & Filter */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 bg-slate-50/50 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search projects by title, contractor, or asset..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Stages</option>
              <option value="Planning">Planning</option>
              <option value="Tender">Tender</option>
              <option value="Awarded">Awarded</option>
              <option value="Construction">Construction</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading projects...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No projects found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
              {searchQuery || statusFilter !== 'All'
                ? 'Try adjusting your search query or stage filter.'
                : 'Get started by creating a new capital infrastructure project.'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Initiate Project
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Project Overview</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Milestone Progress</th>
                  <th className="py-3 px-4">Budget / Disbursed</th>
                  <th className="py-3 px-4">Contractor</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProjects.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>{p.name}</div>
                      <div className="text-xs text-slate-400 font-normal line-clamp-1 mt-0.5">
                        {p.departmentId} • Asset: {p.assetId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        p.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        p.status === 'Construction' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        p.status === 'Awarded' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-36 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              p.progressPercent >= 100 ? 'bg-emerald-500' :
                              p.progressPercent >= 50 ? 'bg-blue-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${p.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 min-w-[32px]">
                          {p.progressPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 text-xs font-mono">
                      <div>${(Number(p.spent) || 0).toLocaleString()} spent</div>
                      <div className="text-slate-400">of ${(Number(p.budget) || 0).toLocaleString()}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {p.contractor || 'TBD'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit project details and progress"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id!)}
                          disabled={actionLoadingId === p.id}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete project"
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

      {/* Dynamic Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectToEdit={selectedProject}
        onSuccess={fetchProjects}
      />
    </div>
  );
};
