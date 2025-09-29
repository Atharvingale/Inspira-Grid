'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/lib/AuthContext';
import { githubService, type GitHubProfile } from '@/lib/services/githubService';
import Loading from '@/components/common/Loading';

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
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'github' | 'settings'>('profile');
  const [_loading, _setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  
  // GitHub state
  const [githubProfile, setGitHubProfile] = useState<GitHubProfile | null>(null);
  const [githubLoading, setGitHubLoading] = useState(false);
  const [isConnectingGitHub, setIsConnectingGitHub] = useState(false);

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

  useEffect(() => {
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
        }
      } catch (error) {
        // Failed to load profile from localStorage
      }
    }
  }, [userProfile, currentUser]);

  // Load GitHub profile
  useEffect(() => {
    if (currentUser && activeTab === 'github') {
      loadGitHubProfile();
    }
  }, [currentUser, activeTab]);

  const loadGitHubProfile = async () => {
    if (!currentUser) return;
    
    try {
      setGitHubLoading(true);
      const response = await githubService.getProfile();
      if (response.success) {
        setGitHubProfile(response.data!);
      } else {
        // User doesn't have GitHub connected
        setGitHubProfile(null);
      }
    } catch (error: any) {
      setGitHubProfile(null);
    } finally {
      setGitHubLoading(false);
    }
  };

  const handleGitHubConnect = async () => {
    if (!currentUser) {
      toast.error('Please log in to connect GitHub');
      return;
    }

    try {
      setIsConnectingGitHub(true);
      await githubService.redirectToGitHubOAuth();
    } catch (error: any) {
      console.error('GitHub connect error:', error);
      toast.error('Failed to connect GitHub: ' + (error.message || 'Unknown error'));
      setIsConnectingGitHub(false);
    }
  };

  const handleGitHubDisconnect = async () => {
    if (!currentUser || !githubProfile) return;

    try {
      setGitHubLoading(true);
      const response = await githubService.disconnect();
      if (response.success) {
        setGitHubProfile(null);
        toast.success('GitHub account disconnected successfully');
      } else {
        toast.error('Failed to disconnect GitHub account');
      }
    } catch (error: any) {
      console.error('GitHub disconnect error:', error);
      toast.error('Failed to disconnect GitHub: ' + (error.message || 'Unknown error'));
    } finally {
      setGitHubLoading(false);
    }
  };

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
    if (!profile || !currentUser) return;

    try {
      setSaving(true);
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage for persistence
      localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(profile));
      
      // Update the auth context
      await updateUserProfile?.(currentUser.uid, profile);
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <Loading message="Loading profile..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Profile Management</h1>
          <p className="text-text-secondary mt-1">Manage your profile information and settings</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-dark-border/50 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'profile', label: 'Profile Information' },
              { key: 'github', label: 'GitHub Integration' },
              { key: 'settings', label: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-dark-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Information Tab */}
        {activeTab === 'profile' && (
          <div className="bg-dark-card/80 rounded-lg shadow-sm p-6">
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Basic Information</h2>
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
                      className="w-full px-3 py-2 bg-dark-surface/50 border border-dark-border rounded-md text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
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
                      className="w-full px-3 py-2 border border-dark-border rounded-md bg-dark-surface/50 text-text-tertiary backdrop-blur-sm"
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
                      className="w-full px-3 py-2 bg-dark-surface/50 border border-dark-border rounded-md text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
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
                      className="w-full px-3 py-2 bg-dark-surface/50 border border-dark-border rounded-md text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
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
                    className="w-full px-3 py-2 bg-dark-surface/50 border border-dark-border rounded-md text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                    placeholder="Tell others about yourself, your interests, and what you're looking for in collaboration..."
                  />
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Social Links</h3>
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
                      className="w-full px-3 py-2 bg-dark-surface/50 border border-dark-border rounded-md text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
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
                      className="w-full px-3 py-2 bg-dark-surface/50 border border-dark-border rounded-md text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
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
                      className="w-full px-3 py-2 bg-dark-surface/50 border border-dark-border rounded-md text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Skills</h3>
                
                {/* Skills Input */}
                <div className="flex mb-3">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Add a skill..."
                    className="flex-1 px-3 py-2 bg-dark-surface/50 border border-dark-border rounded-l-md text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-r-md hover:shadow-lg hover:shadow-brand-primary/30 transition-all"
                  >
                    Add
                  </button>
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
                        className={`px-2 py-1 text-xs rounded transition-colors backdrop-blur-sm ${
                          selectedSkills.includes(skill)
                            ? 'bg-dark-surface/50 text-text-tertiary cursor-not-allowed border border-gray-600'
                            : 'bg-dark-surface/50 text-text-secondary hover:bg-brand-primary/20 hover:text-brand-light border border-dark-border'
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
                        className="inline-flex items-center px-3 py-1 bg-brand-primary/20 text-brand-light rounded-full text-sm border border-brand-primary/30 backdrop-blur-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-2 text-brand-light hover:text-white transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
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
                  className="w-full px-3 py-2 bg-dark-surface/50 border border-dark-border rounded-md text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent backdrop-blur-sm"
                >
                  <option value="" className="bg-dark-surface text-white">Select experience level</option>
                  <option value="beginner" className="bg-dark-surface text-white">Beginner (0-1 years)</option>
                  <option value="intermediate" className="bg-dark-surface text-white">Intermediate (1-3 years)</option>
                  <option value="advanced" className="bg-dark-surface text-white">Advanced (3-5 years)</option>
                  <option value="expert" className="bg-dark-surface text-white">Expert (5+ years)</option>
                </select>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 disabled:opacity-50 transition-all duration-200"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GitHub Integration Tab */}
        {activeTab === 'github' && (
          <div className="bg-dark-card/80 rounded-lg shadow-sm p-6">
            {githubLoading ? (
              <div className="text-center py-12">
                <Loading message="Loading GitHub profile..." />
              </div>
            ) : githubProfile ? (
              // Connected GitHub Profile
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-text-primary">GitHub Profile</h2>
                  <button
                    onClick={handleGitHubDisconnect}
                    className="px-4 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Profile Info */}
                  <div className="flex items-start space-x-4">
                    <img
                      src={githubProfile.avatarUrl}
                      alt={githubProfile.displayName}
                      className="w-16 h-16 rounded-full"
                    />
                    <div>
                      <h3 className="text-lg font-medium text-text-primary">{githubProfile.displayName}</h3>
                      <p className="text-text-secondary">@{githubProfile.username}</p>
                      {githubProfile.bio && (
                        <p className="text-text-tertiary text-sm mt-2">{githubProfile.bio}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-semibold text-brand-primary">{githubProfile.publicRepos}</div>
                      <div className="text-xs text-text-secondary">Repositories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-brand-primary">{githubProfile.followers}</div>
                      <div className="text-xs text-text-secondary">Followers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-brand-primary">{githubProfile.following}</div>
                      <div className="text-xs text-text-secondary">Following</div>
                    </div>
                  </div>
                </div>
                
                {/* Additional Info */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {githubProfile.location && (
                    <div className="text-text-secondary">
                      <span className="font-medium">Location:</span> {githubProfile.location}
                    </div>
                  )}
                  {githubProfile.company && (
                    <div className="text-text-secondary">
                      <span className="font-medium">Company:</span> {githubProfile.company}
                    </div>
                  )}
                  {githubProfile.website && (
                    <div className="text-text-secondary">
                      <span className="font-medium">Website:</span>
                      <a href={githubProfile.website} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline ml-1">
                        {githubProfile.website}
                      </a>
                    </div>
                  )}
                  {githubProfile.connectedAt && (
                    <div className="text-text-secondary">
                      <span className="font-medium">Connected:</span> {new Date(githubProfile.connectedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                <div className="mt-6">
                  <a
                    href={githubProfile.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-dark-surface/50 text-text-primary rounded-lg hover:bg-dark-surface transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    View on GitHub
                  </a>
                </div>
              </div>
            ) : (
              // Not Connected
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <h3 className="text-lg font-medium text-text-primary mb-2">GitHub Integration</h3>
                <p className="text-text-secondary mb-4">
                  Connect your GitHub account to showcase your repositories and contributions.
                </p>
                <button
                  onClick={handleGitHubConnect}
                  disabled={isConnectingGitHub}
                  className="px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                >
                  {isConnectingGitHub ? 'Connecting...' : 'Connect GitHub Account'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-dark-card/80 rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-medium text-text-primary mb-2">Settings Coming Soon</h3>
              <p className="text-text-secondary">
                Account settings, privacy preferences, and notification options will be available here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
