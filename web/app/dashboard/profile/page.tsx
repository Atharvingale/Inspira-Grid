'use client';

import React, { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { User, Settings, Github, Save, Plus, X, ExternalLink, Star, GitFork } from 'lucide-react';
import Loading from '@/components/common/Loading';
import { useGitHub } from '@/lib/hooks/useGitHub';
import { useRouter, useSearchParams } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  bio?: string;
  location?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  skills?: string[];
  experience?: string;
  availability?: 'available' | 'busy' | 'unavailable';
  profileComplete: boolean;
}

const Profile = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'github' | 'settings'>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  
  // GitHub integration
  const github = useGitHub();

  const commonSkills = [
    'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript',
    'Java', 'C++', 'HTML', 'CSS', 'PHP', 'Go', 'Rust',
    'Vue.js', 'Angular', 'Django', 'Flask', 'Express',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'AWS', 'Docker', 'Kubernetes', 'Git', 'Linux',
    'UI/UX Design', 'Figma', 'Adobe Creative Suite',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
    'Mobile Development', 'React Native', 'Flutter', 'Swift', 'Kotlin'
  ];

  // Handle GitHub connection status and tab switching from URL params
  useEffect(() => {
    const githubStatus = searchParams.get('github');
    const tabParam = searchParams.get('tab');
    
    if (githubStatus === 'connected') {
      toast.success('GitHub account connected successfully!');
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('github');
      url.searchParams.delete('tab');
      router.replace(url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
      // Refresh GitHub connection status
      github.checkConnection();
    }
    
    if (tabParam === 'github') {
      setActiveTab('github');
      // Check GitHub connection only when switching to GitHub tab
      github.checkConnection();
    }
  }, [searchParams, router, github]);

  useEffect(() => {
    try {
      if (userProfile) {
        setProfile(userProfile as UserProfile);
        setSelectedSkills(userProfile.skills || []);
      } else if (currentUser) {
        // Try to load from localStorage as fallback
        try {
          const savedProfile = localStorage.getItem(`profile_${currentUser.uid}`);
          if (savedProfile) {
            const parsedProfile = JSON.parse(savedProfile);
            setProfile(parsedProfile);
            setSelectedSkills(parsedProfile.skills || []);
          } else {
            // Create default profile if none exists
            const defaultProfile: UserProfile = {
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              bio: '',
              location: '',
              website: '',
              github: '',
              linkedin: '',
              skills: [],
              experience: '',
              availability: 'available',
              profileComplete: false
            };
            setProfile(defaultProfile);
            setSelectedSkills([]);
          }
        } catch (error) {
          console.warn('Failed to load profile from localStorage, creating default:', error);
          // Create default profile on error
          const defaultProfile: UserProfile = {
            id: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            bio: '',
            location: '',
            website: '',
            github: '',
            linkedin: '',
            skills: [],
            experience: '',
            availability: 'available',
            profileComplete: false
          };
          setProfile(defaultProfile);
          setSelectedSkills([]);
        }
      }
    } catch (error) {
      console.error('Critical error in profile loading:', error);
      // Still create a basic profile to prevent crashes
      if (currentUser) {
        const emergencyProfile: UserProfile = {
          id: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'User',
          bio: '',
          location: '',
          website: '',
          github: '',
          linkedin: '',
          skills: [],
          experience: '',
          availability: 'available',
          profileComplete: false
        };
        setProfile(emergencyProfile);
        setSelectedSkills([]);
      }
    }
  }, [userProfile, currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !selectedSkills.includes(skillInput.trim())) {
      const newSkills = [...selectedSkills, skillInput.trim()];
      setSelectedSkills(newSkills);
      setProfile(prev => prev ? { ...prev, skills: newSkills } : null);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const newSkills = selectedSkills.filter(skill => skill !== skillToRemove);
    setSelectedSkills(newSkills);
    setProfile(prev => prev ? { ...prev, skills: newSkills } : null);
  };

  const handleSkillSelect = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      const newSkills = [...selectedSkills, skill];
      setSelectedSkills(newSkills);
      setProfile(prev => prev ? { ...prev, skills: newSkills } : null);
    }
  };

  const handleSave = async () => {
    if (!profile || !currentUser) {
      toast.error('Unable to save: Profile or user data missing');
      return;
    }

    // Validation: Check required fields
    if (!profile.displayName?.trim()) {
      toast.error('Display name is required');
      return;
    }

    try {
      setSaving(true);
      
      // Prepare profile data for saving
      const profileToSave = {
        ...profile,
        skills: selectedSkills,
        updatedAt: new Date().toISOString(),
        // Check if profile is complete
        profileComplete: !!(profile.displayName?.trim() && profile.bio?.trim() && profile.location?.trim() && selectedSkills.length > 0)
      };
      
      console.log('Saving profile:', profileToSave);
      
      // Save to localStorage first (immediate backup)
      localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(profileToSave));
      
      // Update the auth context and Firebase
      if (updateUserProfile) {
        const success = await updateUserProfile(currentUser.uid, profileToSave);
        if (success) {
          toast.success('Profile updated successfully!');
          
          // Update local state to reflect changes
          setProfile(profileToSave);
          
          // If profile is complete, show celebration message
          if (profileToSave.profileComplete && !profile.profileComplete) {
            setTimeout(() => {
              toast.success('🎉 Profile completed! You can now apply to projects.');
            }, 1500);
          }
        } else {
          throw new Error('Failed to update profile in Firebase');
        }
      } else {
        throw new Error('updateUserProfile function not available');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message || 'Unknown error'}`);
      
      // Try to restore from localStorage if Firebase save failed
      try {
        const savedProfile = localStorage.getItem(`profile_${currentUser.uid}`);
        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);
          setProfile(parsedProfile);
        }
      } catch (restoreError) {
        console.warn('Failed to restore profile from localStorage:', restoreError);
      }
    } finally {
      setSaving(false);
    }
  };

  // Show loading or error state
  if (!profile) {
    // If we have a current user but no profile after some time, show error
    if (currentUser) {
      return (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Profile Loading Error</h2>
            <p className="text-text-secondary mb-6">
              There was an issue loading your profile. Let's create a new one.
            </p>
            <button
              onClick={() => {
                const newProfile: UserProfile = {
                  id: currentUser.uid,
                  email: currentUser.email || '',
                  displayName: currentUser.displayName || 'User',
                  bio: '',
                  location: '',
                  website: '',
                  github: '',
                  linkedin: '',
                  skills: [],
                  experience: '',
                  availability: 'available',
                  profileComplete: false
                };
                setProfile(newProfile);
                setSelectedSkills([]);
              }}
              className="px-6 py-3 bg-brand-primary text-white rounded-xl hover:bg-brand-secondary transition-colors"
            >
              Create Profile
            </button>
          </div>
        </div>
      );
    }
    return <Loading message="Loading profile..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            Profile
          </span>
          <span className="bg-gradient-to-r from-brand-light to-brand-secondary bg-clip-text text-transparent">
            {" "}Management
          </span>
        </h1>
        <p className="text-text-secondary text-lg leading-relaxed">Manage your profile information and settings</p>
      </motion.div>

      {/* Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border-b border-dark-border/50 mb-8"
      >
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'profile', label: 'Profile Information', icon: User },
            { key: 'github', label: 'GitHub Integration', icon: Github },
            { key: 'settings', label: 'Settings', icon: Settings }
          ].map((tab, index) => {
            const IconComponent = tab.icon;
            return (
              <motion.button
                key={tab.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                onClick={() => {
                  setActiveTab(tab.key as any);
                  // Only check GitHub connection when user clicks GitHub tab
                  if (tab.key === 'github') {
                    github.checkConnection();
                  }
                }}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === tab.key
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-dark-border'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </motion.div>

      {/* Profile Information Tab */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card blur className="shadow-xl">
            <CardContent className="p-8">
              <div className="space-y-8">
                {/* Basic Information */}
                <div>
                <h2 className="text-xl font-semibold text-text-primary mb-6">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      name="displayName"
                      value={profile.displayName || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                      placeholder="Your display name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email || currentUser?.email || ''}
                      disabled
                      className="w-full px-4 py-3 border border-dark-border rounded-xl bg-dark-surface/50 text-text-tertiary backdrop-blur-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Bio and Location */}
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={profile.location || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                      placeholder="City, Country"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Availability
                    </label>
                    <select
                      name="availability"
                      value={profile.availability || 'available'}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-xl text-text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                    >
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={profile.bio || ''}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                    placeholder="Tell others about yourself, your interests, and what you're looking for in collaboration..."
                  />
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="text-xl font-semibold text-text-primary mb-6">Social Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={profile.website || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      GitHub
                    </label>
                    <input
                      type="text"
                      name="github"
                      value={profile.github || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      LinkedIn
                    </label>
                    <input
                      type="text"
                      name="linkedin"
                      value={profile.linkedin || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-xl font-semibold text-text-primary mb-6">Skills</h3>
                
                {/* Skills Input */}
                <div className="flex mb-3">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Add a skill..."
                    className="flex-1 px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-l-xl text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddSkill}
                    variant="primary"
                    className="rounded-l-none rounded-r-xl px-6"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {/* Common Skills */}
                <div className="mb-4">
                  <p className="text-sm text-text-secondary mb-2">Common skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {commonSkills.slice(0, 15).map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleSkillSelect(skill)}
                        disabled={selectedSkills.includes(skill)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors backdrop-blur-sm ${
                          selectedSkills.includes(skill)
                            ? 'bg-dark-surface/50 text-text-tertiary cursor-not-allowed border border-gray-600'
                            : 'bg-dark-surface/50 text-text-secondary hover:bg-brand-primary/20 hover:text-brand-light border border-dark-border hover:border-brand-primary/50'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Skills */}
                <div>
                  <p className="text-sm text-text-secondary mb-2">Your skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkills.map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-3 py-2 bg-brand-primary/20 text-brand-light rounded-xl text-sm border border-brand-primary/30 backdrop-blur-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-2 text-brand-light hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Experience Level
                </label>
                <select
                  name="experience"
                  value={profile.experience || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-xl text-text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                >
                  <option value="" className="bg-dark-surface text-white">Select experience level</option>
                  <option value="beginner" className="bg-dark-surface text-white">Beginner (0-1 years)</option>
                  <option value="intermediate" className="bg-dark-surface text-white">Intermediate (1-3 years)</option>
                  <option value="advanced" className="bg-dark-surface text-white">Advanced (3-5 years)</option>
                  <option value="expert" className="bg-dark-surface text-white">Expert (5+ years)</option>
                </select>
              </div>

                {/* Save Button */}
                <div className="flex justify-between items-center pt-6">
                  {/* Debug info in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-text-tertiary space-y-1">
                      <div>User: {currentUser?.uid ? 'Authenticated' : 'Not authenticated'}</div>
                      <div>Profile: {profile ? 'Loaded' : 'Not loaded'}</div>
                      <div>UpdateFn: {typeof updateUserProfile === 'function' ? 'Available' : 'Not available'}</div>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    {/* Test Save Button (Development only) */}
                    {process.env.NODE_ENV === 'development' && (
                      <Button
                        onClick={async () => {
                          console.log('Test save clicked');
                          console.log('Current user:', currentUser);
                          console.log('Profile:', profile);
                          console.log('Update function:', updateUserProfile);
                          toast.success('Debug info logged to console');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Debug
                      </Button>
                    )}
                    
                    {/* Main Save Button */}
                    <Button
                      onClick={handleSave}
                      disabled={saving || !currentUser || !profile}
                      variant="primary"
                      size="lg"
                      loading={saving}
                      className="shadow-lg hover:shadow-brand-primary/25"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {saving ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* GitHub Integration Tab */}
      {activeTab === 'github' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card blur className="shadow-xl">
            <CardContent className="p-8">
              {github.error?.includes('not configured') ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">GitHub Integration Not Available</h3>
                  <p className="text-text-secondary mb-6 max-w-lg mx-auto">
                    GitHub integration is not configured on the server. Contact your administrator or check the GitHub setup documentation.
                  </p>
                  <div className="bg-warning-500/10 border border-warning-500/20 rounded-xl p-4 max-w-md mx-auto">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-warning-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="text-left">
                        <p className="text-sm font-medium text-warning-600">Setup Required</p>
                        <p className="text-sm text-warning-700 mt-1">
                          See GITHUB_SETUP.md for configuration instructions
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : !github.isConnected ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">GitHub Integration</h3>
                  <p className="text-text-secondary mb-6 max-w-md mx-auto">
                    Connect your GitHub account to showcase your repositories, contributions, and coding activity on your profile.
                  </p>
                  <Button 
                    onClick={() => github.connect('profile')}
                    disabled={github.loading}
                    variant="primary"
                    size="lg"
                    className="shadow-lg hover:shadow-brand-primary/25"
                  >
                    <Github className="w-5 h-5 mr-2" />
                    {github.loading ? 'Connecting...' : 'Connect GitHub Account'}
                  </Button>
                  <p className="text-text-tertiary text-sm mt-4">
                    You'll be redirected to GitHub to authorize this connection.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* GitHub Profile Header */}
                  <div className="flex items-center justify-between pb-6 border-b border-dark-border">
                    <div className="flex items-center">
                      <img 
                        src={github.profile?.avatarUrl} 
                        alt={github.profile?.username}
                        className="w-16 h-16 rounded-full border-2 border-brand-primary/20"
                      />
                      <div className="ml-4">
                        <h3 className="text-xl font-semibold text-text-primary flex items-center">
                          {github.profile?.displayName || github.profile?.username}
                          <a 
                            href={github.profile?.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-text-tertiary hover:text-brand-primary transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </h3>
                        <p className="text-text-secondary">@{github.profile?.username}</p>
                        {github.profile?.bio && (
                          <p className="text-text-secondary text-sm mt-1">{github.profile.bio}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-text-tertiary">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                            </svg>
                            {github.profile?.publicRepos} repositories
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {github.profile?.followers} followers
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            {github.profile?.following} following
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => github.disconnect()}
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                    >
                      Disconnect
                    </Button>
                  </div>

                  {/* Additional Profile Info */}
                  {(github.profile?.location || github.profile?.website || github.profile?.company) && (
                    <div className="bg-dark-surface/30 rounded-xl p-4">
                      <h4 className="font-medium text-text-primary mb-3">Additional Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {github.profile?.location && (
                          <div className="flex items-center text-text-secondary">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {github.profile.location}
                          </div>
                        )}
                        {github.profile?.company && (
                          <div className="flex items-center text-text-secondary">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {github.profile.company}
                          </div>
                        )}
                        {github.profile?.website && (
                          <div className="flex items-center text-text-secondary">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <a 
                              href={github.profile.website.startsWith('http') ? github.profile.website : `https://${github.profile.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-brand-primary transition-colors"
                            >
                              {github.profile.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recent Repositories */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-text-primary">Recent Repositories</h4>
                      <Button
                        onClick={() => github.fetchRepositories({ limit: 10, sort: 'updated' })}
                        variant="outline"
                        size="sm"
                        disabled={github.loading}
                      >
                        {github.loading ? 'Loading...' : 'Refresh'}
                      </Button>
                    </div>
                    
                    {github.loading ? (
                      <div className="text-center py-8 text-text-secondary">
                        Loading repositories...
                      </div>
                    ) : github.repositories.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {github.repositories.slice(0, 6).map(repo => (
                          <div key={repo.id} className="bg-dark-surface/50 rounded-xl p-4 border border-dark-border hover:border-brand-primary/50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="font-medium text-text-primary truncate">
                                <a 
                                  href={repo.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-brand-primary transition-colors"
                                >
                                  {repo.name}
                                </a>
                              </h5>
                              <div className="flex items-center gap-2 text-xs text-text-tertiary ml-2">
                                <span className="flex items-center">
                                  <Star className="w-3 h-3 mr-1" />
                                  {repo.stargazers_count}
                                </span>
                                <span className="flex items-center">
                                  <GitFork className="w-3 h-3 mr-1" />
                                  {repo.forks_count}
                                </span>
                              </div>
                            </div>
                            {repo.description && (
                              <p className="text-text-secondary text-sm mb-2 line-clamp-2">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-xs text-text-tertiary">
                              {repo.language && (
                                <span className="flex items-center">
                                  <span className="w-2 h-2 rounded-full bg-brand-primary mr-1"></span>
                                  {repo.language}
                                </span>
                              )}
                              <span>
                                Updated {new Date(repo.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-text-secondary">
                        No public repositories found.
                      </div>
                    )}
                  </div>

                  {github.profile?.connectedAt && (
                    <div className="text-center text-xs text-text-tertiary pt-4 border-t border-dark-border">
                      Connected on {new Date(github.profile.connectedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card blur className="shadow-xl">
            <CardContent className="text-center py-16">
              <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-medium text-text-primary mb-2">Settings Coming Soon</h3>
              <p className="text-text-secondary">
                Account settings, privacy preferences, and notification options will be available here.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default Profile;
