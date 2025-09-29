'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Users, 
  Star,
  ArrowRight,
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { formatFirebaseTimestamp } from '@/lib/utils/dateUtils';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'recruiting' | 'completed' | 'paused';
  teamSize: number;
  currentTeamSize: number;
  owner: string;
  role?: string;
  lastActivity: string;
  skills: string[];
  priority: 'high' | 'medium' | 'low';
}

export default function TeamsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-projects' | 'teams'>('my-projects');
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [teamProjects, setTeamProjects] = useState<Project[]>([]);

  useEffect(() => {
    const loadProjectsData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Load user's projects and team projects in parallel
        const [myProjectsRes, teamProjectsRes] = await Promise.allSettled([
          apiClient.get('/api/projects/user/my-projects'),
          apiClient.get('/api/projects/user/team-projects')
        ]);
        
        // Process my projects
        if (myProjectsRes.status === 'fulfilled') {
          const projects = (myProjectsRes.value as any)?.projects || [];
          const mappedProjects = projects.map((project: any) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            category: project.category,
            status: project.status === 'approved' ? 'active' : project.status,
            teamSize: project.teamSize,
            currentTeamSize: project.teamMembers?.length || 1,
            owner: project.ownerName || 'You',
            role: 'Owner',
            lastActivity: project.updatedAt || project.createdAt,
            skills: project.skillsRequired || [],
            priority: 'medium' as const
          }));
          setMyProjects(mappedProjects);
        }
        
        // Process team projects
        if (teamProjectsRes.status === 'fulfilled') {
          const projects = (teamProjectsRes.value as any)?.projects || [];
          const mappedProjects = projects.map((project: any) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            category: project.category,
            status: project.status === 'approved' ? 'active' : project.status,
            teamSize: project.teamSize,
            currentTeamSize: project.teamMembers?.length || 1,
            owner: project.ownerName || 'Unknown',
            role: 'Member',
            lastActivity: project.updatedAt || project.createdAt,
            skills: project.skillsRequired || [],
            priority: 'medium' as const
          }));
          setTeamProjects(mappedProjects);
        }
        
      } catch (error) {
        console.error('Error loading projects data:', error);
        setMyProjects([]);
        setTeamProjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadProjectsData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-darker via-dark to-dark-lighter">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.p
            className="text-text-tertiary text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Loading your teams and projects...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-accent-green" />;
      case 'recruiting':
        return <AlertCircle className="w-4 h-4 text-accent-orange" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-accent-blue" />;
      case 'paused':
        return <XCircle className="w-4 h-4 text-text-tertiary" />;
      default:
        return <Clock className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-accent-green/10 text-accent-green border-accent-green/20';
      case 'recruiting':
        return 'bg-accent-orange/10 text-accent-orange border-accent-orange/20';
      case 'completed':
        return 'bg-accent-blue/10 text-accent-blue border-accent-blue/20';
      case 'paused':
        return 'bg-dark-surface/50/10 text-text-tertiary border-gray-600/20';
      default:
        return 'bg-dark-surface/50/10 text-text-tertiary border-gray-600/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-dark-surface/50/10 text-text-tertiary border-gray-600/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8">
            <div className="mb-6 lg:mb-0">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl lg:text-5xl font-bold mb-4"
              >
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Your Teams &
                </span>
                <span className="bg-gradient-to-r from-brand-primary to-accent-purple bg-clip-text text-transparent">
                  {" "}Projects
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-text-tertiary max-w-2xl"
              >
                Manage your projects and collaborate with talented creators from around the world.
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/dashboard/projects')}
                className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
              >
                <Search className="w-5 h-5 mr-2" />
                Browse Projects
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/dashboard/projects/create')}
                className="shadow-lg hover:shadow-brand-primary/25"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Project
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-dark-surface/50/50 rounded-lg p-1 backdrop-blur-sm border border-gray-700/50">
            <button
              onClick={() => setActiveTab('my-projects')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'my-projects'
                  ? 'bg-brand-primary text-white shadow-lg'
                  : 'text-text-tertiary hover:text-white hover:bg-dark-surface/50/50'
              }`}
            >
              <Briefcase className="w-4 h-4 mr-2 inline" />
              My Projects ({myProjects.length})
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'teams'
                  ? 'bg-brand-primary text-white shadow-lg'
                  : 'text-text-tertiary hover:text-white hover:bg-dark-surface/50/50'
              }`}
            >
              <Users className="w-4 h-4 mr-2 inline" />
              Team Projects ({teamProjects.length})
            </button>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'my-projects' ? (
            <div className="space-y-6">
              {myProjects.length > 0 ? (
                myProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className="p-6 hover:shadow-lg hover:shadow-brand-primary/5" hover>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold text-white hover:text-brand-primary transition-colors cursor-pointer">
                              <Link href={`/dashboard/projects/${project.id}`}>
                                {project.title}
                              </Link>
                            </h3>
                            <span className={`px-3 py-1 text-xs rounded-full border ${getPriorityColor(project.priority)}`}>
                              {project.priority} priority
                            </span>
                          </div>
                          <p className="text-text-tertiary mb-4 max-w-3xl">{project.description}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor(project.status)}`}>
                            {getStatusIcon(project.status)}
                            <span className="text-sm font-medium capitalize">{project.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">
                            Team: {project.currentTeamSize}/{project.teamSize} members
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Briefcase className="w-4 h-4" />
                          <span className="text-sm">{project.category}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Updated {formatFirebaseTimestamp(project.lastActivity, 'recently')}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.skills.map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className="px-3 py-1 text-xs rounded-full bg-dark-surface/50/50 text-text-tertiary border border-gray-600"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                        <div className="text-sm text-text-tertiary">
                          Created by {project.owner}
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Users className="w-4 h-4 mr-1" />
                            Manage Team
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                            className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                          >
                            View Project
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="p-12 text-center">
                    <div className="p-4 rounded-full bg-dark-surface/50/50 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                      <Briefcase className="w-10 h-10 text-text-tertiary" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-4">No projects yet</h3>
                    <p className="text-text-tertiary mb-8 max-w-md mx-auto">
                      Start your journey by creating your first project and building an amazing team.
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => router.push('/dashboard/projects/create')}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Your First Project
                    </Button>
                  </Card>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {teamProjects.length > 0 ? (
                teamProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className="p-6 hover:shadow-lg hover:shadow-brand-primary/5" hover>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold text-white hover:text-brand-primary transition-colors cursor-pointer">
                              <Link href={`/dashboard/projects/${project.id}`}>
                                {project.title}
                              </Link>
                            </h3>
                            {project.role && (
                              <span className="px-3 py-1 text-xs rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                                {project.role}
                              </span>
                            )}
                            <span className={`px-3 py-1 text-xs rounded-full border ${getPriorityColor(project.priority)}`}>
                              {project.priority} priority
                            </span>
                          </div>
                          <p className="text-text-tertiary mb-4 max-w-3xl">{project.description}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor(project.status)}`}>
                            {getStatusIcon(project.status)}
                            <span className="text-sm font-medium capitalize">{project.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">
                            Team: {project.currentTeamSize}/{project.teamSize} members
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Briefcase className="w-4 h-4" />
                          <span className="text-sm">{project.category}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Updated {formatFirebaseTimestamp(project.lastActivity, 'recently')}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.skills.map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className="px-3 py-1 text-xs rounded-full bg-dark-surface/50/50 text-text-tertiary border border-gray-600"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                        <div className="text-sm text-text-tertiary">
                          Created by {project.owner}
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Star className="w-4 h-4 mr-1" />
                            Add to Favorites
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                            className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                          >
                            View Project
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="p-12 text-center">
                    <div className="p-4 rounded-full bg-dark-surface/50/50 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                      <Users className="w-10 h-10 text-text-tertiary" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-4">No team projects yet</h3>
                    <p className="text-text-tertiary mb-8 max-w-md mx-auto">
                      Join exciting projects and collaborate with talented creators from around the world.
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => router.push('/dashboard/projects')}
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Browse Available Projects
                    </Button>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
