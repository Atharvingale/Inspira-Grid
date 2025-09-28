'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter,
  Plus,
  Users,
  Code,
  Calendar
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/lib/toast';

// Utility function to format Firestore timestamps
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  
  // Handle Firestore timestamp objects
  if (timestamp._seconds || timestamp.seconds) {
    const date = new Date((timestamp._seconds || timestamp.seconds) * 1000);
    return date.toLocaleDateString();
  }
  
  // Handle regular date strings or Date objects
  if (typeof timestamp === 'string' || timestamp instanceof Date) {
    return new Date(timestamp).toLocaleDateString();
  }
  
  return 'N/A';
};

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  skills?: string[];
  skillsRequired?: string[];
  ownerId: string;
  ownerName?: string;
  owner?: {
    name: string;
    photoURL?: string;
  };
  teamSize: number;
  teamMembers?: Array<{ userId: string; name: string }>;
  currentTeamSize?: number;
  status: 'open' | 'approved' | 'in-progress' | 'completed';
  hasApplied?: boolean;
  applicationCount?: number;
  duration?: string;
  budget?: string;
  githubRepo?: string;
  createdAt: string | { seconds: number };
  isOwner?: boolean;
  isTeamMember?: boolean;
}


const Projects = () => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'discover' | 'my-projects'>('discover');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('approved');
  const [discoveredProjects, setDiscoveredProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);

  const categories = [
    'Web Development',
    'Mobile Development',
    'AI/ML',
    'Data Science',
    'Game Development',
    'Desktop Applications',
    'DevOps',
    'Design',
    'Research',
    'Other'
  ];

  // Load projects from API
  useEffect(() => {
    const loadProjects = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Load both discovered projects and user's projects in parallel
        const [discoverRes, myProjectsRes] = await Promise.allSettled([
          // Discovered projects (all approved projects from other users)
          (async () => {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (selectedCategory) params.append('category', selectedCategory);
            if (selectedStatus) params.append('status', selectedStatus);
            params.append('limit', '50');
            
            const queryString = params.toString();
            const url = `/api/projects${queryString ? '?' + queryString : ''}`;
            return apiClient.get(url);
          })(),
          // User's own projects (all statuses)
          apiClient.get('/api/projects/user/my-projects')
        ]);
        
        // Process discovered projects
        if (discoverRes.status === 'fulfilled') {
          const projects = (discoverRes.value as any)?.projects || [];
          // Filter out user's own projects from discovered projects
          const filteredProjects = projects.filter((p: Project) => p.ownerId !== currentUser.uid);
          setDiscoveredProjects(filteredProjects);
        } else {
          setDiscoveredProjects([]);
        }
        
        // Process user's projects
        if (myProjectsRes.status === 'fulfilled') {
          const projects = (myProjectsRes.value as any)?.projects || [];
          setMyProjects(projects);
        } else {
          setMyProjects([]);
        }
        
      } catch (error) {
        console.error('Error loading projects:', error);
        setDiscoveredProjects([]);
        setMyProjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [currentUser, searchTerm, selectedCategory, selectedStatus]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Section */}
      <motion.div 
        className="mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                {activeTab === 'discover' ? 'Discover' : 'My'}
              </span>
              <span className="bg-gradient-to-r from-brand-light to-brand-secondary bg-clip-text text-transparent">
                {" "}Projects
              </span>
            </h1>
            <p className="text-text-secondary text-lg leading-relaxed">
              {activeTab === 'discover' 
                ? 'Find exciting projects and join collaborative teams around the world'
                : 'Manage your projects and track their progress'
              }
            </p>
          </div>
          <Button 
            onClick={() => router.push('/dashboard/projects/create')}
            variant="primary"
            size="lg"
            className="shadow-lg hover:shadow-brand-primary/25"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Project
          </Button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-dark-surface/50 rounded-lg p-1 backdrop-blur-sm border border-dark-border mb-6">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center ${
              activeTab === 'discover'
                ? 'bg-brand-primary text-white shadow-lg'
                : 'text-text-secondary hover:text-white hover:bg-dark-surface/50'
            }`}
          >
            <Search className="w-4 h-4 mr-2" />
            Discover Projects ({discoveredProjects.length})
          </button>
          <button
            onClick={() => setActiveTab('my-projects')}
            className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center ${
              activeTab === 'my-projects'
                ? 'bg-brand-primary text-white shadow-lg'
                : 'text-text-secondary hover:text-white hover:bg-dark-surface/50'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            My Projects ({myProjects.length})
          </button>
        </div>

        {/* Search and Filters - Only for Discover tab */}
        {activeTab === 'discover' && (
          <Card blur className="shadow-xl">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Search projects by title, description, or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<Search className="w-5 h-5" />}
                    className="h-12 text-lg"
                  />
                </div>
                <div className="lg:w-64">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full h-12 px-4 border border-dark-border rounded-xl bg-dark-surface/50 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-text-primary backdrop-blur-sm"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="lg:w-48">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full h-12 px-4 border border-dark-border rounded-xl bg-dark-surface/50 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-text-primary backdrop-blur-sm"
                  >
                    <option value="approved">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="">All Status</option>
                  </select>
                </div>
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                    setSelectedStatus('approved');
                  }}
                  variant="outline"
                  className="h-12 px-6"
                >
                  <Filter className="w-5 h-5 mr-2" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Results Summary */}
      <motion.div 
        className="mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {activeTab === 'discover' ? (
          <p className="text-text-secondary">
            Showing <span className="font-semibold text-text-primary">{discoveredProjects.length}</span> project{discoveredProjects.length !== 1 ? 's' : ''}
            {searchTerm && (
              <span> for "<span className="font-semibold">{searchTerm}</span>"
              </span>
            )}
            {selectedCategory && (
              <span> in <span className="font-semibold">{selectedCategory}</span>
              </span>
            )}
          </p>
        ) : (
          <p className="text-text-secondary">
            You have <span className="font-semibold text-text-primary">{myProjects.length}</span> project{myProjects.length !== 1 ? 's' : ''}
          </p>
        )}
      </motion.div>

      {/* Projects Grid */}
      {(() => {
        const currentProjects = activeTab === 'discover' ? discoveredProjects : myProjects;
        
        if (loading) {
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card blur key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-dark-surface/50 rounded mb-4"></div>
                    <div className="h-4 bg-dark-surface/50 rounded mb-2"></div>
                    <div className="h-4 bg-dark-surface/50 rounded mb-4"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-dark-surface/50 rounded w-20"></div>
                      <div className="h-8 bg-dark-surface/50 rounded w-24"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        }
        
        if (currentProjects.length === 0) {
          return (
            <motion.div 
              className="text-center py-16"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-dark-surface/50 to-dark-card/80 flex items-center justify-center">
                {activeTab === 'discover' ? (
                  <Search className="w-12 h-12 text-text-tertiary" />
                ) : (
                  <Users className="w-12 h-12 text-text-tertiary" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-2">
                {activeTab === 'discover' ? 'No Projects Found' : 'No Projects Yet'}
              </h3>
              <p className="text-text-secondary mb-6 max-w-md mx-auto leading-relaxed">
                {activeTab === 'discover' ? (
                  searchTerm || selectedCategory 
                    ? 'Try adjusting your search terms or filters to find more projects.'
                    : 'No projects are currently available to discover.'
                ) : (
                  'Create your first project and start building amazing things!'
                )}
              </p>
              <Button 
                onClick={() => router.push('/dashboard/projects/create')}
                variant="primary"
                size="lg"
                className="shadow-lg hover:shadow-brand-primary/25"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Project
              </Button>
            </motion.div>
          );
        }
        
        return (
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            {currentProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
              >
                <ProjectCard project={project} isOwner={activeTab === 'my-projects'} />
              </motion.div>
            ))}
          </motion.div>
        );
      })()}
    </div>
  );
};

// Modern ProjectCard Component
const ProjectCard = ({ project, isOwner = false }: { project: Project; isOwner?: boolean }) => {
  const router = useRouter();
  const { userProfile } = useAuth();
  
  const handleApply = () => {
    // Check if user profile is complete
    if (!userProfile?.profileComplete) {
      toast.error('Please complete your profile before applying to projects.');
      router.push('/dashboard/profile');
      return;
    }
    
    // Check if user can apply (not owner, not team member, hasn't applied, project is approved/in-progress)
    const canApply = !project.isOwner && 
                    !project.isTeamMember && 
                    !project.hasApplied && 
                    (project.status === 'approved' || project.status === 'in-progress');
    
    if (!canApply) {
      if (project.isOwner) {
        toast.error('You cannot apply to your own project.');
      } else if (project.isTeamMember) {
        toast.error('You are already a team member of this project.');
      } else if (project.hasApplied) {
        toast.error('You have already applied to this project.');
      } else if (project.status !== 'approved' && project.status !== 'in-progress') {
        toast.error('This project is not currently accepting applications.');
      }
      return;
    }
    
    // Navigate to project details page where they can apply
    toast.success('Redirecting to project details to submit your application...');
    router.push(`/dashboard/projects/${project.id}`);
  };
  
  const getStatusBadge = () => {
    const statusConfig = {
      'open': { bg: 'bg-success-500/20', text: 'text-success-500', label: 'Open' },
      'in-progress': { bg: 'bg-brand-primary/20', text: 'text-brand-primary', label: 'In Progress' },
      'completed': { bg: 'bg-text-tertiary/20', text: 'text-text-tertiary', label: 'Completed' },
      'approved': { bg: 'bg-accent-purple/20', text: 'text-accent-purple', label: 'Approved' },
      'pending': { bg: 'bg-accent-orange/20', text: 'text-accent-orange', label: 'Pending' }
    };
    const config = statusConfig[project.status] || statusConfig.open;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <Card blur className="group hover:shadow-xl hover:shadow-brand-primary/10 transition-all duration-300 border border-dark-border hover:border-brand-primary/30">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-brand-light transition-colors">
              {project.title}
            </h3>
            <div className="flex items-center gap-2 mb-3">
              {getStatusBadge()}
              <span className="text-sm text-text-tertiary">by {project.ownerName}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-text-tertiary mb-1">
              {project.currentTeamSize}/{project.teamSize} members
            </div>
            <div className="w-16 bg-dark-surface/50 rounded-full h-2">
              <div 
                className="bg-gradient-brand h-2 rounded-full" 
                style={{ width: `${(project.currentTeamSize! / project.teamSize) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-text-secondary mb-4 line-clamp-3 leading-relaxed">
          {project.description}
        </p>

        {/* Category */}
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-accent-blue/20 text-accent-blue text-sm font-medium">
            <Code className="w-4 h-4 mr-1" />
            {project.category}
          </span>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {project.skillsRequired?.slice(0, 3).map(skill => (
              <span key={skill} className="px-2 py-1 bg-dark-surface/50 text-text-secondary text-sm rounded">
                {skill}
              </span>
            ))}
            {project.skillsRequired && project.skillsRequired.length > 3 && (
              <span className="px-2 py-1 text-text-tertiary text-sm">
                +{project.skillsRequired.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-dark-border/50">
          <div className="flex items-center gap-4 text-sm text-text-tertiary">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {project.duration || formatTimestamp(project.createdAt)}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {project.applicationCount || 0} applied
            </div>
          </div>
          {isOwner ? (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Navigating to project:', project.id);
                router.push(`/dashboard/projects/${project.id}`);
              }}
            >
              Manage
            </Button>
          ) : (
            (() => {
              // Determine if user can apply
              const canApply = !project.isOwner && 
                              !project.isTeamMember && 
                              !project.hasApplied && 
                              (project.status === 'approved' || project.status === 'in-progress') &&
                              userProfile?.profileComplete;
              
              const getButtonText = () => {
                if (project.hasApplied) return 'Applied';
                if (project.isOwner) return 'Your Project';
                if (project.isTeamMember) return 'Team Member';
                if (!userProfile?.profileComplete) return 'Complete Profile';
                if (project.status === 'completed') return 'Completed';
                if (project.status !== 'approved' && project.status !== 'in-progress') return 'Not Available';
                return 'Apply Now';
              };
              
              const isDisabled = !canApply || project.hasApplied;
              const variant = project.hasApplied || !canApply ? "outline" : "primary";
              
              return (
                <Button 
                  variant={variant}
                  size="sm"
                  disabled={isDisabled}
                  onClick={canApply ? handleApply : undefined}
                  className={!canApply && !project.hasApplied ? 'opacity-60 cursor-not-allowed' : ''}
                >
                  {getButtonText()}
                </Button>
              );
            })()
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Projects;
