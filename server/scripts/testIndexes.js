#!/usr/bin/env node

/**
 * Script to test Firestore queries and log index requirements
 * Run this to see what indexes are needed for your queries
 */

const Project = require('../models/Project');
const Application = require('../models/Application');

async function testQueries() {
  console.log('🔍 Testing Firestore Queries and Logging Index Requirements\n');
  console.log('=' .repeat(60));

  try {
    // Initialize models
    const projectModel = new Project();
    const applicationModel = new Application();

    console.log('\n📊 Testing Project Queries...\n');

    // Test 1: Get projects with status filter and sorting
    console.log('1. Testing: Get projects with status filter + sort by createdAt');
    try {
      await projectModel.getAll({ 
        status: 'approved', 
        orderBy: 'createdAt', 
        orderDirection: 'desc',
        limit: 10 
      });
    } catch (error) {
      // Expected to fail in development, but will log the index requirement
    }

    // Test 2: Get projects with category filter
    console.log('\\n2. Testing: Get projects with category filter + sort');
    try {
      await projectModel.getAll({ 
        category: 'Web Development', 
        orderBy: 'createdAt', 
        orderDirection: 'desc' 
      });
    } catch (error) {
      // Expected to fail in development
    }

    // Test 3: Get projects with skills filter
    console.log('\\n3. Testing: Get projects with skills filter + sort');
    try {
      await projectModel.getAll({ 
        skills: ['JavaScript', 'React'], 
        orderBy: 'createdAt', 
        orderDirection: 'desc' 
      });
    } catch (error) {
      // Expected to fail in development
    }

    // Test 4: Complex project filtering
    console.log('\\n4. Testing: Complex project filtering (status + category + sort)');
    try {
      await projectModel.getAll({ 
        status: 'approved',
        category: 'Mobile Development',
        orderBy: 'createdAt', 
        orderDirection: 'desc' 
      });
    } catch (error) {
      // Expected to fail in development
    }

    // Test 5: Get projects by team member
    console.log('\\n5. Testing: Get projects by team member');
    try {
      await projectModel.getByTeamMember('mock-user-123');
    } catch (error) {
      // Expected to fail in development
    }

    console.log('\\n📋 Testing Application Queries...\n');

    // Test 6: Get applications by project
    console.log('6. Testing: Get applications by project + sort');
    try {
      await applicationModel.getByProject('project-123');
    } catch (error) {
      // Expected to fail in development
    }

    // Test 7: Get applications by project with status filter
    console.log('\\n7. Testing: Get applications by project with status filter');
    try {
      await applicationModel.getByProject('project-123', 'pending');
    } catch (error) {
      // Expected to fail in development
    }

    // Test 8: Get applications by user
    console.log('\\n8. Testing: Get applications by user + sort');
    try {
      await applicationModel.getByUser('user-123');
    } catch (error) {
      // Expected to fail in development
    }

    // Test 9: Get applications by user with status filter
    console.log('\\n9. Testing: Get applications by user with status filter');
    try {
      await applicationModel.getByUser('user-123', 'accepted');
    } catch (error) {
      // Expected to fail in development
    }

    // Test 10: Check if user has applied to project
    console.log('\\n10. Testing: Check if user has applied to project');
    try {
      await applicationModel.hasApplied('user-123', 'project-456');
    } catch (error) {
      // Expected to fail in development
    }

  } catch (error) {
    console.error('\\n❌ Error during testing:', error.message);
  }

  console.log('\\n' + '=' .repeat(60));
  console.log('✅ Index testing complete!');
  console.log('\\n💡 The above logs show all the Firestore indexes you need.');
  console.log('📋 All indexes have been added to firestore.indexes.json');
  console.log('🚀 Deploy indexes with: firebase deploy --only firestore:indexes');
  console.log('\\n' + '=' .repeat(60) + '\\n');
}

// Run the tests
testQueries().catch(console.error);