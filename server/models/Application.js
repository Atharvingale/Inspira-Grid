const admin = require('../config/firebase');

class Application {
  constructor() {
    this.db = admin.firestore();
    this.collection = this.db.collection('applications');
  }

  // Create a new application
  async create(applicationData) {
    try {
      const docRef = this.collection.doc();
      const application = {
        id: docRef.id,
        ...applicationData,
        status: 'pending', // pending, accepted, rejected
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await docRef.set(application);
      
      // Increment application count in project
      const projectRef = this.db.collection('projects').doc(applicationData.projectId);
      await projectRef.update({
        applicationCount: admin.firestore.FieldValue.increment(1)
      });

      return { id: docRef.id, ...application };
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  }

  // Get application by ID
  async getById(applicationId) {
    try {
      const doc = await this.collection.doc(applicationId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting application:', error);
      throw error;
    }
  }

  // Get applications by project
  async getByProject(projectId, status = null) {
    try {
      let query = this.collection.where('projectId', '==', projectId);
      const indexFields = ['projectId'];
      
      if (status) {
        query = query.where('status', '==', status);
        indexFields.push('status');
      }

      query = query.orderBy('createdAt', 'desc');
      indexFields.push('createdAt (desc)');

      // Log index requirements
      if (indexFields.length > 1) {
        console.log('\n🔍 FIRESTORE INDEX NEEDED:');
        console.log('Collection: applications');
        console.log('Fields:', indexFields.join(', '));
        
        const indexConfig = {
          collectionGroup: 'applications',
          queryScope: 'COLLECTION',
          fields: [
            { fieldPath: 'projectId', order: 'ASCENDING' }
          ]
        };
        
        if (status) {
          indexConfig.fields.push({ fieldPath: 'status', order: 'ASCENDING' });
        }
        
        indexConfig.fields.push({ fieldPath: 'createdAt', order: 'DESCENDING' });
        
        console.log('\n📋 Add this to firestore.indexes.json:');
        console.log(JSON.stringify(indexConfig, null, 2));
        console.log('\n' + '='.repeat(60) + '\n');
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting applications by project:', error);
      
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.log('\n❌ FIRESTORE INDEX ERROR:');
        console.log('This query requires a database index.');
        console.log('Error:', error.message);
        console.log('\n' + '='.repeat(60) + '\n');
      }
      
      throw error;
    }
  }

  // Get applications by user
  async getByUser(userId, status = null) {
    try {
      let query = this.collection.where('applicantId', '==', userId);
      const indexFields = ['applicantId'];
      
      if (status) {
        query = query.where('status', '==', status);
        indexFields.push('status');
      }

      query = query.orderBy('createdAt', 'desc');
      indexFields.push('createdAt (desc)');

      // Log index requirements
      if (indexFields.length > 1) {
        console.log('\n🔍 FIRESTORE INDEX NEEDED:');
        console.log('Collection: applications');
        console.log('Fields:', indexFields.join(', '));
        
        const indexConfig = {
          collectionGroup: 'applications',
          queryScope: 'COLLECTION',
          fields: [
            { fieldPath: 'applicantId', order: 'ASCENDING' }
          ]
        };
        
        if (status) {
          indexConfig.fields.push({ fieldPath: 'status', order: 'ASCENDING' });
        }
        
        indexConfig.fields.push({ fieldPath: 'createdAt', order: 'DESCENDING' });
        
        console.log('\n📋 Add this to firestore.indexes.json:');
        console.log(JSON.stringify(indexConfig, null, 2));
        console.log('\n' + '='.repeat(60) + '\n');
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting applications by user:', error);
      
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.log('\n❌ FIRESTORE INDEX ERROR:');
        console.log('This query requires a database index.');
        console.log('Error:', error.message);
        console.log('\n' + '='.repeat(60) + '\n');
      }
      
      throw error;
    }
  }

  // Update application status
  async updateStatus(applicationId, status, reviewerId = null, reviewNote = null) {
    try {
      const updateData = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (reviewerId) {
        updateData.reviewerId = reviewerId;
        updateData.reviewedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      if (reviewNote) {
        updateData.reviewNote = reviewNote;
      }

      await this.collection.doc(applicationId).update(updateData);

      // If accepted, add user to project team
      if (status === 'accepted') {
        const application = await this.getById(applicationId);
        if (application) {
          const ProjectModel = require('./Project');
          await ProjectModel.addTeamMember(application.projectId, application.applicantId);
        }
      }

      return this.getById(applicationId);
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  }

  // Delete application
  async delete(applicationId) {
    try {
      const application = await this.getById(applicationId);
      if (application) {
        // Decrement application count in project
        const projectRef = this.db.collection('projects').doc(application.projectId);
        await projectRef.update({
          applicationCount: admin.firestore.FieldValue.increment(-1)
        });
      }

      await this.collection.doc(applicationId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  }

  // Check if user has already applied to project
  async hasApplied(userId, projectId) {
    try {
      console.log('\n🔍 FIRESTORE INDEX NEEDED:');
      console.log('Collection: applications');
      console.log('Fields: applicantId, projectId');
      console.log('Query: Multiple where clauses require composite index');
      
      const indexConfig = {
        collectionGroup: 'applications',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'applicantId', order: 'ASCENDING' },
          { fieldPath: 'projectId', order: 'ASCENDING' }
        ]
      };
      
      console.log('\n📋 Add this to firestore.indexes.json:');
      console.log(JSON.stringify(indexConfig, null, 2));
      console.log('\n' + '='.repeat(60) + '\n');
      
      const snapshot = await this.collection
        .where('applicantId', '==', userId)
        .where('projectId', '==', projectId)
        .get();

      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking application:', error);
      
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.log('\n❌ FIRESTORE INDEX ERROR:');
        console.log('This query requires a composite index.');
        console.log('Error:', error.message);
        console.log('\n' + '='.repeat(60) + '\n');
      }
      
      throw error;
    }
  }

  // Get application statistics
  async getStats() {
    try {
      const [totalSnapshot, pendingSnapshot, acceptedSnapshot, rejectedSnapshot] = await Promise.all([
        this.collection.get(),
        this.collection.where('status', '==', 'pending').get(),
        this.collection.where('status', '==', 'accepted').get(),
        this.collection.where('status', '==', 'rejected').get()
      ]);

      return {
        total: totalSnapshot.size,
        pending: pendingSnapshot.size,
        accepted: acceptedSnapshot.size,
        rejected: rejectedSnapshot.size
      };
    } catch (error) {
      console.error('Error getting application stats:', error);
      throw error;
    }
  }

  // Get applications with user details (for project owners)
  async getByProjectWithUserDetails(projectId) {
    try {
      const applications = await this.getByProject(projectId);
      
      // Get user details for each application
      const applicationsWithUsers = await Promise.all(
        applications.map(async (app) => {
          const userDoc = await this.db.collection('users').doc(app.applicantId).get();
          const userData = userDoc.exists ? userDoc.data() : null;
          
          return {
            ...app,
            applicantDetails: userData ? {
              displayName: userData.displayName,
              email: userData.email,
              photoURL: userData.photoURL,
              bio: userData.bio,
              skills: userData.skills,
              githubUsername: userData.githubUsername
            } : null
          };
        })
      );

      return applicationsWithUsers;
    } catch (error) {
      console.error('Error getting applications with user details:', error);
      throw error;
    }
  }
}

module.exports = new Application();