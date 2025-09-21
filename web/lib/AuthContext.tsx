"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Types
interface UserProfile {
  uid?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  skills?: string[];
  location?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  profileComplete?: boolean;
  joinedAt?: string;
  role?: 'user' | 'admin';
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileComplete: boolean;
  register: (email: string, password: string, displayName: string) => Promise<{ user: User }>;
  login: (email: string, password: string) => Promise<{ user: User }>;
  loginWithGoogle: () => Promise<{ user: User }>;
  loginWithGithub: () => Promise<{ user: User }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  createUserProfile: (uid: string, profileData: UserProfile) => Promise<void>;
  updateUserProfile: (uid: string, profileData: Partial<UserProfile>) => Promise<boolean>;
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Google and GitHub providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Helper function to check if profile is complete
const checkProfileComplete = (profile: UserProfile) => {
  return !!(
    profile.displayName &&
    profile.bio &&
    profile.skills?.length &&
    profile.location
  );
};

// Auth Provider Component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  // Register user with email and password
  const register = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Update display name
      await updateProfile(user, { displayName });
      
      // Create user profile in Firestore
      await createUserProfile(user.uid, {
        uid: user.uid,
        displayName,
        email,
        photoURL: user.photoURL || '',
        bio: '',
        skills: [],
        location: '',
        website: '',
        github: '',
        linkedin: '',
        profileComplete: false,
        joinedAt: new Date().toISOString(),
        role: 'user'
      });
      
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Login user with email and password
  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Login with Google
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user profile
        await createUserProfile(user.uid, {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          bio: '',
          skills: [],
          location: '',
          website: '',
          github: '',
          linkedin: '',
          profileComplete: false,
          joinedAt: new Date().toISOString(),
          role: 'user'
        });
      }
      
      return result;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  // Login with GitHub
  const loginWithGithub = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const user = result.user;
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user profile
        await createUserProfile(user.uid, {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          bio: '',
          skills: [],
          location: '',
          website: '',
          github: '',
          linkedin: '',
          profileComplete: false,
          joinedAt: new Date().toISOString(),
          role: 'user'
        });
      }
      
      return result;
    } catch (error) {
      console.error('GitHub login error:', error);
      throw error;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setProfileComplete(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // Update user password
  const updateUserPassword = async (newPassword: string) => {
    if (!currentUser) {
      throw new Error('No current user');
    }
    try {
      await updatePassword(currentUser, newPassword);
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    }
  };

  // Create user profile in Firestore
  const createUserProfile = async (uid: string, profileData: UserProfile) => {
    try {
      await setDoc(doc(db, 'users', uid), profileData);
      setUserProfile(profileData);
      setProfileComplete(profileData.profileComplete || false);
    } catch (error) {
      console.error('Profile creation error:', error);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (uid: string, profileData: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'users', uid), profileData);
      
      // Update local state
      const updatedProfile = {
        ...userProfile,
        ...profileData
      } as UserProfile;
      
      setUserProfile(updatedProfile);
      
      // Check if profile is complete
      const isComplete = checkProfileComplete(updatedProfile);
      
      if (isComplete && !profileComplete) {
        await updateDoc(doc(db, 'users', uid), { profileComplete: true });
        setProfileComplete(true);
      }
      
      return true;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  // Load user profile from Firestore
  const loadUserProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        setUserProfile(profileData);
        setProfileComplete(profileData.profileComplete || false);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Load user profile
        await loadUserProfile(user.uid);
      } else {
        // Clear user profile
        setUserProfile(null);
        setProfileComplete(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    profileComplete,
    register,
    login,
    loginWithGoogle,
    loginWithGithub,
    logout,
    resetPassword,
    updateUserPassword,
    createUserProfile,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};