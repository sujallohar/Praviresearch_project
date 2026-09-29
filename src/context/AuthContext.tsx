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

export const STAFF_PERSONAS: Record<Exclude<UserRole, 'Viewer'>, { name: string; email: string; department: string; title: string }> = {
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
  }
};

const CITIZEN_PROFILE: UserProfile = {
  uid: 'public-citizen',
  name: 'Public Citizen',
  email: 'citizen@public.gov.in',
  department: 'Civic Transparency Portal',
  role: 'Viewer',
  createdAt: new Date().toISOString()
};

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile;
  role: UserRole;
  loading: boolean;
  isAuthenticatedStaff: boolean;
  isPublicCitizen: boolean;
  loginAsStaffRole: (role: Exclude<UserRole, 'Viewer'>) => void;
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Check if a staff session was saved
  const [staffRole, setStaffRole] = useState<Exclude<UserRole, 'Viewer'> | null>(() => {
    const saved = localStorage.getItem('govasset_staff_role');
    if (saved && ['Admin', 'Government Officer', 'Field Engineer', 'Contractor'].includes(saved)) {
      return saved as Exclude<UserRole, 'Viewer'>;
    }
    return null;
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    if (staffRole && STAFF_PERSONAS[staffRole]) {
      const p = STAFF_PERSONAS[staffRole];
      return {
        uid: `staff-${staffRole.toLowerCase().replace(/\s+/g, '-')}`,
        name: p.name,
        email: p.email,
        department: p.department,
        role: staffRole,
        createdAt: new Date().toISOString()
      };
    }
    return CITIZEN_PROFILE;
  });

  const [loading, setLoading] = useState(false);

  // Authenticate as a staff authority through the Login portal
  const loginAsStaffRole = (targetRole: Exclude<UserRole, 'Viewer'>) => {
    const persona = STAFF_PERSONAS[targetRole];
    setStaffRole(targetRole);
    localStorage.setItem('govasset_staff_role', targetRole);
    setProfile({
      uid: `staff-${targetRole.toLowerCase().replace(/\s+/g, '-')}`,
      name: persona.name,
      email: persona.email,
      department: persona.department,
      role: targetRole,
      createdAt: new Date().toISOString()
    });
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem('govasset_staff_role');
    setCurrentUser(null);
    setStaffRole(null);
    setProfile(CITIZEN_PROFILE);
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
            if (data.role !== 'Viewer') {
              setStaffRole(data.role as Exclude<UserRole, 'Viewer'>);
              localStorage.setItem('govasset_staff_role', data.role);
            }
          }
        } catch (error) {
          console.error("Error fetching user profile", error);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const activeRole: UserRole = staffRole || (currentUser ? 'Government Officer' : 'Viewer');
  const isPublicCitizen = activeRole === 'Viewer';
  const isAuthenticatedStaff = !isPublicCitizen;

  // Strict Permissions
  const canCreateAsset = activeRole === 'Admin' || activeRole === 'Government Officer';
  const canEditAsset = activeRole === 'Admin' || activeRole === 'Government Officer';
  const canDeleteAsset = activeRole === 'Admin';

  const canCreateProject = activeRole === 'Admin' || activeRole === 'Government Officer';
  const canEditProject = activeRole === 'Admin' || activeRole === 'Government Officer' || activeRole === 'Contractor';
  const canDeleteProject = activeRole === 'Admin';

  const canLogInspection = activeRole === 'Admin' || activeRole === 'Field Engineer';
  const canScheduleMaintenance = activeRole === 'Admin' || activeRole === 'Government Officer' || activeRole === 'Field Engineer';
  const canApproveBudget = activeRole === 'Admin' || activeRole === 'Government Officer';
  const canExportData = activeRole === 'Admin' || activeRole === 'Government Officer';

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      profile, 
      role: activeRole, 
      loading, 
      isAuthenticatedStaff,
      isPublicCitizen,
      loginAsStaffRole,
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
      canExportData
    }}>
      {children}
    </AuthContext.Provider>
  );
};
