import React, { useState } from 'react';
import { useAuth, type UserRole } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Mail, Lock, User as UserIcon, 
  Eye, ArrowRight, ShieldCheck, Briefcase, 
  Wrench, HardHat, Sparkles 
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export const Login: React.FC = () => {
  const { loginAsDemoRole, switchRole } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Transport');
  const [role, setRole] = useState<UserRole>('Government Officer');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinueAsCitizen = () => {
    switchRole('Viewer');
    navigate('/');
  };

  const handleQuickDemoLogin = (targetRole: UserRole) => {
    loginAsDemoRole(targetRole);
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignup) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name,
          email,
          department,
          role,
          createdAt: new Date().toISOString()
        });
        switchRole(role);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
            <Building2 className="w-12 h-12 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          GovAsset 360
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Public Infrastructure Governance & Capital Asset Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Citizen Quick Entry Banner */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-xl p-5 text-white mb-6 shadow-md border border-blue-600">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            General Citizen & Public Transparency
          </div>
          <h3 className="font-bold text-base text-white">
            No account required to browse!
          </h3>
          <p className="text-xs text-blue-100 mt-1 leading-relaxed">
            General citizens can immediately explore live asset health, public project progress, and report local hazards without signing up.
          </p>
          <button
            type="button"
            onClick={handleContinueAsCitizen}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-white text-blue-900 hover:bg-blue-50 font-bold py-2.5 px-4 rounded-lg text-sm shadow-sm transition-all"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Continue as Public Citizen (Instant Access)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Staff & Evaluator Quick Demo Roles */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1-Click Demo Evaluation Roles
            </span>
            <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold">
              Instant Switch
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('Admin')}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900 text-xs font-bold transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Admin (Full Access)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('Government Officer')}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 text-xs font-bold transition-colors"
            >
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Gov Officer</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('Field Engineer')}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors"
            >
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>Field Engineer</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('Contractor')}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-colors"
            >
              <HardHat className="w-4 h-4 text-emerald-600" />
              <span>Contractor</span>
            </button>
          </div>
        </div>

        {/* Standard Email Authentication Form */}
        <div className="bg-white py-6 px-4 shadow-sm sm:rounded-xl sm:px-8 border border-slate-200">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 text-center">
            {isSignup ? 'Register New Staff Account' : 'Or Sign In with Staff Credentials'}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}

            {isSignup && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 text-xs border-slate-300 rounded-md py-2 border"
                      placeholder="Ananya Sharma"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Department</label>
                    <select
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      className="mt-1 block w-full px-2 py-2 text-xs border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md border"
                    >
                      <option>Transport</option>
                      <option>Health</option>
                      <option>Education</option>
                      <option>Public Works</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Role</label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as UserRole)}
                      className="mt-1 block w-full px-2 py-2 text-xs border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md border"
                    >
                      <option>Government Officer</option>
                      <option>Field Engineer</option>
                      <option>Contractor</option>
                      <option>Admin</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 text-xs border-slate-300 rounded-md py-2 border"
                  placeholder="officer@govasset.gov.in"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 text-xs border-slate-300 rounded-md py-2 border"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
              >
                {loading ? 'Processing...' : (isSignup ? 'Create Account & Sign In' : 'Sign In as Staff')}
              </button>
            </div>
            
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="text-xs text-blue-600 hover:text-blue-500 font-medium"
              >
                {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
