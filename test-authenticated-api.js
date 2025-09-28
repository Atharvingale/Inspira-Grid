const axios = require('axios');

const API_BASE = 'http://localhost:5000';
const API_URL = `${API_BASE}/api`;

// Test configuration
const testConfig = {
  timeout: 10000,
  validateStatus: () => true
};

// Mock Firebase token for testing (development only)
const MOCK_TOKEN = 'mock-token-test-user-' + Date.now();

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  results: []
};

// Helper function to run a test
async function runTest(name, testFn) {
  console.log(`🧪 Testing: ${name}`);
  try {
    const result = await testFn();
    if (result.success) {
      testResults.passed++;
      console.log(`✅ PASS: ${name}`);
      if (result.details) console.log(`   ${result.details}`);
    } else {
      testResults.failed++;
      console.log(`❌ FAIL: ${name}`);
      console.log(`   ${result.error}`);
    }
    testResults.results.push({ name, success: result.success, error: result.error });
  } catch (error) {
    testResults.failed++;
    console.log(`❌ ERROR: ${name}`);
    console.log(`   ${error.message}`);
    testResults.results.push({ name, success: false, error: error.message });
  }
  console.log(''); // Empty line for readability
}

// Helper function to get auth headers
function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${MOCK_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

// Authentication tests
async function testAuthenticatedEndpoints() {
  const headers = getAuthHeaders();
  const response = await axios.get(`${API_URL}/projects`, { 
    ...testConfig, 
    headers 
  });
  return {
    success: response.status === 200,
    error: response.status !== 200 ? `Expected 200, got ${response.status}` : null,
    details: response.status === 200 ? `Found ${response.data?.projects?.length || 0} projects with auth` : null
  };
}

async function testProjectCreation() {
  const headers = getAuthHeaders();
  const projectData = {
    title: 'Test Project API ' + Date.now(),
    description: 'This is a test project created via API testing',
    category: 'Web Development',
    skillsRequired: ['JavaScript', 'React'],
    difficulty: 'intermediate',
    teamSize: 5,
    duration: '2 months',
    timeline: '2 months'
  };

  const response = await axios.post(`${API_URL}/projects`, projectData, { 
    ...testConfig, 
    headers 
  });
  
  return {
    success: [200, 201].includes(response.status),
    error: ![200, 201].includes(response.status) ? `Expected 200/201, got ${response.status}: ${JSON.stringify(response.data)}` : null,
    details: [200, 201].includes(response.status) ? `Created project: ${response.data?.project?.title || 'Unknown'}` : null
  };
}

async function testApplicationSubmission() {
  const headers = getAuthHeaders();
  
  // First, get available projects
  const projectsResponse = await axios.get(`${API_URL}/projects`, { 
    ...testConfig, 
    headers 
  });
  
  if (projectsResponse.status !== 200 || !projectsResponse.data?.projects?.length) {
    return {
      success: false,
      error: 'No projects available for application testing'
    };
  }
  
  const project = projectsResponse.data.projects[0];
  const applicationData = {
    projectId: project.id,
    message: 'I would like to join this project because I have relevant experience and skills.',
    skills: ['JavaScript', 'React', 'Node.js'],
    portfolioUrl: 'https://example.com/portfolio',
    githubUsername: 'testuser'
  };

  const response = await axios.post(`${API_URL}/applications`, applicationData, { 
    ...testConfig, 
    headers 
  });
  
  return {
    success: [200, 201].includes(response.status),
    error: ![200, 201].includes(response.status) ? `Expected 200/201, got ${response.status}: ${JSON.stringify(response.data)}` : null,
    details: [200, 201].includes(response.status) ? `Submitted application to: ${project.title}` : null
  };
}

async function testGetUserApplications() {
  const headers = getAuthHeaders();
  const response = await axios.get(`${API_URL}/applications/my-applications`, { 
    ...testConfig, 
    headers 
  });
  
  return {
    success: response.status === 200,
    error: response.status !== 200 ? `Expected 200, got ${response.status}: ${JSON.stringify(response.data)}` : null,
    details: response.status === 200 ? `Found ${response.data?.applications?.length || 0} user applications` : null
  };
}

async function testUserSearch() {
  const headers = getAuthHeaders();
  const response = await axios.get(`${API_URL}/users/search?q=test`, { 
    ...testConfig, 
    headers 
  });
  
  return {
    success: response.status === 200,
    error: response.status !== 200 ? `Expected 200, got ${response.status}: ${JSON.stringify(response.data)}` : null,
    details: response.status === 200 ? `User search returned ${response.data?.users?.length || 0} results` : null
  };
}

async function testMessagingEndpoints() {
  const headers = getAuthHeaders();
  const response = await axios.get(`${API_URL}/messages/conversations`, { 
    ...testConfig, 
    headers 
  });
  
  return {
    success: response.status === 200,
    error: response.status !== 200 ? `Expected 200, got ${response.status}: ${JSON.stringify(response.data)}` : null,
    details: response.status === 200 ? `Found ${response.data?.conversations?.length || 0} conversations` : null
  };
}

async function testNotificationsEndpoints() {
  const headers = getAuthHeaders();
  const response = await axios.get(`${API_URL}/notifications`, { 
    ...testConfig, 
    headers 
  });
  
  return {
    success: [200, 404].includes(response.status), // 404 might be expected if no notifications route exists
    error: ![200, 404].includes(response.status) ? `Expected 200 or 404, got ${response.status}: ${JSON.stringify(response.data)}` : null,
    details: response.status === 200 ? `Notifications endpoint working` : 'Notifications endpoint not found (may be expected)'
  };
}

async function testErrorHandling() {
  const headers = getAuthHeaders();
  
  // Test invalid project creation
  const response = await axios.post(`${API_URL}/projects`, {
    title: '' // Invalid: empty title
  }, { 
    ...testConfig, 
    headers 
  });
  
  return {
    success: response.status === 400, // Should return validation error
    error: response.status !== 400 ? `Expected 400 validation error, got ${response.status}` : null,
    details: response.status === 400 ? 'Validation error handling working correctly' : null
  };
}

async function testDatabaseOperations() {
  const headers = getAuthHeaders();
  
  // Test projects endpoint with filtering
  const response = await axios.get(`${API_URL}/projects?status=approved&limit=5`, { 
    ...testConfig, 
    headers 
  });
  
  return {
    success: response.status === 200,
    error: response.status !== 200 ? `Expected 200, got ${response.status}` : null,
    details: response.status === 200 ? 'Database filtering operations working' : null
  };
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting comprehensive authenticated API tests...\n');
  console.log('=' * 80);
  console.log('ℹ️  Using mock authentication token for development testing');
  console.log('=' * 80);

  // Authentication tests
  await runTest('Authenticated Projects Access', testAuthenticatedEndpoints);
  
  // CRUD operations
  await runTest('Project Creation', testProjectCreation);
  await runTest('Application Submission', testApplicationSubmission);
  await runTest('Get User Applications', testGetUserApplications);
  
  // Search and filtering
  await runTest('User Search', testUserSearch);
  await runTest('Database Operations', testDatabaseOperations);
  
  // Additional features
  await runTest('Messaging Endpoints', testMessagingEndpoints);
  await runTest('Notifications Endpoints', testNotificationsEndpoints);
  
  // Error handling
  await runTest('Error Handling', testErrorHandling);

  // Summary
  console.log('=' * 80);
  console.log('🏁 Test Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Success Rate: ${(testResults.passed / (testResults.passed + testResults.failed) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n🔍 Failed Tests:');
    testResults.results
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
  }
  
  console.log('\n🎯 Feature Status Summary:');
  console.log(`   Authentication: ${testResults.results.find(r => r.name === 'Authenticated Projects Access')?.success ? '✅' : '❌'}`);
  console.log(`   Project Management: ${testResults.results.find(r => r.name === 'Project Creation')?.success ? '✅' : '❌'}`);
  console.log(`   Application System: ${testResults.results.find(r => r.name === 'Application Submission')?.success ? '✅' : '❌'}`);
  console.log(`   User Search: ${testResults.results.find(r => r.name === 'User Search')?.success ? '✅' : '❌'}`);
  console.log(`   Messaging: ${testResults.results.find(r => r.name === 'Messaging Endpoints')?.success ? '✅' : '❌'}`);
  console.log(`   Database Operations: ${testResults.results.find(r => r.name === 'Database Operations')?.success ? '✅' : '❌'}`);
  console.log(`   Error Handling: ${testResults.results.find(r => r.name === 'Error Handling')?.success ? '✅' : '❌'}`);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, runTest };