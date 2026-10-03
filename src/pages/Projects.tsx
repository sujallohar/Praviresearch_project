import React, { useEffect, useState } from 'react';
import { 
  FolderKanban, Plus, Search, Filter, 
  Pencil, Trash2, TrendingUp, DollarSign, 
  Clock, Download, Lock, Eye
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import type { Project } from '../types';
import { useAuth, type UserRole } from '../context/AuthContext';
import { ProjectModal } from '../components/modals/ProjectModal';
import { RbacModal } from '../components/modals/RbacModal';

export const Projects: React.FC = () => {
  const { 
    isPublicCitizen, 
    canCreateProject, 
    canEditProject, 
    canDeleteProject 
  } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // RBAC Modal State
  const [rbacModalOpen, setRbacModalOpen] = useState(false);
  const [rbacActionTitle, setRbacActionTitle] = useState('');
  const [rbacRequiredRoles, setRbacRequiredRoles] = useState<UserRole[]>([]);
  const [rbacExplanation, setRbacExplanation] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projs: Project[] = [];
      querySnapshot.forEach((docSnap) => {
        projs.push({ id: docSnap.id, ...docSnap.data() } as Project);
      });
      setProjects(projs);
    } catch (error) {
      console.error("Error fetching projects: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpenCreate = () => {
    if (!canCreateProject) {
      setRbacActionTitle("Create Capital Project");
      setRbacRequiredRoles(['Government Officer', 'Admin']);
      setRbacExplanation("Initiating and allocating public funds for capital infrastructure projects is restricted to Government Officers and Administrators.");
      setRbacModalOpen(true);
      return;
    }
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    if (!canEditProject) {
      setRbacActionTitle("Modify Project Milestones");
      setRbacRequiredRoles(['Government Officer', 'Contractor', 'Admin']);
      setRbacExplanation("Updating project progress, contractor assignments, or budget metrics requires authorized contractor or officer credentials.");
      setRbacModalOpen(true);
      return;
    }
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    if (!canDeleteProject) {
      setRbacActionTitle("Delete Capital Project");
      setRbacRequiredRoles(['Admin']);
      setRbacExplanation("Deleting a capital project record requires Super Administrator authority.");
      setRbacModalOpen(true);
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
      {/* Public Citizen Notice Banner */}
      {isPublicCitizen && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Public Project Tracking:</span> Citizens can view live progress percentages, contractor details, and expenditure transparency on public infrastructure works.
            </div>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded border border-blue-200 flex-shrink-0">
            Civic Transparency
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Project Lifecycle & Execution</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track capital projects, expenditure disbursement, contractor performance, and milestone completion.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button 
            onClick={handleOpenCreate} 
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all"
            title={canCreateProject ? "Create New Capital Project" : "Restricted: Officer/Admin only"}
          >
            {canCreateProject ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4 opacity-80" />}
            New Project
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
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Allocated Budget</p>
            <p className="text-2xl font-bold text-slate-900">₹{(totalBudget / 100000).toFixed(1)}L</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Disbursed Funds</p>
            <p className="text-2xl font-bold text-slate-900">₹{(totalSpent / 100000).toFixed(1)}L</p>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects by name, contractor, asset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Planning">Planning</option>
              <option value="Tender">Tender</option>
              <option value="Awarded">Awarded</option>
              <option value="Construction">Construction</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading capital project records...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No projects found matching the criteria.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Associated Asset</th>
                    <th className="py-3 px-4">Stage / Status</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Budget & Spent</th>
                    <th className="py-3 px-4">Contractor</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {p.name}
                        <span className="block text-xs font-normal text-slate-500">{p.departmentId}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                        {p.assetId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          p.status === 'Construction' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${p.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-700">{p.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        <div><strong className="text-slate-900">Budget:</strong> ₹{(p.budget || 0).toLocaleString()}</div>
                        <div><strong className="text-slate-900">Spent:</strong> ₹{(p.spent || 0).toLocaleString()}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
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
                            title="Delete project (Admin only)"
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

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredProjects.map(p => (
                <div key={p.id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-slate-900 truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                        Asset: {p.assetId} • {p.departmentId}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      p.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      p.status === 'Construction' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Progress</span>
                      <span className="font-semibold text-slate-700">{p.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${p.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <div className="text-[11px] text-slate-500">
                      <span>Spent: <strong>₹{(p.spent || 0).toLocaleString()}</strong> / ₹{(p.budget || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id!)}
                        disabled={actionLoadingId === p.id}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dynamic Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectToEdit={selectedProject}
        onSuccess={fetchProjects}
      />

      {/* RBAC Notice Modal */}
      <RbacModal
        isOpen={rbacModalOpen}
        onClose={() => setRbacModalOpen(false)}
        actionTitle={rbacActionTitle}
        requiredRoles={rbacRequiredRoles}
        explanation={rbacExplanation}
      />
    </div>
  );
};
