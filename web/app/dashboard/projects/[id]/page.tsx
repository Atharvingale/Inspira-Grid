'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
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
  githubRepo?: string;
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
  const { userProfile } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      loadProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (project && project.isOwner && activeTab === 'applications') {
      loadApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, activeTab]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/projects/${id}`);
      setProject(data as Project);
    } catch (error: any) {
      console.error('Error loading project:', error);
      toast.error(error.response?.data?.message || 'Failed to load project');
      if (error.response?.status === 404) {
        router.push('/dashboard/projects');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const data = await api.get(`/projects/${id}/applications`);
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
      await api.post(`/projects/${id}/apply`, {
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
      await api.put(`/applications/${applicationId}`, {
        status: action,
        reviewNote
      });
      toast.success(`Application ${action} successfully`);
      loadApplications(); // Refresh applications
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast.error(error.response?.data?.message || 'Failed to update application');
    }
  };

  const formatDate = (date: string | { seconds: number }) => {
    try {
      const dateObj = typeof date === 'object' && 'seconds' in date && date.seconds 
        ? new Date(date.seconds * 1000)
        : new Date(date as string);
      return dateObj.toLocaleDateString();
    } catch (_error) {
      return 'Unknown date';
    }
  };

  if (loading) {
    return <Loading message="Loading project details..." />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Project Not Found</h3>
                <p className="mt-2 text-sm text-red-700">
                  The project you're looking for doesn't exist or may have been removed.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/dashboard/projects')}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 transition-colors"
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

  const canApply = !project.isOwner && !project.isTeamMember && !project.hasApplied && project.status === 'approved';
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Project Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
                {getStatusBadge(project.status)}
              </div>
              <div className="flex items-center text-gray-600 mb-2 space-x-4">
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
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Project
                </button>
              )}
              
              <button 
                onClick={() => router.push('/dashboard/projects')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Projects
              </button>
            </div>
          </div>
          
          {!userProfile?.profileComplete && canApply && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    Complete your profile to apply to projects.
                    <Link href="/dashboard/profile" className="font-medium underline ml-2">
                      Complete now →
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            {(project.isOwner || project.isTeamMember) && (
              <button
                onClick={() => setActiveTab('teamchat')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'teamchat'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Description</h2>
                <div className="prose max-w-none text-gray-600">
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {project.description}
                  </p>
                </div>
                
                {project.githubRepo && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Repository</h3>
                    <a 
                      href={project.githubRepo} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                      {project.githubRepo}
                    </a>
                  </div>
                )}
              </div>
              
              {/* Team Members */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Members</h2>
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="font-medium">Project Owner</span>
                  </div>
                  <div className="ml-7">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {project.ownerName}
                    </span>
                  </div>
                </div>
                
                {project.teamMembers && project.teamMembers.length > 0 ? (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Team Members ({project.teamMembers.length})</h3>
                    {project.teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-900">{member.name}</span>
                        <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          {member.role || 'Member'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm">No team members yet. Be the first to join!</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Project Info */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Project Info</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-900">Team Size:</span>
                    <div className="mt-1">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {(project.teamMembers?.length || 0) + 1} / {project.teamSize} members
                      </span>
                    </div>
                  </div>
                  
                  {project.duration && (
                    <div>
                      <span className="font-medium text-gray-900">Duration:</span>
                      <p className="text-gray-600 mt-1">{project.duration}</p>
                    </div>
                  )}
                  
                  {project.budget && (
                    <div>
                      <span className="font-medium text-gray-900">Budget:</span>
                      <p className="text-gray-600 mt-1">{project.budget}</p>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium text-gray-900">Status:</span>
                    <div className="mt-1">
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Required Skills */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {project.skillsRequired?.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teamchat' && (project.isOwner || project.isTeamMember) && (
          <div className="bg-white rounded-lg shadow-sm p-6" style={{ height: 'calc(100vh - 300px)' }}>
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Team Chat Coming Soon</h3>
              <p className="text-gray-600">Real-time messaging functionality will be available here.</p>
            </div>
          </div>
        )}

        {activeTab === 'applications' && canManage && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Applications</h2>
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
                <p className="text-gray-600">Applications will appear here once people apply to join your project.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {applications.map((application) => (
                  <div key={application.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{application.applicantName}</h4>
                        <p className="text-sm text-gray-600">{application.applicantEmail}</p>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                    
                    <p className="text-gray-700 mb-3 text-sm">{application.message}</p>
                    
                    {application.skills && application.skills.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-1">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {application.skills.map((skill, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
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
                    
                    <p className="text-xs text-gray-500">
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Apply to {project.title}
                </h3>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Required Skills:</h4>
                <div className="flex flex-wrap gap-2">
                  {project.skillsRequired?.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Message *
                </label>
                <textarea
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                  placeholder="Tell the project owner why you want to join this project. Include your relevant experience, skills, and what you can contribute..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Minimum 10 characters. Be specific about your skills and motivation.
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowApplyModal(false)}
                  disabled={applying}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400 disabled:opacity-50 transition-colors"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Project</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Project editing functionality will be implemented soon.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;