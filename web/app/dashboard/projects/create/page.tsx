'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useAuth } from '@/lib/AuthContext';
import { apiClient as api } from '@/lib/api';

interface FormData {
  title: string;
  description: string;
  category: string;
  skillsRequired: string[];
  teamSize: number;
  duration: string;
  budget: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  skillsRequired?: string;
  teamSize?: string;
}

const CreateProject = () => {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    skillsRequired: [],
    teamSize: 3,
    duration: '',
    budget: '',
  });

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

  const commonSkills = [
    'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript',
    'Java', 'C++', 'HTML', 'CSS', 'PHP', 'Go', 'Rust',
    'Vue.js', 'Angular', 'Django', 'Flask', 'Express',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'AWS', 'Docker', 'Kubernetes', 'Git', 'Linux',
    'UI/UX Design', 'Figma', 'Adobe Creative Suite',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
    'Mobile Development', 'React Native', 'Flutter', 'Swift', 'Kotlin',
    'Game Development', 'Unity', 'Unreal Engine', 'Blender'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !selectedSkills.includes(skillInput.trim())) {
      const newSkills = [...selectedSkills, skillInput.trim()];
      setSelectedSkills(newSkills);
      setFormData(prev => ({ ...prev, skillsRequired: newSkills }));
      setSkillInput('');
      
      if (errors.skillsRequired) {
        setErrors(prev => ({ ...prev, skillsRequired: '' }));
      }
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const newSkills = selectedSkills.filter(skill => skill !== skillToRemove);
    setSelectedSkills(newSkills);
    setFormData(prev => ({ ...prev, skillsRequired: newSkills }));
  };

  const handleSkillSelect = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      const newSkills = [...selectedSkills, skill];
      setSelectedSkills(newSkills);
      setFormData(prev => ({ ...prev, skillsRequired: newSkills }));
      
      if (errors.skillsRequired) {
        setErrors(prev => ({ ...prev, skillsRequired: '' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Project title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (formData.skillsRequired.length === 0) {
      newErrors.skillsRequired = 'At least one skill is required';
    } else if (formData.skillsRequired.length > 10) {
      newErrors.skillsRequired = 'Maximum 10 skills allowed';
    }

    if (formData.teamSize < 2 || formData.teamSize > 20) {
      newErrors.teamSize = 'Team size must be between 2 and 20 members';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    try {
      setLoading(true);
      
      const projectData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        skillsRequired: formData.skillsRequired,
        teamSize: parseInt(formData.teamSize.toString()),
        duration: formData.duration.trim(),
        budget: formData.budget.trim(),
      };

      await api.post('/api/projects', projectData);
      
      toast.success('Project created successfully! It will be reviewed by admins.');
      router.push('/dashboard/projects');
    } catch (error: any) {
      console.error('Error creating project:', error);
      
      if (error.response?.data?.details) {
        // Handle validation errors from backend
        const backendErrors: FormErrors = {};
        error.response.data.details.forEach((err: any) => {
          backendErrors[err.param as keyof FormErrors] = err.msg;
        });
        setErrors(backendErrors);
        toast.error('Please fix the validation errors');
      } else {
        toast.error(error.response?.data?.message || 'Failed to create project');
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if profile is complete
  if (!userProfile?.profileComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-text-primary">Create New Project</h1>
            <p className="text-text-secondary mt-1">Start a new collaborative project</p>
          </div>
          
          <div className="bg-accent-orange/10 border border-accent-orange/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-accent-orange" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-accent-orange">Complete Your Profile First</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  You need to complete your profile before creating projects. This helps other 
                  developers understand your background and skills.
                </p>
                <div className="mt-4">
                  <Link
                    href="/dashboard/profile"
                    className="bg-accent-orange/20 px-4 py-2 rounded-xl text-sm font-medium text-accent-orange hover:bg-accent-orange/30 transition-colors border border-accent-orange/30"
                  >
                    Complete Profile Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Create New Project</h1>
          <p className="text-text-secondary mt-1">Start a new collaborative project and find your team</p>
        </div>
        
        <div className="bg-dark-card/80 backdrop-blur-sm border border-dark-border rounded-2xl shadow-xl">
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                  {/* Basic Information */}
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Basic Information</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Project Title *
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          placeholder="Enter your project title"
                          maxLength={100}
                          className={`w-full px-4 py-3 bg-dark-surface/50 border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all backdrop-blur-sm ${
                            errors.title ? 'border-red-500' : 'border-dark-border'
                          }`}
                        />
                        {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
                        <p className="text-text-tertiary text-sm mt-1">
                          Choose a clear, descriptive title for your project
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Description *
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Describe your project, its goals, and what you're looking to build..."
                          rows={5}
                          maxLength={2000}
                          className={`w-full px-4 py-3 bg-dark-surface/50 border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all backdrop-blur-sm ${
                            errors.description ? 'border-red-500' : 'border-dark-border'
                          }`}
                        />
                        {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
                        <p className="text-text-tertiary text-sm mt-1">
                          {formData.description.length}/2000 characters. Be detailed about your vision and goals.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">
                            Category *
                          </label>
                          <select
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-3 bg-dark-surface/50 border rounded-xl text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all backdrop-blur-sm ${
                              errors.category ? 'border-red-500' : 'border-dark-border'
                            }`}
                          >
                            <option value="" className="bg-dark-surface text-white">Select a category</option>
                            {categories.map(category => (
                              <option key={category} value={category} className="bg-dark-surface text-white">{category}</option>
                            ))}
                          </select>
                          {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">
                            Team Size *
                          </label>
                          <input
                            type="number"
                            name="teamSize"
                            value={formData.teamSize}
                            onChange={handleInputChange}
                            min={2}
                            max={20}
                            className={`w-full px-4 py-3 bg-dark-surface/50 border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all backdrop-blur-sm ${
                              errors.teamSize ? 'border-red-500' : 'border-dark-border'
                            }`}
                          />
                          {errors.teamSize && <p className="text-red-400 text-sm mt-1">{errors.teamSize}</p>}
                          <p className="text-text-tertiary text-sm mt-1">
                            How many people do you need in total? (including yourself)
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Required Skills *
                        </label>
                        
                        {/* Skills Input */}
                        <div className="flex mb-2">
                          <input
                            type="text"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            placeholder="Add a skill..."
                            className="flex-1 px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-l-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all backdrop-blur-sm"
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
                            className="px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-r-xl hover:shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 transition-all duration-200"
                          >
                            Add
                          </button>
                        </div>

                        {/* Common Skills */}
                        <div className="mb-2">
                          <p className="text-sm text-text-secondary mb-2">Common skills:</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {commonSkills.slice(0, 15).map(skill => (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => handleSkillSelect(skill)}
                                disabled={selectedSkills.includes(skill)}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-colors backdrop-blur-sm ${
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
                        <div className="flex flex-wrap gap-2 mb-2">
                          {selectedSkills.map(skill => (
                            <span
                              key={skill}
                              className="inline-flex items-center px-3 py-1.5 bg-brand-primary/20 text-brand-light rounded-full text-sm border border-brand-primary/30 backdrop-blur-sm"
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
                        
                        {errors.skillsRequired && <p className="text-red-400 text-sm mt-1">{errors.skillsRequired}</p>}
                        <p className="text-text-tertiary text-sm mt-1">
                          Choose 1-10 skills that team members should have
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Additional Details</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Duration
                        </label>
                        <input
                          type="text"
                          name="duration"
                          value={formData.duration}
                          onChange={handleInputChange}
                          placeholder="e.g., 3 months, 6 weeks"
                          className="w-full px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all backdrop-blur-sm"
                        />
                        <p className="text-text-tertiary text-sm mt-1">
                          Expected project timeline
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Budget
                        </label>
                        <input
                          type="text"
                          name="budget"
                          value={formData.budget}
                          onChange={handleInputChange}
                          placeholder="e.g., $500, Unpaid, Revenue share"
                          className="w-full px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all backdrop-blur-sm"
                        />
                        <p className="text-text-tertiary text-sm mt-1">
                          Budget or compensation details
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 disabled:opacity-50 transition-all duration-200"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating Project...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Create Project
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/projects')}
                      disabled={loading}
                      className="px-6 py-3 border border-dark-border text-text-secondary rounded-xl hover:bg-dark-surface/50 hover:text-text-primary disabled:opacity-50 transition-all duration-200 backdrop-blur-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                
                <div className="lg:col-span-1">
                  <div className="bg-dark-surface/50 backdrop-blur-sm border border-dark-border rounded-2xl p-6 sticky top-4">
                    <h3 className="font-semibold text-text-primary mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Project Guidelines
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center text-text-secondary">
                        <svg className="w-4 h-4 mr-2 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Choose a clear, specific title
                      </li>
                      <li className="flex items-center text-text-secondary">
                        <svg className="w-4 h-4 mr-2 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Describe your project goals clearly
                      </li>
                      <li className="flex items-center text-text-secondary">
                        <svg className="w-4 h-4 mr-2 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Select relevant skills needed
                      </li>
                      <li className="flex items-center text-text-secondary">
                        <svg className="w-4 h-4 mr-2 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Set realistic team size
                      </li>
                      <li className="flex items-center text-text-secondary">
                        <svg className="w-4 h-4 mr-2 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Projects require admin approval
                      </li>
                      <li className="flex items-center text-text-secondary">
                        <svg className="w-4 h-4 mr-2 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        You'll manage applications after approval
                      </li>
                    </ul>
                    
                    <hr className="my-4 border-dark-border" />
                    
                    <h3 className="font-semibold text-text-primary mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-accent-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Tips for Success
                    </h3>
                    <ul className="space-y-1 text-sm text-text-tertiary">
                      <li>• Be specific about what you're building</li>
                      <li>• Explain the value and impact</li>
                      <li>• List the technologies you'll use</li>
                      <li>• Define roles and responsibilities</li>
                      <li>• Set clear milestones and timeline</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;
