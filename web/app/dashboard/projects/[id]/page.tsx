'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { useAuth } from '@/lib/AuthContext';
import { apiClient as api } from '@/lib/api';
import Loading from '@/components/common/Loading';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  skillsRequired?: string[];
  ownerId: string;
  ownerName: string;
  teamSize: number;
  teamMembers?: Array<{ userId: string; name: string; role?: string }>;
  duration?: string;
  budget?: string;
  githubRepo?: string | { owner: string; name: string; fullName: string; url: string; cloneUrl: string; linkedAt: string };
  status: 'approved' | 'pending' | 'rejected' | 'in-progress' | 'completed';
  createdAt: { seconds: number } | string;
  applicationCount?: number;
  isOwner?: boolean;
  isTeamMember?: boolean;
  hasApplied?: boolean;
}

interface Application {
  id: string;
  applicantName: string;
  applicantEmail: string;
  message: string;
  skills?: string[];
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: { seconds: number } | string;
}

const ProjectDetails = () => {
  const { id } = useParams();
  const router = useRouter();
  const { currentUser, userProfile } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: '',
    skillsRequired: [] as string[],
    teamSize: 2,
    duration: '',
    budget: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  useEffect(() => {
    if (project && project.isOwner && activeTab === 'applications') {
      loadApplications();
    }
  }, [project, activeTab]);

  const loadProject = async () => {
    try {
      setLoading(true);
      console.log('Loading project with ID:', id);
      
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid project ID');
      }
      
      const data = await api.get(`/api/projects/${id}`);
      console.log('Project loaded successfully:', data);
      setProject(data as Project);
    } catch (error: any) {
      console.error('Error loading project:', error);
      console.error('Project ID:', id);
      console.error('Error response:', error.response);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load project';
      toast.error(errorMessage);
      
      if (error.response?.status === 404) {
        toast.error('Project not found. Redirecting to projects list.');
        setTimeout(() => {
          router.push('/dashboard/projects');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const data = await api.get(`/api/projects/${id}/applications`);
      setApplications((data as any)?.applications || []);
    } catch (error: any) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
    }
  };

  const handleApply = async () => {
    if (!applicationMessage.trim() || applicationMessage.trim().length < 10) {
      toast.error('Please provide a detailed application message (at least 10 characters)');
      return;
    }

    try {
      setApplying(true);
      await api.post(`/api/projects/${id}/apply`, {
        message: applicationMessage.trim()
      });
      toast.success('Application submitted successfully!');
      setShowApplyModal(false);
      loadProject(); // Refresh to update hasApplied status
    } catch (error: any) {
      console.error('Error applying to project:', error);
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'accepted' | 'rejected', reviewNote = '') => {
    try {
      await api.patch(`/api/applications/${applicationId}/status`, {
        status: action,
        reviewNote
      });
      toast.success(`Application ${action} successfully`);
      loadApplications(); // Refresh applications
      loadProject(); // Refresh project to update team members
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast.error(error.response?.data?.message || 'Failed to update application');
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      await api.put(`/api/projects/${id}`, editFormData);
      toast.success('Project updated successfully');
      setShowEditModal(false);
      loadProject(); // Refresh project data
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast.error(error.response?.data?.message || 'Failed to update project');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = () => {
    if (project) {
      setEditFormData({
        title: project.title,
        description: project.description,
        category: project.category,
        skillsRequired: project.skillsRequired || [],
        teamSize: project.teamSize,
        duration: project.duration || '',
        budget: project.budget || ''
      });
      setShowEditModal(true);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/projects/${id}`);
      toast.success('Project deleted successfully');
      router.push('/dashboard/projects');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const formatDate = (date: string | { seconds: number }) => {
    try {
      const dateObj = typeof date === 'object' && 'seconds' in date && date.seconds 
        ? new Date(date.seconds * 1000)
        : new Date(date as string);
      return dateObj.toLocaleDateString();
    } catch (error) {
      return 'Unknown date';
    }
  };

  if (loading) {
    return <Loading message="Loading project details..." />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-300">Project Not Found</h3>
                <p className="mt-2 text-sm text-red-200">
                  The project you're looking for doesn't exist or may have been removed.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/dashboard/projects')}
                    className="bg-red-600 px-3 py-2 rounded-md text-sm font-medium text-red-100 hover:bg-red-700 transition-colors"
                  >
                    Back to Projects
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canApply = !project.isOwner && !project.isTeamMember && !project.hasApplied && (project.status === 'approved' || project.status === 'in-progress');
  const canManage = project.isOwner;

  const getStatusBadge = (status: string) => {
    const colors = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${colors[status as keyof typeof colors] || colors.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Project Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{project.title}</h1>
                {getStatusBadge(project.status)}
              </div>
              <div className="flex items-center text-gray-400 mb-2 space-x-4">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Created by {project.ownerName}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-8 0a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2m-8 0h8" />
                  </svg>
                  <span>{formatDate(project.createdAt)}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>{project.category}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {canApply && (
                <button 
                  onClick={() => setShowApplyModal(true)}
                  disabled={!userProfile?.profileComplete}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Apply to Join
                </button>
              )}
              
              {canManage && (
                <>
                  <button 
                    onClick={openEditModal}
                    className="px-4 py-2 border border-blue-500 text-blue-400 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Project
                  </button>
                  <button 
                    onClick={handleDeleteProject}
                    className="px-4 py-2 border border-red-500 text-red-400 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              )}
              
              <button 
                onClick={() => router.push('/dashboard/projects')}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Projects
              </button>
            </div>
          </div>
          
          {!userProfile?.profileComplete && canApply && (
            <div className="mt-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-300">
                    Complete your profile to apply to projects.
                    <Link href="/dashboard/profile" className="font-medium underline ml-2 text-yellow-200">
                      Complete now →
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              Overview
            </button>
            {(project.isOwner || project.isTeamMember) && (
              <button
                onClick={() => setActiveTab('teamchat')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'teamchat'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                Team Chat
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setActiveTab('applications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'applications'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                Applications ({applications.length})
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Project Description */}
              <div className="bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Project Description</h2>
                <div className="prose max-w-none text-gray-300">
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {project.description}
                  </p>
                </div>
                
                {project.githubRepo && (
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <h3 className="text-lg font-medium text-white mb-2">Repository</h3>
                    <a 
                      href={typeof project.githubRepo === 'string' ? project.githubRepo : project.githubRepo.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                      {typeof project.githubRepo === 'string' 
                        ? project.githubRepo 
                        : project.githubRepo.fullName}
                    </a>
                    {typeof project.githubRepo === 'object' && (
                      <div className="mt-2 text-sm text-gray-400">
                        <p>Linked on {new Date(project.githubRepo.linkedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Team Members */}
              <div className="bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Team Members</h2>
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="font-medium text-white">Project Owner</span>
                  </div>
                  <div className="ml-7">
                    <span className="px-3 py-1 bg-blue-600 text-blue-100 rounded-full text-sm font-medium">
                      {project.ownerName}
                    </span>
                  </div>
                </div>
                
                {project.teamMembers && project.teamMembers.length > 0 ? (
                  <div>
                    <h3 className="font-medium text-white mb-3">Team Members ({project.teamMembers.length})</h3>
                    {project.teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-300">{member.name}</span>
                        <span className="ml-2 px-2 py-1 bg-gray-700 text-gray-200 rounded text-sm">
                          {member.role || 'Member'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm text-gray-300">No team members yet. Be the first to join!</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Project Info */}
              <div className="bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-white mb-4">Project Info</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-white">Team Size:</span>
                    <div className="mt-1">
                      <span className="px-3 py-1 bg-blue-600 text-blue-100 rounded-full text-sm font-medium">
                        {(project.teamMembers?.length || 0) + 1} / {project.teamSize} members
                      </span>
                    </div>
                  </div>
                  
                  {project.duration && (
                    <div>
                      <span className="font-medium text-white">Duration:</span>
                      <p className="text-gray-300 mt-1">{project.duration}</p>
                    </div>
                  )}
                  
                  {project.budget && (
                    <div>
                      <span className="font-medium text-white">Budget:</span>
                      <p className="text-gray-300 mt-1">{project.budget}</p>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium text-white">Status:</span>
                    <div className="mt-1">
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Required Skills */}
              <div className="bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-white mb-4">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {project.skillsRequired?.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teamchat' && (project.isOwner || project.isTeamMember) && (
          <div className="bg-gray-800 rounded-lg shadow-sm p-6" style={{ height: 'calc(100vh - 300px)' }}>
            <div className="flex flex-col h-full">
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-gray-700 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white">Team Chat</h3>
                  <p className="text-gray-400 text-sm">
                    {((project.teamMembers?.length || 0) + 1)} members • {project.title}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="flex items-center text-green-400 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Online
                  </span>
                </div>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {/* Sample welcome message */}
                <div className="bg-gray-700/50 rounded-lg p-4 border-l-4 border-blue-500">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                      🤖
                    </div>
                    <div>
                      <p className="font-medium text-white">System</p>
                      <p className="text-gray-400 text-xs">Just now</p>
                    </div>
                  </div>
                  <p className="text-gray-300">
                    Welcome to the team chat! This is where you can collaborate with your team members. 
                    <span className="text-yellow-400">Real-time messaging will be available soon.</span>
                  </p>
                </div>
                
                {/* Placeholder for future messages */}
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-400 text-sm">Start the conversation! Messages will appear here.</p>
                </div>
              </div>
              
              {/* Message Input */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type your message... (coming soon)"
                        disabled
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button 
                        disabled
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button 
                    disabled
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  💡 Team chat functionality is in development. Check back soon for real-time messaging!
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'applications' && canManage && (
          <div className="bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Project Applications</h2>
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-lg font-medium text-white mb-2">No Applications Yet</h3>
                <p className="text-gray-400">Applications will appear here once people apply to join your project.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {applications.map((application) => (
                  <div key={application.id} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-white">{application.applicantName}</h4>
                        <p className="text-sm text-gray-300">{application.applicantEmail}</p>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                    
                    <p className="text-gray-300 mb-3 text-sm">{application.message}</p>
                    
                    {application.skills && application.skills.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-400 mb-1">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {application.skills.map((skill, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {application.status === 'pending' && (
                      <div className="flex gap-2 mb-3">
                        <button 
                          onClick={() => handleApplicationAction(application.id, 'accepted')}
                          className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleApplicationAction(application.id, 'rejected')}
                          className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-400">
                      Applied on {formatDate(application.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-600 w-full max-w-2xl shadow-lg rounded-md bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Apply to {project.title}
                </h3>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium text-white mb-2">Required Skills:</h4>
                <div className="flex flex-wrap gap-2">
                  {project.skillsRequired?.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Application Message *
                </label>
                <textarea
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                  placeholder="Tell the project owner why you want to join this project. Include your relevant experience, skills, and what you can contribute..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Minimum 10 characters. Be specific about your skills and motivation.
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowApplyModal(false)}
                  disabled={applying}
                  className="px-4 py-2 bg-gray-600 text-gray-200 text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={applying || !applicationMessage.trim() || applicationMessage.trim().length < 10}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {applying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border border-gray-600 w-full max-w-4xl shadow-lg rounded-md bg-gray-800 mb-10">
            <form onSubmit={handleEditProject}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-white">Edit Project</h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Category
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
                    required
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile Development">Mobile Development</option>
                    <option value="AI/ML">AI/ML</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Game Development">Game Development</option>
                    <option value="Desktop Applications">Desktop Applications</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Design">Design</option>
                    <option value="Research">Research</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-white mb-2">
                  Description
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Team Size
                  </label>
                  <input
                    type="number"
                    value={editFormData.teamSize}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, teamSize: parseInt(e.target.value) }))}
                    min="2"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={editFormData.duration}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="e.g., 3 months"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Budget
                  </label>
                  <input
                    type="text"
                    value={editFormData.budget}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="e.g., $500, Unpaid"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-white mb-2">
                  Required Skills
                </label>
                <div className="flex flex-wrap gap-2">
                  {editFormData.skillsRequired.map((skill, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-600 text-blue-100 rounded-full text-sm">
                      {skill}
                      <button
                        type="button"
                        onClick={() => {
                          setEditFormData(prev => ({
                            ...prev,
                            skillsRequired: prev.skillsRequired.filter((_, i) => i !== index)
                          }));
                        }}
                        className="ml-2 text-blue-200 hover:text-white"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Note: Skill editing is limited in this modal. Use the full edit page for comprehensive skill management.
                </p>
              </div>
              
              {project?.status !== 'approved' && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-300">
                        This project can be edited because it's not yet approved. Once approved, editing will be restricted.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={editLoading}
                  className="px-4 py-2 bg-gray-600 text-gray-200 text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {editLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Update Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;