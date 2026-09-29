import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export type UserRole = 'Admin' | 'Government Officer' | 'Field Engineer' | 'Contractor' | 'Viewer';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
  createdAt: string;
}

export const ROLE_PERSONAS: Record<UserRole, { name: string; email: string; department: string; title: string }> = {
  'Admin': {
    name: 'Rajesh Kumar',
    email: 'admin@govasset.gov.in',
    department: 'Central Municipal Administration',
    title: 'Super Administrator'
  },
  'Government Officer': {
    name: 'Ananya Sharma',
    email: 'officer@govasset.gov.in',
    department: 'Ministry of Road Transport & Urban Infra',
    title: 'Executive Director'
  },
  'Field Engineer': {
    name: 'Vikram Singh',
    email: 'engineer@govasset.gov.in',
    department: 'Public Works & Civil Engineering',
    title: 'Senior Field Inspector'
  },
  'Contractor': {
    name: 'Larsen & Infra Works',
    email: 'contractor@infraproject.com',
    department: 'Civil Infrastructure Works',
    title: 'Prime Contractor'
  },
  'Viewer': {
    name: 'Public Citizen / Guest',
    email: 'citizen@public.gov.in',
    department: 'Civic Transparency Portal',
    title: 'General Public Citizen'
  }
};

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile;
  role: UserRole;
  loading: boolean;
  isGuest: boolean;
  switchRole: (newRole: UserRole) => void;
  loginAsDemoRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  // Granular Permission Helpers
  canCreateAsset: boolean;
  canEditAsset: boolean;
  canDeleteAsset: boolean;
  canCreateProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canLogInspection: boolean;
  canScheduleMaintenance: boolean;
  canApproveBudget: boolean;
  canExportData: boolean;
  isPublicCitizen: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const DEFAULT_ROLE: UserRole = 'Viewer';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Initialize role from localStorage if previously chosen, or default to 'Viewer' (Public Citizen)
  const [role, setRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('govasset_active_role');
    if (savedRole && ['Admin', 'Government Officer', 'Field Engineer', 'Contractor', 'Viewer'].includes(savedRole)) {
      return savedRole as UserRole;
    }
    return DEFAULT_ROLE;
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    const persona = ROLE_PERSONAS[role] || ROLE_PERSONAS['Viewer'];
    return {
      uid: 'guest-citizen',
      name: persona.name,
      email: persona.email,
      department: persona.department,
      role: role,
      createdAt: new Date().toISOString()
    };
  });

  const [loading, setLoading] = useState(true);

  // Switch role dynamically across the entire application
  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('govasset_active_role', newRole);
    const persona = ROLE_PERSONAS[newRole];
    setProfile(prev => ({
      ...prev,
      name: currentUser ? (prev.name || persona.name) : persona.name,
      email: currentUser ? (prev.email || persona.email) : persona.email,
      department: persona.department,
      role: newRole
    }));
  };

  // 1-Click login as demo role
  const loginAsDemoRole = (targetRole: UserRole) => {
    switchRole(targetRole);
    // Fake mock user session if not in Firebase Auth
    if (!currentUser) {
      const persona = ROLE_PERSONAS[targetRole];
      setProfile({
        uid: `demo-${targetRole.toLowerCase().replace(/\s+/g, '-')}`,
        name: persona.name,
        email: persona.email,
        department: persona.department,
        role: targetRole,
        createdAt: new Date().toISOString()
      });
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    // Revert to Public Citizen / Guest Viewer mode instead of breaking the app
    switchRole('Viewer');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            setRole(data.role);
            localStorage.setItem('govasset_active_role', data.role);
          } else {
            // Default to Government Officer for authenticated users without profile
            const currentSavedRole = (localStorage.getItem('govasset_active_role') as UserRole) || 'Government Officer';
            setRole(currentSavedRole);
            setProfile({
              uid: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Government Officer',
              email: user.email || 'officer@govasset.gov.in',
              department: 'Public Works',
              role: currentSavedRole,
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Error fetching user profile", error);
        }
      } else {
        // Unauthenticated visitor: use active role (default Viewer / Public Citizen)
        const currentSaved = (localStorage.getItem('govasset_active_role') as UserRole) || 'Viewer';
        setRole(currentSaved);
        const persona = ROLE_PERSONAS[currentSaved];
        setProfile({
          uid: 'guest-citizen',
          name: persona.name,
          email: persona.email,
          department: persona.department,
          role: currentSaved,
          createdAt: new Date().toISOString()
        });
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  // Permission flags based on active role
  const isPublicCitizen = role === 'Viewer';
  const isGuest = !currentUser && isPublicCitizen;

  const canCreateAsset = role === 'Admin' || role === 'Government Officer';
  const canEditAsset = role === 'Admin' || role === 'Government Officer';
  const canDeleteAsset = role === 'Admin';

  const canCreateProject = role === 'Admin' || role === 'Government Officer';
  const canEditProject = role === 'Admin' || role === 'Government Officer' || role === 'Contractor';
  const canDeleteProject = role === 'Admin';

  const canLogInspection = role === 'Admin' || role === 'Field Engineer';
  const canScheduleMaintenance = role === 'Admin' || role === 'Government Officer' || role === 'Field Engineer';
  const canApproveBudget = role === 'Admin' || role === 'Government Officer';
  const canExportData = role === 'Admin' || role === 'Government Officer';

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      profile, 
      role, 
      loading, 
      isGuest,
      switchRole, 
      loginAsDemoRole,
      logout,
      canCreateAsset,
      canEditAsset,
      canDeleteAsset,
      canCreateProject,
      canEditProject,
      canDeleteProject,
      canLogInspection,
      canScheduleMaintenance,
      canApproveBudget,
      canExportData,
      isPublicCitizen
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
