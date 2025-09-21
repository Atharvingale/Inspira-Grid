"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Rocket, 
  Target, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  Calendar,
  Star,
  ArrowRight,
  Lightbulb
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Stats {
  myProjects: number;
  teamProjects: number;
  applications: number;
  messages: number;
}

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  ownerName: string;
  teamSize: number;
  skillsRequired?: string[];
}

export default function DashboardPage() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    myProjects: 0,
    teamProjects: 0,
    applications: 0,
    messages: 0
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Load real data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser) return;
      
      try {
        setLoadingData(true);
        
        // Load user's projects and applications in parallel
        const [myProjectsRes, teamProjectsRes, applicationsRes, recentProjectsRes] = await Promise.allSettled([
          apiClient.get('/api/projects/user/my-projects'),
          apiClient.get('/api/projects/user/team-projects'),
          apiClient.get('/api/applications/my-applications'),
          apiClient.get('/api/projects?limit=6&orderBy=createdAt&orderDirection=desc')
        ]);
        
        // Extract data from successful responses
        const myProjects = myProjectsRes.status === 'fulfilled' ? (myProjectsRes.value as any)?.projects || [] : [];
        const teamProjects = teamProjectsRes.status === 'fulfilled' ? (teamProjectsRes.value as any)?.projects || [] : [];
        const applications = applicationsRes.status === 'fulfilled' ? (applicationsRes.value as any)?.applications || [] : [];
        const recentProjects = recentProjectsRes.status === 'fulfilled' ? (recentProjectsRes.value as any)?.projects || [] : [];
        
        // Set statistics
        setStats({
          myProjects: myProjects.length,
          teamProjects: teamProjects.length,
          applications: applications.length,
          messages: 0 // Placeholder for future messages feature
        });
        
        // Set recent projects (limit to 3 for display)
        setRecentProjects(recentProjects.slice(0, 3));
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Set default values on error
        setStats({
          myProjects: 0,
          teamProjects: 0,
          applications: 0,
          messages: 0
        });
        setRecentProjects([]);
      } finally {
        setLoadingData(false);
      }
    };

    if (currentUser) {
      loadDashboardData();
    }
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
            Loading your dashboard...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const quickStats = [
    { 
      label: 'My Projects', 
      value: loadingData ? '...' : stats.myProjects, 
      icon: BarChart3,
      color: 'text-brand-primary',
      bgColor: 'bg-brand-primary/10',
      borderColor: 'border-brand-primary/20',
      link: '/dashboard/projects?filter=my',
      description: 'Projects you own'
    },
    { 
      label: 'Team Projects', 
      value: loadingData ? '...' : stats.teamProjects, 
      icon: Users,
      color: 'text-accent-green',
      bgColor: 'bg-accent-green/10',
      borderColor: 'border-accent-green/20',
      link: '/dashboard/teams',
      description: 'Collaborative work'
    },
    { 
      label: 'Applications', 
      value: loadingData ? '...' : stats.applications, 
      icon: Target,
      color: 'text-accent-blue',
      bgColor: 'bg-accent-blue/10',
      borderColor: 'border-accent-blue/20',
      link: '/dashboard/applications',
      description: 'Pending requests'
    },
    { 
      label: 'Messages', 
      value: loadingData ? '...' : stats.messages, 
      icon: MessageSquare,
      color: 'text-accent-orange',
      bgColor: 'bg-accent-orange/10',
      borderColor: 'border-accent-orange/20',
      link: '/dashboard/messages',
      description: 'Team communications'
    }
  ];

  const recentActivity = [
    {
      action: 'Profile created successfully',
      time: 'Just now',
      icon: '👤',
      color: 'text-green-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Header */}
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
                  Welcome back,{" "}
                </span>
                <span className="bg-gradient-to-r from-brand-primary to-accent-purple bg-clip-text text-transparent">
                  {userProfile?.displayName || currentUser?.email?.split('@')[0]}!
                </span>
                <motion.span
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="inline-block ml-2"
                >
                  👋
                </motion.span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-text-tertiary max-w-2xl"
              >
                Ready to build something amazing? Here's your project overview and latest opportunities.
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                variant="primary"
                size="lg"
                className="shadow-lg hover:shadow-brand-primary/25"
                onClick={() => router.push('/dashboard/profile')}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Complete Profile
              </Button>
            </motion.div>
          </div>
          
          {/* Profile Completion Alert */}
          {!userProfile?.profileComplete && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ delay: 0.6 }}
            >
              <Card className="p-6 border-accent-orange/20 bg-accent-orange/5" blur>
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-accent-orange/10">
                    <Lightbulb className="w-6 h-6 text-accent-orange" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Boost Your Profile Visibility
                    </h3>
                    <p className="text-text-tertiary mb-4">
                      Complete your profile to unlock personalized project recommendations and improve your chances of getting hired by 3x.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/dashboard/profile')}
                      className="border-accent-orange text-accent-orange hover:bg-accent-orange hover:text-white"
                    >
                      Complete Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {quickStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Link href={stat.link}>
                  <Card className={`p-6 hover:shadow-xl hover:shadow-black/10 transition-all duration-300 border ${stat.borderColor} ${stat.bgColor}`} hover>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                        <IconComponent className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <TrendingUp className="w-5 h-5 text-text-tertiary" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-1">
                        {stat.value}
                      </h3>
                      <p className="text-lg font-medium text-text-tertiary mb-1">
                        {stat.label}
                      </p>
                      <p className="text-sm text-text-tertiary">
                        {stat.description}
                      </p>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
            className="lg:col-span-2"
          >
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-gray-700/50 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-brand-primary/10">
                    <Clock className="w-5 h-5 text-brand-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
                </div>
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="p-6">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 rounded-full bg-dark-surface/50/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Clock className="w-8 h-8 text-text-tertiary" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No activity yet</h3>
                    <p className="text-text-tertiary mb-6">Start by creating a project or browsing opportunities</p>
                    <Button
                      variant="primary"
                      onClick={() => router.push('/dashboard/projects')}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Browse Projects
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.3 + index * 0.1 }}
                        className="flex items-center p-4 rounded-lg bg-dark-surface/50/30 hover:bg-dark-surface/50/50 transition-colors"
                      >
                        <div className={`text-2xl mr-4 ${activity.color}`}>
                          {activity.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium mb-1">{activity.action}</p>
                          <p className="text-sm text-text-tertiary flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {activity.time}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.3 }}
          >
            <Card className="mb-6">
              <div className="p-6 border-b border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-accent-purple/10">
                    <Rocket className="w-5 h-5 text-accent-purple" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full justify-start"
                    onClick={() => router.push('/dashboard/projects/create')}
                  >
                    <Plus className="w-5 h-5 mr-3" />
                    Create New Project
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full justify-start border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                    onClick={() => router.push('/dashboard/projects')}
                  >
                    <Search className="w-5 h-5 mr-3" />
                    Browse Projects
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full justify-start hover:bg-dark-surface/50/50"
                    onClick={() => router.push('/dashboard/teams')}
                  >
                    <Users className="w-5 h-5 mr-3" />
                    Find Teams
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full justify-start hover:bg-dark-surface/50/50"
                    onClick={() => router.push('/dashboard/messages')}
                  >
                    <MessageSquare className="w-5 h-5 mr-3" />
                    Messages
                  </Button>
                </div>
              </div>
            </Card>

            {/* Tips Section */}
            <Card className="border-accent-orange/20 bg-accent-orange/5">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 rounded-lg bg-accent-orange/10">
                    <Lightbulb className="w-5 h-5 text-accent-orange" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Getting Started</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { text: "Complete your profile to attract collaborators", completed: true },
                    { text: "Browse projects that match your skills", completed: true },
                    { text: "Create your first project", completed: false },
                    { text: "Connect with team members", completed: false },
                  ].map((tip, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.5 + index * 0.1 }}
                      className="flex items-start space-x-3"
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                        tip.completed ? 'bg-accent-green text-white' : 'bg-dark-surface/50'
                      }`}>
                        {tip.completed ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-dark-surface/50" />
                        )}
                      </div>
                      <p className={`text-sm ${
                        tip.completed ? 'text-text-tertiary line-through' : 'text-white'
                      }`}>
                        {tip.text}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Featured Projects Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="mt-8"
        >
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-gray-700/50 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-brand-primary/10">
                  <Star className="w-5 h-5 text-brand-primary" />
                </div>
                <h2 className="text-xl font-semibold text-white">Recommended Projects</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/projects')}>
                Browse all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="p-6">
              {recentProjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-dark-surface/50/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Search className="w-8 h-8 text-text-tertiary" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No projects available yet</h3>
                  <p className="text-text-tertiary mb-6">
                    Complete your profile to see personalized project recommendations
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => router.push('/dashboard/profile')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Profile
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.5 + index * 0.1 }}
                    >
                      <Card className="p-6 hover:shadow-lg hover:shadow-brand-primary/5" hover>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-semibold text-white hover:text-brand-primary transition-colors">
                            <Link href={`/dashboard/projects/${project.id}`}>
                              {project.title}
                            </Link>
                          </h3>
                          <span className="px-2 py-1 text-xs rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                            {project.category}
                          </span>
                        </div>
                        
                        <p className="text-text-tertiary text-sm mb-4 line-clamp-2">
                          {project.description}
                        </p>
                        
                        <div className="flex justify-between items-center text-sm text-text-tertiary mb-4">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{project.ownerName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{project.teamSize} members</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {project.skillsRequired?.slice(0, 3).map((skill, skillIndex) => (
                            <span
                              key={skillIndex}
                              className="px-2 py-1 text-xs rounded-md bg-dark-surface/50/50 text-text-tertiary border border-gray-600"
                            >
                              {skill}
                            </span>
                          ))}
                          {project.skillsRequired && project.skillsRequired.length > 3 && (
                            <span className="px-2 py-1 text-xs rounded-md bg-dark-surface/50/30 text-text-tertiary">
                              +{project.skillsRequired.length - 3} more
                            </span>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
