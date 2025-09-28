'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Search, Users, MessageCircle, Briefcase } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useMessaging } from '@/lib/contexts/MessagingContext';

interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  isOnline?: boolean;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectTitle?: string;
}

export function NewConversationModal({ 
  isOpen, 
  onClose, 
  projectId, 
  projectTitle 
}: NewConversationModalProps) {
  const { currentUser } = useAuth();
  const { createConversation } = useMessaging();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [conversationType, setConversationType] = useState<'direct' | 'group' | 'project_group'>(
    projectId ? 'project_group' : 'direct'
  );
  const [conversationName, setConversationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');

  // Load available users
  useEffect(() => {
    if (isOpen && currentUser) {
      loadUsers();
    }
  }, [isOpen, currentUser]);

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (isOpen && currentUser) {
        loadUsers();
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, projectId]);

  const loadUsers = async () => {
    try {
      setSearchLoading(true);
      
      // Get authentication token
      const token = await currentUser?.getIdToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Construct query parameters
      const params = new URLSearchParams({
        limit: '20',
        ...(projectId && { projectId }),
        ...(searchQuery && { query: searchQuery })
      });

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAvailableUsers(data.users || []);
      
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setSearchLoading(false);
    }
  };

  // Users are already filtered by the API based on search query
  const filteredUsers = availableUsers;

  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        // For direct conversations, only allow one user
        if (conversationType === 'direct') {
          return [user];
        }
        return [...prev, user];
      }
    });
  };

  const handleTypeChange = (type: 'direct' | 'group' | 'project_group') => {
    setConversationType(type);
    // Reset selection if changing to direct and have multiple users selected
    if (type === 'direct' && selectedUsers.length > 1) {
      setSelectedUsers(selectedUsers.slice(0, 1));
    }
  };

  const canCreateConversation = () => {
    if (selectedUsers.length === 0) return false;
    if (conversationType === 'direct' && selectedUsers.length !== 1) return false;
    if (conversationType === 'group' && conversationName.trim() === '') return false;
    return true;
  };

  const handleCreate = async () => {
    if (!canCreateConversation()) return;

    setLoading(true);
    setError('');

    try {
      const participantIds = selectedUsers.map(user => user.id);
      
      await createConversation(
        participantIds,
        conversationType,
        projectId,
        conversationType === 'group' ? conversationName : undefined,
        projectTitle
      );

      // Reset form
      setSelectedUsers([]);
      setConversationName('');
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setConversationName('');
    setSearchQuery('');
    setError('');
    onClose();
  };

  const getConversationTitle = () => {
    switch (conversationType) {
      case 'direct':
        return 'New Direct Message';
      case 'group':
        return 'New Group Chat';
      case 'project_group':
        return `New ${projectTitle} Team Chat`;
      default:
        return 'New Conversation';
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 className="text-xl font-semibold text-text-primary">
            {getConversationTitle()}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-text-tertiary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Conversation Type Selector */}
          {!projectId && (
            <div className="p-6 border-b border-dark-border">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleTypeChange('direct')}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    conversationType === 'direct'
                      ? 'border-brand-primary bg-brand-primary/10 text-text-primary'
                      : 'border-dark-border hover:border-brand-primary/50 text-text-secondary'
                  }`}
                >
                  <MessageCircle className="w-5 h-5 mb-2" />
                  <div>
                    <p className="font-medium text-sm">Direct</p>
                    <p className="text-xs opacity-70">1-on-1 chat</p>
                  </div>
                </button>
                <button
                  onClick={() => handleTypeChange('group')}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    conversationType === 'group'
                      ? 'border-brand-primary bg-brand-primary/10 text-text-primary'
                      : 'border-dark-border hover:border-brand-primary/50 text-text-secondary'
                  }`}
                >
                  <Users className="w-5 h-5 mb-2" />
                  <div>
                    <p className="font-medium text-sm">Group</p>
                    <p className="text-xs opacity-70">Multiple people</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Group Name Input */}
          {(conversationType === 'group' || conversationType === 'project_group') && (
            <div className="p-6 border-b border-dark-border">
              <Input
                label="Group Name"
                value={conversationName}
                onChange={(e) => setConversationName(e.target.value)}
                placeholder="Enter group name"
                required
              />
            </div>
          )}

          {/* Search */}
          <div className="p-6 border-b border-dark-border">
            <Input
              leftIcon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
            />
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {searchLoading ? (
              <div className="p-6 text-center text-text-secondary">
                <div className="animate-spin w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-text-secondary">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{searchQuery ? 'No users found matching your search' : 'No users available'}</p>
              </div>
            ) : (
              <div className="p-3">
                {filteredUsers.map(user => {
                  const isSelected = selectedUsers.some(u => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUserSelection(user)}
                      className={`w-full p-3 rounded-lg flex items-center space-x-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-brand-primary/20 border border-brand-primary/30'
                          : 'hover:bg-dark-surface/50'
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.photoURL} />
                          <AvatarFallback className="bg-dark-surface text-text-secondary">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-dark-card rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {user.name}
                        </p>
                        <p className="text-sm text-text-secondary truncate">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-3 border-t border-dark-border">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-dark-border flex space-x-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!canCreateConversation() || loading}
            loading={loading}
            className="flex-1"
          >
            Create
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
