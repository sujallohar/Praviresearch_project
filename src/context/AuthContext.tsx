import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export type UserRole = 'Admin' | 'Government Officer' | 'Field Engineer' | 'Contractor' | 'Viewer';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
  createdAt: string;
}

// Security Rule: Only this single verified email address is permitted to hold Super Admin privileges
export const SUPER_ADMIN_EMAIL = 'emailsujallohar17@gmail.com';

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
  isSuperAdmin: boolean;
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
  const [profile, setProfile] = useState<UserProfile>(CITIZEN_PROFILE);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setProfile(CITIZEN_PROFILE);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        // Public Citizen (Unauthenticated)
        setProfile(CITIZEN_PROFILE);
        setLoading(false);
        return;
      }

      const userEmail = user.email?.toLowerCase().trim() || '';
      const isSuperAdminEmail = userEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (isSuperAdminEmail) {
          // Hard-lock: emailsujallohar17@gmail.com is ALWAYS Super Admin
          const adminProfile: UserProfile = {
            uid: user.uid,
            name: docSnap.exists() && docSnap.data().name ? docSnap.data().name : 'Sujal Lohar',
            email: user.email || SUPER_ADMIN_EMAIL,
            department: 'Central Municipal Administration',
            role: 'Admin',
            createdAt: docSnap.exists() && docSnap.data().createdAt ? docSnap.data().createdAt : new Date().toISOString()
          };

          // Synchronize admin status in Firestore
          await setDoc(docRef, {
            ...adminProfile,
            role: 'Admin',
            updatedAt: serverTimestamp()
          }, { merge: true });

          setProfile(adminProfile);
        } else if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          // Security policy: If any other user has role 'Admin', forcefully downgrade to 'Government Officer'
          const safeRole: UserRole = data.role === 'Admin' ? 'Government Officer' : (data.role || 'Government Officer');
          
          if (data.role === 'Admin') {
            await setDoc(docRef, { role: safeRole, updatedAt: serverTimestamp() }, { merge: true });
          }

          setProfile({
            uid: user.uid,
            name: data.name || user.displayName || 'Authorized Staff',
            email: user.email || '',
            department: data.department || 'Public Works',
            role: safeRole,
            createdAt: data.createdAt || new Date().toISOString()
          });
        } else {
          // New verified staff user without doc yet
          const defaultStaffProfile: UserProfile = {
            uid: user.uid,
            name: user.displayName || 'Authorized Staff',
            email: user.email || '',
            department: 'Municipal Operations',
            role: 'Government Officer',
            createdAt: new Date().toISOString()
          };

          await setDoc(docRef, {
            ...defaultStaffProfile,
            createdAt: serverTimestamp()
          });

          setProfile(defaultStaffProfile);
        }
      } catch (error) {
        console.error('Error synchronizing user profile:', error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Compute Active Privileges
  const isSuperAdmin = currentUser !== null && currentUser.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isPublicCitizen = !currentUser || profile.role === 'Viewer';
  const isAuthenticatedStaff = !isPublicCitizen;
  const activeRole: UserRole = isSuperAdmin ? 'Admin' : (isPublicCitizen ? 'Viewer' : profile.role);

  // Strict Role Capabilities
  const canCreateAsset = isSuperAdmin || activeRole === 'Government Officer';
  const canEditAsset = isSuperAdmin || activeRole === 'Government Officer';
  const canDeleteAsset = isSuperAdmin;

  const canCreateProject = isSuperAdmin || activeRole === 'Government Officer';
  const canEditProject = isSuperAdmin || activeRole === 'Government Officer' || activeRole === 'Contractor';
  const canDeleteProject = isSuperAdmin;

  const canLogInspection = isSuperAdmin || activeRole === 'Field Engineer';
  const canScheduleMaintenance = isSuperAdmin || activeRole === 'Government Officer' || activeRole === 'Field Engineer';
  const canApproveBudget = isSuperAdmin || activeRole === 'Government Officer';
  const canExportData = isSuperAdmin || activeRole === 'Government Officer';

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      profile, 
      role: activeRole, 
      loading, 
      isAuthenticatedStaff,
      isPublicCitizen,
      isSuperAdmin,
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
