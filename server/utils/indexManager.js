const fs = require('fs');
const path = require('path');

class IndexManager {
  constructor() {
    this.requiredIndexes = new Set();
    this.indexesFilePath = path.join(__dirname, '../../firestore.indexes.json');
  }

  // Add a required index to the collection
  addRequiredIndex(indexConfig) {
    const indexKey = JSON.stringify(indexConfig);
    this.requiredIndexes.add(indexKey);
  }

  // Log all required indexes
  logAllRequiredIndexes() {
    if (this.requiredIndexes.size === 0) {
      console.log('\n✅ No additional Firestore indexes required\n');
      return;
    }

    console.log('\n🔍 FIRESTORE INDEXES SUMMARY:');
    console.log('=' .repeat(60));
    
    const indexes = Array.from(this.requiredIndexes).map(indexStr => JSON.parse(indexStr));
    
    indexes.forEach((index, i) => {
      console.log(`\n${i + 1}. Collection: ${index.collectionGroup}`);
      console.log('   Fields:');
      index.fields.forEach(field => {
        const arrayConfig = field.arrayConfig ? ` (${field.arrayConfig})` : '';
        const order = field.order ? ` (${field.order})` : '';
        console.log(`   - ${field.fieldPath}${arrayConfig}${order}`);
      });
    });

    console.log('\n📋 Complete firestore.indexes.json configuration:');
    console.log(JSON.stringify({ indexes }, null, 2));
    console.log('\n' + '=' .repeat(60) + '\n');

    // Auto-update the firestore.indexes.json file
    this.updateIndexesFile(indexes);
  }

  // Update the firestore.indexes.json file with required indexes
  updateIndexesFile(indexes) {
    try {
      let existingIndexes = { indexes: [] };
      
      // Read existing indexes if file exists
      if (fs.existsSync(this.indexesFilePath)) {
        const content = fs.readFileSync(this.indexesFilePath, 'utf8');
        existingIndexes = JSON.parse(content);
      }

      // Merge with existing indexes (avoid duplicates)
      const existingIndexStrings = existingIndexes.indexes.map(idx => JSON.stringify(idx));
      const newIndexes = indexes.filter(idx => !existingIndexStrings.includes(JSON.stringify(idx)));

      if (newIndexes.length > 0) {
        existingIndexes.indexes.push(...newIndexes);
        
        // Write updated indexes to file
        fs.writeFileSync(this.indexesFilePath, JSON.stringify(existingIndexes, null, 2));
        
        console.log(`✅ Added ${newIndexes.length} new index(es) to firestore.indexes.json`);
      } else {
        console.log('✅ All required indexes already exist in firestore.indexes.json');
      }
    } catch (error) {
      console.error('❌ Failed to update firestore.indexes.json:', error.message);
    }
  }

  // Generate indexes for common query patterns
  generateCommonIndexes() {
    // Projects collection indexes
    const projectIndexes = [
      // Status + createdAt (for filtering by status and sorting)
      {
        collectionGroup: 'projects',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      // Category + createdAt (for filtering by category and sorting)
      {
        collectionGroup: 'projects',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'category', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      // OwnerId + createdAt (for user's own projects)
      {
        collectionGroup: 'projects',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'ownerId', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      // Status + category + createdAt (complex filtering)
      {
        collectionGroup: 'projects',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'category', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      // SkillsRequired array + createdAt (for skill-based filtering)
      {
        collectionGroup: 'projects',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'skillsRequired', arrayConfig: 'CONTAINS' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      }
    ];

    // Applications collection indexes
    const applicationIndexes = [
      // ProjectId + createdAt (for project applications)
      {
        collectionGroup: 'applications',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'projectId', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      // ApplicantId + createdAt (for user applications)
      {
        collectionGroup: 'applications',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'applicantId', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      // ProjectId + status + createdAt (for filtered project applications)
      {
        collectionGroup: 'applications',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'projectId', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      // ApplicantId + status + createdAt (for filtered user applications)
      {
        collectionGroup: 'applications',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'applicantId', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      // ApplicantId + projectId (for checking if user applied)
      {
        collectionGroup: 'applications',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'applicantId', order: 'ASCENDING' },
          { fieldPath: 'projectId', order: 'ASCENDING' }
        ]
      }
    ];

    // Add all common indexes
    [...projectIndexes, ...applicationIndexes].forEach(index => {
      this.addRequiredIndex(index);
    });

    console.log('\n🚀 Generated common Firestore indexes for Inspira-Grid');
    this.logAllRequiredIndexes();
  }
}

module.exports = new IndexManager();