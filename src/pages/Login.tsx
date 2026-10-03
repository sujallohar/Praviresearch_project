import React, { useState } from 'react';
import { useAuth, type UserRole, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Mail, Lock, User as UserIcon, 
  Eye, ArrowRight, ShieldCheck, Sparkles, 
  AlertTriangle, Shield
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const Login: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Public Works');
  const [role, setRole] = useState<Exclude<UserRole, 'Admin' | 'Viewer'>>('Government Officer');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinueAsCitizen = async () => {
    await logout();
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const isSuperAdminEmail = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      if (isSignup) {
        // Enforce: Only emailsujallohar17@gmail.com can ever hold the Admin role
        const assignedRole: UserRole = isSuperAdminEmail ? 'Admin' : role;

        const { user } = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: name.trim() || (isSuperAdminEmail ? 'Sujal Lohar' : 'Staff Member'),
          email: cleanEmail,
          department: isSuperAdminEmail ? 'Central Municipal Administration' : department,
          role: assignedRole,
          createdAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
      navigate('/');
    } catch (err: any) {
      console.error('Authentication error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Please verify your email and password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed.');
      }
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        {/* Citizen Quick Entry Banner */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-5 text-white shadow-md border border-blue-600">
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
            className="mt-4 w-full flex items-center justify-center gap-2 bg-white text-blue-900 hover:bg-blue-50 font-bold py-2.5 px-4 rounded-xl text-sm shadow-sm transition-all"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Continue as Public Citizen (Instant Access)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Standard Email Authentication Form (Strict Auth - No Demo Bypass) */}
        <div className="bg-white py-6 px-4 shadow-sm sm:rounded-2xl sm:px-8 border border-slate-200">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>{isSignup ? 'Register New Staff Account' : 'Sign In with Staff Credentials'}</span>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isSignup && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 text-xs border-slate-300 rounded-lg py-2 border"
                      placeholder="e.g. Officer Sunita Rao"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Department</label>
                    <select
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      className="mt-1 block w-full px-2 py-2 text-xs border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg border font-medium"
                    >
                      <option>Public Works</option>
                      <option>Transport & Highways</option>
                      <option>Water Resources</option>
                      <option>Urban Development</option>
                      <option>Electrical & Energy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Requested Role</label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as Exclude<UserRole, 'Admin' | 'Viewer'>)}
                      className="mt-1 block w-full px-2 py-2 text-xs border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg border font-semibold text-blue-700"
                    >
                      <option value="Government Officer">Government Officer</option>
                      <option value="Field Engineer">Field Engineer</option>
                      <option value="Contractor">Prime Contractor</option>
                    </select>
                  </div>
                </div>

                {/* Security Policy Clarification */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Security Policy:</strong> Super Administrator access is strictly restricted to Central Head (<code className="text-blue-700 font-mono">emailsujallohar17@gmail.com</code>). All staff registrations are audited.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 text-xs border-slate-300 rounded-lg py-2 border"
                  placeholder="e.g. officer@govasset.gov.in"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 text-xs border-slate-300 rounded-lg py-2 border"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
              >
                {loading ? 'Authenticating...' : (isSignup ? 'Create Account & Sign In' : 'Sign In with Official Credentials')}
              </button>
            </div>
            
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError('');
                }}
                className="text-xs text-blue-600 hover:text-blue-500 font-semibold"
              >
                {isSignup ? 'Already registered? Sign in' : "New municipal staff? Register account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
