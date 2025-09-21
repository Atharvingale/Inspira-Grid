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
import { Card, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

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
        
        // Build query parameters
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (selectedCategory) params.append('category', selectedCategory);
        params.append('limit', '50'); // Load more projects for better browsing
        params.append('status', 'approved'); // Only show approved projects
        
        const queryString = params.toString();
        const url = `/api/projects${queryString ? '?' + queryString : ''}`;
        
        const response = await apiClient.get(url);
        const fetchedProjects = (response as any)?.projects || [];
        
        setFilteredProjects(fetchedProjects);
        
      } catch (error) {
        console.error('Error loading projects:', error);
        setFilteredProjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [currentUser, searchTerm, selectedCategory]);

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div 
          className="mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-text-primary to-brand-light bg-clip-text text-transparent mb-2">
                Discover Projects
              </h1>
              <p className="text-text-secondary text-lg">
                Find exciting projects and join collaborative teams
              </p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard/projects/create')}
              variant="primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Project
            </Button>
          </div>

          {/* Search and Filters */}
          <Card className="backdrop-blur-sm bg-dark-card/80 border border-dark-border shadow-xl">
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
                    className="w-full h-12 px-4 border border-dark-border rounded-xl bg-dark-surface/50 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-white backdrop-blur-sm"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
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
        </motion.div>

        {/* Results Summary */}
        <motion.div 
          className="mb-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <p className="text-text-secondary">
            Showing <span className="font-semibold text-text-primary">{filteredProjects.length}</span> project{filteredProjects.length !== 1 ? 's' : ''}
            {searchTerm && (
              <span> for "<span className="font-semibold">{searchTerm}</span>"
              </span>
            )}
            {selectedCategory && (
              <span> in <span className="font-semibold">{selectedCategory}</span>
              </span>
            )}
          </p>
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
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
        ) : filteredProjects.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-dark-surface/50 to-dark-card/80 flex items-center justify-center">
              <Search className="w-12 h-12 text-text-tertiary" />
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">No Projects Found</h3>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              {searchTerm || selectedCategory 
                ? 'Try adjusting your search terms or filters to find more projects.'
                : 'No projects are currently available. Be the first to create one!'}
            </p>
            <Button 
              onClick={() => router.push('/dashboard/projects/create')}
              variant="primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Project
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
              >
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Modern ProjectCard Component
const ProjectCard = ({ project }: { project: Project }) => {
  const getStatusBadge = () => {
    const statusConfig = {
      'open': { bg: 'bg-success-500/20', text: 'text-success-500', label: 'Open' },
      'in-progress': { bg: 'bg-brand-primary/20', text: 'text-brand-primary', label: 'In Progress' },
      'completed': { bg: 'bg-text-tertiary/20', text: 'text-text-tertiary', label: 'Completed' },
      'approved': { bg: 'bg-accent-purple/20', text: 'text-accent-purple', label: 'Approved' }
    };
    const config = statusConfig[project.status] || statusConfig.open;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 bg-dark-card/80 backdrop-blur-sm border border-dark-border hover:border-brand-primary/30">
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
                className="bg-gradient-to-r from-brand-primary to-brand-secondary h-2 rounded-full" 
                style={{ width: `${(project.currentTeamSize! / project.teamSize) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-text-secondary mb-4 line-clamp-3">
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
              {project.duration}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {project.applicationCount} applied
            </div>
          </div>
          <Button 
            variant="primary"
            disabled={project.hasApplied}
          >
            {project.hasApplied ? 'Applied' : 'Apply Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Projects;
