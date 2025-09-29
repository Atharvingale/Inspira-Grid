"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

export default function SettingsPage() {
  const [user, loading] = useAuthState(auth);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    projectUpdates: true,
    applicationUpdates: true,
    messageNotifications: true,
    weeklyDigest: false
  });
  
  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showLocation: true,
    allowDirectMessages: true,
    showOnlineStatus: true
  });

  const [_showPasswordModal, setShowPasswordModal] = useState(false);
  const [_showEmailModal, setShowEmailModal] = useState(false);
  const [_passwords, _setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [_newEmail, _setNewEmail] = useState('');

  const saveNotificationSettings = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    // TODO: Save to user profile
    setSaving(false);
  };

  const savePrivacySettings = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    // TODO: Save to user profile
    setSaving(false);
  };

  if (loading) {
    return <div className="mx-auto max-w-xl px-4 py-10">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <p className="text-text-tertiary">Please log in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-text-primary">Account Settings</h1>
      <p className="mt-2 text-text-secondary">Manage your account preferences and privacy settings.</p>

      {/* Tab Navigation */}
      <div className="mt-8 border-b border-white/10">
        <nav className="flex space-x-8">
          {[
            { id: 'notifications', label: 'Notifications' },
            { id: 'privacy', label: 'Privacy' },
            { id: 'security', label: 'Security' },
            { id: 'about', label: 'About' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'notifications' && (
          <div className="rounded-2xl border border-dark-border bg-dark-card/80 backdrop-blur-sm p-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-6">Notification Preferences</h2>
            
            <div className="space-y-4">
              {Object.entries({
                emailNotifications: 'Receive email notifications',
                projectUpdates: 'Project updates and announcements',
                applicationUpdates: 'Application status updates',
                messageNotifications: 'New message notifications',
                weeklyDigest: 'Weekly digest email'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
                  <input
                    type="checkbox"
                    checked={notifications[key as keyof typeof notifications]}
                    onChange={(e) => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="rounded border-dark-border bg-dark-surface text-brand-primary focus:ring-brand-primary focus:ring-offset-0 focus:ring-2 transition-all"
                  />
                </label>
              ))}
            </div>
            
            <button
              onClick={saveNotificationSettings}
              disabled={saving}
              className="mt-8 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary px-6 py-3 text-white font-semibold hover:shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 disabled:opacity-50 transition-all duration-200"
            >
              {saving ? "Saving..." : "Save Notification Settings"}
            </button>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="rounded-2xl border border-dark-border bg-dark-card/80 backdrop-blur-sm p-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-6">Privacy Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Profile Visibility
                </label>
                <select
                  value={privacy.profileVisibility}
                  onChange={(e) => setPrivacy(prev => ({ ...prev, profileVisibility: e.target.value }))}
                  className="block w-full rounded-xl border border-dark-border bg-dark-surface/80 backdrop-blur-sm text-text-primary px-4 py-3 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="public" className="bg-dark-surface text-text-primary">Public - Everyone</option>
                  <option value="members" className="bg-dark-surface text-text-primary">Members Only</option>
                  <option value="private" className="bg-dark-surface text-text-primary">Private - Only You</option>
                </select>
              </div>
              
              <div className="space-y-3">
                {Object.entries({
                  showEmail: 'Show email address on profile',
                  showLocation: 'Show location on profile',
                  allowDirectMessages: 'Allow direct messages from other users',
                  showOnlineStatus: 'Show when you\'re online'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
                    <input
                      type="checkbox"
                      checked={privacy[key as keyof typeof privacy] as boolean}
                      onChange={(e) => setPrivacy(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-dark-border bg-dark-surface text-brand-primary focus:ring-brand-primary focus:ring-offset-0 focus:ring-2 transition-all"
                    />
                  </label>
                ))}
              </div>
            </div>
            
            <button
              onClick={savePrivacySettings}
              disabled={saving}
              className="mt-8 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary px-6 py-3 text-white font-semibold hover:shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 disabled:opacity-50 transition-all duration-200"
            >
              {saving ? "Saving..." : "Save Privacy Settings"}
            </button>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-dark-border bg-dark-card/80 backdrop-blur-sm p-8">
              <h2 className="text-2xl font-semibold text-text-primary mb-6">Account Security</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Email Address</p>
                    <p className="text-sm text-text-tertiary">{user.email}</p>
                  </div>
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="text-sm text-brand-primary hover:text-brand-light px-3 py-2 rounded-lg hover:bg-brand-primary/10 transition-all"
                  >
                    Change
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Password</p>
                    <p className="text-sm text-text-tertiary">••••••••</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="text-sm text-brand-primary hover:text-brand-light px-3 py-2 rounded-lg hover:bg-brand-primary/10 transition-all"
                  >
                    Change
                  </button>
                </div>
                
                <div className="pt-6 border-t border-dark-border/50">
                  <p className="text-sm font-semibold text-text-primary mb-2">Account Created</p>
                  <p className="text-sm text-text-secondary">
                    {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl border border-dark-border bg-dark-card/80 backdrop-blur-sm p-8">
              <h3 className="text-2xl font-semibold text-text-primary mb-6">Account Actions</h3>
              
              <div className="space-y-4">
                <button
                  onClick={() => auth.signOut()}
                  className="w-full text-left px-6 py-4 rounded-xl border border-dark-border bg-dark-surface/50 text-text-primary hover:bg-white/5 hover:border-brand-primary/50 transition-all"
                >
                  Sign Out
                </button>
                
                <button
                  disabled
                  className="w-full text-left px-6 py-4 rounded-xl border border-dark-border bg-dark-surface/30 text-text-muted opacity-50 cursor-not-allowed"
                >
                  Download My Data (Coming Soon)
                </button>
              </div>
              
              <div className="mt-8 pt-8 border-t border-danger-500/20">
                <h4 className="text-danger-500 font-semibold mb-4 text-lg">Danger Zone</h4>
                <button
                  disabled
                  className="px-6 py-3 bg-danger-500/10 text-danger-500 rounded-xl opacity-50 cursor-not-allowed border border-danger-500/20"
                >
                  Delete Account (Coming Soon)
                </button>
                <p className="text-xs text-text-muted mt-2">
                  Account deletion will be available in a future update.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="rounded-2xl border border-dark-border bg-dark-card/80 backdrop-blur-sm p-8 text-center">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl text-white">⬢</span>
              </div>
              <h2 className="text-3xl font-bold text-text-primary mb-3">Inspira-Grid</h2>
              <p className="text-brand-primary text-base font-medium">Version 1.0.0</p>
            </div>
            
            <p className="text-text-secondary mb-8 text-lg leading-relaxed max-w-2xl mx-auto">
              A collaborative platform for students, creators, developers, and innovators
              to form teams, collaborate on projects, and bring ideas to life.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="p-6 rounded-xl bg-dark-surface/50 border border-dark-border">
                <div className="text-brand-primary text-3xl mb-4">⚡</div>
                <h3 className="font-semibold text-text-primary mb-2 text-lg">Built with</h3>
                <p className="text-sm text-text-tertiary">Next.js, Node.js, Firebase</p>
              </div>
              <div className="p-6 rounded-xl bg-dark-surface/50 border border-dark-border">
                <div className="text-success-500 text-3xl mb-4">🔒</div>
                <h3 className="font-semibold text-text-primary mb-2 text-lg">Secure</h3>
                <p className="text-sm text-text-tertiary">Firebase Authentication</p>
              </div>
              <div className="p-6 rounded-xl bg-dark-surface/50 border border-dark-border">
                <div className="text-warning-500 text-3xl mb-4">⚡</div>
                <h3 className="font-semibold text-text-primary mb-2 text-lg">Real-time</h3>
                <p className="text-sm text-text-tertiary">Socket.IO Messaging</p>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-dark-border">
              <p className="text-sm text-text-muted">
                © 2024 Inspira-Grid. Built with passion for collaboration.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
