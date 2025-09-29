'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useAuth } from '@/lib/AuthContext';
import { applicationService } from '@/lib/services';
import Loading from '@/components/common/Loading';
import type { Application, ApiError } from '@/lib/types';

const Applications = () => {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationService.getUserApplications();
      if (response.success) {
        setApplications(response.data?.data || []);
      } else {
        throw new Error(response.error || 'Failed to load applications');
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      const apiError = error as ApiError;
      toast.error(apiError.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedApplication) return;

    try {
      setWithdrawing(selectedApplication.id);
      const response = await applicationService.withdrawApplication(selectedApplication.id);
      if (response.success) {
        toast.success('Application withdrawn successfully');
        setShowWithdrawModal(false);
        loadApplications(); // Refresh applications
      } else {
        throw new Error(response.error || 'Failed to withdraw application');
      }
    } catch (error) {
      console.error('Error withdrawing application:', error);
      const apiError = error as ApiError;
      toast.error(apiError.message || 'Failed to withdraw application');
    } finally {
      setWithdrawing(null);
      setSelectedApplication(null);
    }
  };

  const confirmWithdraw = (application: Application) => {
    setSelectedApplication(application);
    setShowWithdrawModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-dark-surface/50 text-text-tertiary';
    }
  };

  const filterApplications = (status: string) => {
    if (status === 'all') return applications;
    return applications.filter(app => app.status === status);
  };

  const getTabCounts = () => {
    return {
      all: applications.length,
      pending: applications.filter(app => app.status === 'pending').length,
      accepted: applications.filter(app => app.status === 'accepted').length,
      rejected: applications.filter(app => app.status === 'rejected').length
    };
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
    return <Loading message="Loading your applications..." />;
  }

  const tabCounts = getTabCounts();
  const filteredApplications = filterApplications(activeTab);

  return (
    <div className="min-h-screen bg-dark-surface/30 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">My Applications</h1>
              <p className="text-text-secondary mt-1">Track your project applications and their status</p>
            </div>
            <Link 
              href="/dashboard/projects" 
              className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Projects
            </Link>
          </div>
        </div>

        {/* Applications Tabs */}
        <div className="border-b border-dark-border/50 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: `All (${tabCounts.all})` },
              { key: 'pending', label: `Pending (${tabCounts.pending})` },
              { key: 'accepted', label: `Accepted (${tabCounts.accepted})` },
              { key: 'rejected', label: `Rejected (${tabCounts.rejected})` }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'all' | 'pending' | 'accepted' | 'rejected')}
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

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="bg-dark-card/80 rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              {activeTab === 'all' 
                ? 'No Applications Yet' 
                : `No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Applications`}
            </h3>
            <p className="text-text-secondary mb-4">
              {activeTab === 'all'
                ? "You haven't applied to any projects yet. Start exploring and find projects that match your skills!"
                : `You don't have any ${activeTab} applications at the moment.`}
            </p>
            {activeTab === 'all' && (
              <Link 
                href="/dashboard/projects" 
                className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Explore Projects
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredApplications.map((application) => (
              <div key={application.id} className="bg-dark-card/80 rounded-lg shadow-sm border border-dark-border/50 h-full flex flex-col">
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-primary mb-1">
                        <Link 
                          href={`/dashboard/projects/${application.projectId}`}
                          className="text-text-primary hover:text-brand-primary transition-colors"
                        >
                          {application.projectDetails?.title || application.projectTitle || 'Project'}
                        </Link>
                      </h3>
                      <p className="text-sm text-text-secondary">
                        Applied on {formatDate(application.createdAt)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(application.status)}`}>
                      {application.status}
                    </span>
                  </div>

                  {application.projectDetails && (
                    <div className="mb-3">
                      <p className="text-text-secondary text-sm mb-2 line-clamp-2">
                        {application.projectDetails.description}
                      </p>
                      <div className="flex items-center text-sm text-text-tertiary space-x-4">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span>{application.projectDetails.category}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{application.projectDetails.ownerName}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-sm text-text-secondary mb-1">Your Message:</p>
                    <p className="text-sm text-text-tertiary line-clamp-3">
                      {application.message}
                    </p>
                  </div>

                  {application.reviewNote && (
                    <div className={`mb-3 p-3 rounded-lg text-sm ${
                      application.status === 'accepted' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className="font-medium mb-1">Review Note:</p>
                      <p className={application.status === 'accepted' ? 'text-green-700' : 'text-red-700'}>
                        {application.reviewNote}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-auto">
                    <Link
                      href={`/dashboard/projects/${application.projectId}`}
                      className="text-brand-primary hover:text-brand-primary text-sm font-medium transition-colors"
                    >
                      View Project
                    </Link>
                    {application.status === 'pending' && (
                      <button
                        onClick={() => confirmWithdraw(application)}
                        disabled={withdrawing === application.id}
                        className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {withdrawing === application.id ? 'Withdrawing...' : 'Withdraw'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdraw Confirmation Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-dark-surface/50 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-dark-card/80">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-text-primary text-center mb-2">
                Withdraw Application
              </h3>
              <p className="text-text-secondary text-center mb-4">
                Are you sure you want to withdraw your application for "{selectedApplication?.projectDetails?.title || selectedApplication?.projectTitle}"? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 bg-dark-surface/50 text-text-tertiary text-sm font-medium rounded-md hover:bg-dark-surface/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing !== null}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
