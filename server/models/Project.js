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
        status: 'pending', // pending, approved, rejected, completed
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

      // Log index requirements if filters are applied
      if (indexRequirements.length > 1) {
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

      const teamMember = {
        userId,
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

  // Search projects
  async search(searchTerm, filters = {}) {
    try {
      // Note: Firestore doesn't have full-text search, so we'll do basic filtering
      // In production, you might want to use Algolia or similar service
      let query = this.collection;

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter by search term (basic text matching)
      const searchTermLower = searchTerm.toLowerCase();
      const filtered = projects.filter(project => 
        project.title?.toLowerCase().includes(searchTermLower) ||
        project.description?.toLowerCase().includes(searchTermLower) ||
        project.skillsRequired?.some(skill => skill.toLowerCase().includes(searchTermLower))
      );

      return filtered;
    } catch (error) {
      console.error('Error searching projects:', error);
      throw error;
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