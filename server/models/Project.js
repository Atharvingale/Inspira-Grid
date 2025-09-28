const admin = require('../config/firebase');

class Project {
  constructor() {
    this.db = admin.firestore();
    this.collection = this.db.collection('projects');
  }

  // Create a new project
  async create(projectData) {
    try {
      const docRef = this.collection.doc();
      const project = {
        id: docRef.id,
        ...projectData,
        status: 'approved', // Projects are directly approved without admin review
        applicationCount: 0,
        teamMembers: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await docRef.set(project);
      return { id: docRef.id, ...project };
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Get project by ID
  async getById(projectId) {
    try {
      const doc = await this.collection.doc(projectId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting project:', error);
      throw error;
    }
  }

  // Get all projects with filters
  async getAll(filters = {}) {
    try {
      let query = this.collection;
      const indexRequirements = [];

      // Apply filters and track index requirements
      if (filters.status) {
        query = query.where('status', '==', filters.status);
        indexRequirements.push('status');
      }
      if (filters.category) {
        query = query.where('category', '==', filters.category);
        indexRequirements.push('category');
      }
      if (filters.skills && filters.skills.length > 0) {
        query = query.where('skillsRequired', 'array-contains-any', filters.skills);
        indexRequirements.push('skillsRequired');
      }
      if (filters.ownerId) {
        query = query.where('ownerId', '==', filters.ownerId);
        indexRequirements.push('ownerId');
      }

      // Apply sorting
      const orderBy = filters.orderBy || 'createdAt';
      const orderDirection = filters.orderDirection || 'desc';
      query = query.orderBy(orderBy, orderDirection);
      indexRequirements.push(`${orderBy} (${orderDirection})`);

      // Apply limit
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      // Log index requirements if filters are applied (debug only)
      if (indexRequirements.length > 1 && process.env.FIRESTORE_INDEX_DEBUG === 'true') {
        console.log('\n🔍 FIRESTORE INDEX NEEDED:');
        console.log('Collection: projects');
        console.log('Fields:', indexRequirements.join(', '));
        console.log('Query filters:', JSON.stringify(filters, null, 2));
        
        // Generate index configuration
        const indexConfig = {
          collectionGroup: 'projects',
          queryScope: 'COLLECTION',
          fields: []
        };
        
        // Add filter fields
        indexRequirements.forEach(field => {
          if (field.includes('(')) {
            const [fieldName, direction] = field.split(' (');
            indexConfig.fields.push({
              fieldPath: fieldName,
              order: direction.replace(')', '').toUpperCase()
            });
          } else {
            indexConfig.fields.push({
              fieldPath: field,
              order: 'ASCENDING'
            });
          }
        });
        
        console.log('\n📋 Add this to firestore.indexes.json:');
        console.log(JSON.stringify(indexConfig, null, 2));
        console.log('\n' + '='.repeat(60) + '\n');
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting projects:', error);
      
      // Check if it's an index error
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.log('\n❌ FIRESTORE INDEX ERROR:');
        console.log('This query requires a database index.');
        console.log('Error:', error.message);
        
        // Extract index URL from error message if available
        const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
        if (urlMatch) {
          console.log('\n🔗 Create index at:', urlMatch[0]);
        }
        console.log('\n' + '='.repeat(60) + '\n');
      }
      
      throw error;
    }
  }

  // Update project
  async update(projectId, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await this.collection.doc(projectId).update(updateData);
      return this.getById(projectId);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Delete project
  async delete(projectId) {
    try {
      await this.collection.doc(projectId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // Add team member to project
  async addTeamMember(projectId, userId, role = 'member') {
    try {
      const project = await this.getById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Get user details to include name in team member data
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : null;

      const teamMember = {
        userId,
        name: userData?.displayName || 'Unknown User',
        role,
        joinedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.collection.doc(projectId).update({
        teamMembers: admin.firestore.FieldValue.arrayUnion(teamMember),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return this.getById(projectId);
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  }

  // Remove team member from project
  async removeTeamMember(projectId, userId) {
    try {
      const project = await this.getById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const updatedMembers = project.teamMembers.filter(member => member.userId !== userId);

      await this.collection.doc(projectId).update({
        teamMembers: updatedMembers,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return this.getById(projectId);
    } catch (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  }

  // Get projects by team member
  async getByTeamMember(userId) {
    try {
      if (process.env.FIRESTORE_INDEX_DEBUG === 'true') {
        console.log('\n🔍 FIRESTORE INDEX NEEDED:');
        console.log('Collection: projects');
        console.log('Fields: teamMembers (array-contains), updatedAt (desc)');
        console.log('Query: teamMembers array-contains userId + orderBy updatedAt desc');
        
        const indexConfig = {
          collectionGroup: 'projects',
          queryScope: 'COLLECTION',
          fields: [
            {
              fieldPath: 'teamMembers',
              arrayConfig: 'CONTAINS'
            },
            {
              fieldPath: 'updatedAt',
              order: 'DESCENDING'
            }
          ]
        };
        
        console.log('\n📋 Add this to firestore.indexes.json:');
        console.log(JSON.stringify(indexConfig, null, 2));
        console.log('\n' + '='.repeat(60) + '\n');
      }
      
      const snapshot = await this.collection
        .where('teamMembers', 'array-contains', { userId })
        .orderBy('updatedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting projects by team member:', error);
      
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.log('\n❌ FIRESTORE INDEX ERROR:');
        console.log('This query requires a database index for array-contains + orderBy.');
        console.log('Error:', error.message);
        console.log('\n' + '='.repeat(60) + '\n');
      }
      
      throw error;
    }
  }

  // Advanced search projects with ranking
  async search(searchTerm, filters = {}) {
    try {
      console.log('🔍 Advanced search:', { searchTerm, filters });
      
      // Get base dataset with filters
      let query = this.collection;
      
      // Apply filters first to reduce dataset
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }
      if (filters.difficulty) {
        query = query.where('difficulty', '==', filters.difficulty);
      }
      if (filters.isRemote !== undefined) {
        query = query.where('isRemote', '==', filters.isRemote);
      }
      if (filters.hasGitHub !== undefined) {
        if (filters.hasGitHub) {
          query = query.where('githubRepository', '!=', null);
        } else {
          query = query.where('githubRepository', '==', null);
        }
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(filters.limit || 100)
        .get();

      let projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Apply text search with relevance scoring
      if (searchTerm && searchTerm.trim()) {
        const searchResults = this.searchWithRelevanceScoring(projects, searchTerm);
        projects = searchResults;
      }
      
      // Apply additional filters that can't be done in Firestore
      if (filters.skills && filters.skills.length > 0) {
        projects = projects.filter(project => 
          filters.skills.some(skill => 
            project.skillsRequired?.some(reqSkill => 
              reqSkill.toLowerCase().includes(skill.toLowerCase())
            )
          )
        );
      }
      
      if (filters.teamSizeMin) {
        projects = projects.filter(project => project.teamSize >= filters.teamSizeMin);
      }
      
      if (filters.teamSizeMax) {
        projects = projects.filter(project => project.teamSize <= filters.teamSizeMax);
      }
      
      // Sort results
      projects = this.sortSearchResults(projects, filters.sortBy || 'relevance');
      
      console.log(`🎯 Search completed: ${projects.length} results`);
      return projects.slice(0, filters.limit || 50);
    } catch (error) {
      console.error('Error searching projects:', error);
      throw error;
    }
  }

  // Search with relevance scoring
  searchWithRelevanceScoring(projects, searchTerm) {
    const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
    
    const scoredProjects = projects.map(project => {
      let score = 0;
      const title = (project.title || '').toLowerCase();
      const description = (project.description || '').toLowerCase();
      const skills = (project.skillsRequired || []).map(s => s.toLowerCase());
      const category = (project.category || '').toLowerCase();
      
      searchTerms.forEach(term => {
        // Title matches (highest weight)
        if (title.includes(term)) {
          score += title === term ? 100 : (title.startsWith(term) ? 80 : 50);
        }
        
        // Category matches
        if (category.includes(term)) {
          score += 40;
        }
        
        // Skills matches
        skills.forEach(skill => {
          if (skill.includes(term)) {
            score += skill === term ? 60 : 30;
          }
        });
        
        // Description matches (lower weight)
        if (description.includes(term)) {
          score += 20;
        }
        
        // Owner name matches
        if ((project.ownerName || '').toLowerCase().includes(term)) {
          score += 15;
        }
      });
      
      // Boost score for recent projects
      const daysOld = (Date.now() - new Date(project.createdAt?.seconds ? project.createdAt.seconds * 1000 : project.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld < 7) score += 10;
      else if (daysOld < 30) score += 5;
      
      // Boost score for projects with GitHub
      if (project.githubRepository) score += 5;
      
      // Boost score for featured projects
      if (project.featured) score += 10;
      
      return { ...project, relevanceScore: score };
    });
    
    // Filter out projects with no relevance and sort by score
    return scoredProjects
      .filter(project => project.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  // Sort search results by different criteria
  sortSearchResults(projects, sortBy) {
    switch (sortBy) {
      case 'newest':
        return projects.sort((a, b) => {
          const dateA = new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt);
          const dateB = new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt);
          return dateB - dateA;
        });
      
      case 'oldest':
        return projects.sort((a, b) => {
          const dateA = new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt);
          const dateB = new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt);
          return dateA - dateB;
        });
      
      case 'mostApplications':
        return projects.sort((a, b) => (b.applicationCount || 0) - (a.applicationCount || 0));
      
      case 'teamSize':
        return projects.sort((a, b) => (b.teamSize || 0) - (a.teamSize || 0));
      
      case 'alphabetical':
        return projects.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      
      case 'relevance':
      default:
        // If no relevance score, sort by newest
        return projects.sort((a, b) => {
          if (a.relevanceScore && b.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
          }
          const dateA = new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt);
          const dateB = new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt);
          return dateB - dateA;
        });
    }
  }

  // Link GitHub repository to project
  async linkGitHubRepository(projectId, repositoryData) {
    try {
      const project = await this.getById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const githubRepo = {
        repositoryUrl: repositoryData.repositoryUrl,
        repositoryName: repositoryData.repositoryName,
        description: repositoryData.description,
        linkedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.collection.doc(projectId).update({
        githubRepository: githubRepo,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return this.getById(projectId);
    } catch (error) {
      console.error('Error linking GitHub repository:', error);
      throw error;
    }
  }

  // Unlink GitHub repository from project
  async unlinkGitHubRepository(projectId) {
    try {
      const project = await this.getById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      await this.collection.doc(projectId).update({
        githubRepository: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return this.getById(projectId);
    } catch (error) {
      console.error('Error unlinking GitHub repository:', error);
      throw error;
    }
  }

  // Get projects with GitHub repositories
  async getProjectsWithGitHub() {
    try {
      const snapshot = await this.collection
        .where('githubRepository', '!=', null)
        .orderBy('updatedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting projects with GitHub:', error);
      throw error;
    }
  }

  // Get trending projects (high activity in last 7 days)
  async getTrendingProjects(limit = 10) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Get recent projects with activity
      const snapshot = await this.collection
        .where('status', '==', 'approved')
        .where('updatedAt', '>=', sevenDaysAgo)
        .orderBy('updatedAt', 'desc')
        .limit(limit * 3) // Get more to filter and rank
        .get();

      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calculate trending score based on recent activity
      const trendingProjects = projects.map(project => {
        let trendingScore = 0;
        const daysSinceUpdate = (Date.now() - new Date(project.updatedAt?.seconds ? project.updatedAt.seconds * 1000 : project.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        
        // Recent activity bonus
        if (daysSinceUpdate < 1) trendingScore += 50;
        else if (daysSinceUpdate < 3) trendingScore += 30;
        else if (daysSinceUpdate < 7) trendingScore += 10;
        
        // Application activity bonus
        trendingScore += (project.applicationCount || 0) * 5;
        
        // Team growth bonus
        if (project.teamMembers && project.teamMembers.length > 1) {
          trendingScore += project.teamMembers.length * 3;
        }
        
        // GitHub activity bonus
        if (project.githubRepository) trendingScore += 10;
        
        return { ...project, trendingScore };
      });
      
      return trendingProjects
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting trending projects:', error);
      throw error;
    }
  }
  
  // Get recommended projects for a user based on their skills
  async getRecommendedProjects(userSkills = [], userInterests = [], limit = 10) {
    try {
      if (!userSkills.length && !userInterests.length) {
        // Return trending projects if no user data
        return this.getTrendingProjects(limit);
      }
      
      const snapshot = await this.collection
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .limit(100) // Get larger dataset for better recommendations
        .get();

      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calculate recommendation score
      const recommendedProjects = projects.map(project => {
        let recommendationScore = 0;
        
        // Skill matching (highest weight)
        const projectSkills = project.skillsRequired || [];
        const matchingSkills = projectSkills.filter(skill => 
          userSkills.some(userSkill => 
            skill.toLowerCase().includes(userSkill.toLowerCase()) ||
            userSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
        recommendationScore += matchingSkills.length * 40;
        
        // Category/interest matching
        if (userInterests.includes(project.category)) {
          recommendationScore += 30;
        }
        
        // Diversity bonus (different skills to learn)
        const newSkills = projectSkills.filter(skill => 
          !userSkills.some(userSkill => 
            skill.toLowerCase().includes(userSkill.toLowerCase())
          )
        );
        if (newSkills.length > 0 && newSkills.length <= 3) {
          recommendationScore += newSkills.length * 10;
        }
        
        // Freshness bonus
        const daysOld = (Date.now() - new Date(project.createdAt?.seconds ? project.createdAt.seconds * 1000 : project.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) recommendationScore += 15;
        else if (daysOld < 30) recommendationScore += 5;
        
        // Activity bonus
        recommendationScore += (project.applicationCount || 0) * 2;
        
        // GitHub bonus
        if (project.githubRepository) recommendationScore += 5;
        
        return { ...project, recommendationScore };
      });
      
      return recommendedProjects
        .filter(project => project.recommendationScore > 0)
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recommended projects:', error);
      throw error;
    }
  }
  
  // Get projects by multiple categories
  async getProjectsByCategories(categories, limit = 20) {
    try {
      if (!categories || categories.length === 0) {
        return [];
      }
      
      // Firestore doesn't support 'in' with more than 10 items
      const categoriesToQuery = categories.slice(0, 10);
      
      const snapshot = await this.collection
        .where('status', '==', 'approved')
        .where('category', 'in', categoriesToQuery)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting projects by categories:', error);
      throw error;
    }
  }
  
  // Get similar projects to a given project
  async getSimilarProjects(projectId, limit = 5) {
    try {
      const sourceProject = await this.getById(projectId);
      if (!sourceProject) {
        return [];
      }
      
      const snapshot = await this.collection
        .where('status', '==', 'approved')
        .where('category', '==', sourceProject.category)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const projects = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(project => project.id !== projectId); // Exclude the source project
      
      // Calculate similarity score
      const similarProjects = projects.map(project => {
        let similarityScore = 0;
        
        // Same category bonus
        if (project.category === sourceProject.category) {
          similarityScore += 30;
        }
        
        // Skills overlap
        const sourceSkills = sourceProject.skillsRequired || [];
        const projectSkills = project.skillsRequired || [];
        const commonSkills = sourceSkills.filter(skill => 
          projectSkills.some(pSkill => pSkill.toLowerCase() === skill.toLowerCase())
        );
        similarityScore += commonSkills.length * 20;
        
        // Similar team size
        const sizeDiff = Math.abs((project.teamSize || 0) - (sourceProject.teamSize || 0));
        if (sizeDiff <= 2) similarityScore += 10;
        
        // Both have GitHub or both don't
        if (!!project.githubRepository === !!sourceProject.githubRepository) {
          similarityScore += 5;
        }
        
        return { ...project, similarityScore };
      });
      
      return similarProjects
        .filter(project => project.similarityScore > 0)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting similar projects:', error);
      throw error;
    }
  }

  // Get project statistics
  async getStats() {
    try {
      const [totalSnapshot, approvedSnapshot, pendingSnapshot, githubSnapshot] = await Promise.all([
        this.collection.get(),
        this.collection.where('status', '==', 'approved').get(),
        this.collection.where('status', '==', 'pending').get(),
        this.collection.where('githubRepository', '!=', null).get()
      ]);

      return {
        total: totalSnapshot.size,
        approved: approvedSnapshot.size,
        pending: pendingSnapshot.size,
        rejected: totalSnapshot.size - approvedSnapshot.size - pendingSnapshot.size,
        withGithub: githubSnapshot.size
      };
    } catch (error) {
      console.error('Error getting project stats:', error);
      throw error;
    }
  }
}

module.exports = new Project();