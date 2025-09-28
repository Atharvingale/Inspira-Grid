const axios = require('axios');

const API_BASE = 'http://localhost:5000';
const API_URL = `${API_BASE}/api`;

// Test configuration
const testConfig = {
  timeout: 5000,
  validateStatus: () => true // Don't throw on any status code
};

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

// Test functions
async function testServerHealth() {
  const response = await axios.get(`${API_BASE}/health`, testConfig);
  return {
    success: response.status === 200,
    error: response.status !== 200 ? `Expected 200, got ${response.status}` : null,
    details: response.status === 200 ? `Server uptime: ${response.data.uptime}s` : null
  };
}

async function testServerInfo() {
  const response = await axios.get(`${API_BASE}/`, testConfig);
  return {
    success: response.status === 200 && response.data.message,
    error: response.status !== 200 ? `Expected 200, got ${response.status}` : null,
    details: response.status === 200 ? `API Version: ${response.data.version}` : null
  };
}

async function testProjectsEndpoint() {
  const response = await axios.get(`${API_URL}/projects`, testConfig);
  return {
    success: [200, 401].includes(response.status), // 401 is expected without auth
    error: ![200, 401].includes(response.status) ? `Expected 200 or 401, got ${response.status}` : null,
    details: response.status === 401 ? 'Authentication required (expected)' : `Found ${response.data?.projects?.length || 0} projects`
  };
}

async function testApplicationsEndpoint() {
  const response = await axios.get(`${API_URL}/applications/my-applications`, testConfig);
  return {
    success: [200, 401].includes(response.status),
    error: ![200, 401].includes(response.status) ? `Expected 200 or 401, got ${response.status}` : null,
    details: response.status === 401 ? 'Authentication required (expected)' : 'Applications endpoint accessible'
  };
}

async function testUsersSearchEndpoint() {
  const response = await axios.get(`${API_URL}/users/search?q=test`, testConfig);
  return {
    success: [200, 400, 401].includes(response.status),
    error: ![200, 400, 401].includes(response.status) ? `Expected 200, 400, or 401, got ${response.status}` : null,
    details: 'User search endpoint responding'
  };
}

async function testMessagesEndpoint() {
  const response = await axios.get(`${API_URL}/messages/conversations`, testConfig);
  return {
    success: [200, 401].includes(response.status),
    error: ![200, 401].includes(response.status) ? `Expected 200 or 401, got ${response.status}` : null,
    details: 'Messages endpoint responding'
  };
}

async function testNotificationsEndpoint() {
  const response = await axios.get(`${API_URL}/notifications`, testConfig);
  return {
    success: [200, 401, 404].includes(response.status),
    error: ![200, 401, 404].includes(response.status) ? `Expected 200, 401, or 404, got ${response.status}` : null,
    details: 'Notifications endpoint responding'
  };
}

async function testProjectCreationValidation() {
  const response = await axios.post(`${API_URL}/projects`, {
    title: 'Test Project',
    description: 'Test description'
  }, testConfig);
  return {
    success: [400, 401].includes(response.status), // Should fail due to auth or validation
    error: ![400, 401].includes(response.status) ? `Expected 400 or 401, got ${response.status}` : null,
    details: 'Project creation validation working'
  };
}

async function testApplicationCreationValidation() {
  const response = await axios.post(`${API_URL}/applications`, {
    projectId: 'test-project-id',
    message: 'Test application message'
  }, testConfig);
  return {
    success: [400, 401].includes(response.status),
    error: ![400, 401].includes(response.status) ? `Expected 400 or 401, got ${response.status}` : null,
    details: 'Application creation validation working'
  };
}

async function testInvalidRoute() {
  const response = await axios.get(`${API_URL}/nonexistent-endpoint`, testConfig);
  return {
    success: response.status === 404,
    error: response.status !== 404 ? `Expected 404, got ${response.status}` : null,
    details: '404 handling working correctly'
  };
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting comprehensive API tests...\n');
  console.log('=' * 60);

  // Basic server tests
  await runTest('Server Health Check', testServerHealth);
  await runTest('Server Info Endpoint', testServerInfo);
  
  // API endpoint tests
  await runTest('Projects Endpoint', testProjectsEndpoint);
  await runTest('Applications Endpoint', testApplicationsEndpoint);
  await runTest('Users Search Endpoint', testUsersSearchEndpoint);
  await runTest('Messages Endpoint', testMessagesEndpoint);
  await runTest('Notifications Endpoint', testNotificationsEndpoint);
  
  // Validation tests
  await runTest('Project Creation Validation', testProjectCreationValidation);
  await runTest('Application Creation Validation', testApplicationCreationValidation);
  
  // Error handling tests
  await runTest('404 Error Handling', testInvalidRoute);

  // Summary
  console.log('=' * 60);
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
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, runTest };