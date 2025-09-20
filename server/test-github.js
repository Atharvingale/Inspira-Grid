const axios = require('axios');

// Test the GitHub API endpoints
async function testGitHubAPI() {
  const baseURL = 'http://localhost:5000/api';
  
  // You need to set this to a valid Firebase token from your browser's network tab
  const authToken = 'YOUR_FIREBASE_TOKEN_HERE';
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('Testing GitHub API endpoints...\n');

  try {
    // Test 1: Get GitHub profile
    console.log('1. Testing GET /api/github/profile');
    try {
      const profileResponse = await axios.get(`${baseURL}/github/profile`, { headers });
      console.log('✅ Profile:', profileResponse.data);
    } catch (error) {
      console.log('❌ Profile error:', error.response?.data || error.message);
    }

    console.log('\n');

    // Test 2: Get repositories
    console.log('2. Testing GET /api/github/repositories');
    try {
      const reposResponse = await axios.get(`${baseURL}/github/repositories`, { headers });
      console.log('✅ Repositories:', `Found ${reposResponse.data.length} repositories`);
      
      if (reposResponse.data.length > 0) {
        console.log('First repo:', {
          name: reposResponse.data[0].name,
          html_url: reposResponse.data[0].html_url,
          description: reposResponse.data[0].description
        });
        
        // Test 3: Link repository
        console.log('\n3. Testing POST /api/github/link-repository');
        try {
          const linkResponse = await axios.post(`${baseURL}/github/link-repository`, {
            projectId: 'test-project-123',
            repositoryUrl: reposResponse.data[0].html_url,
            repositoryName: reposResponse.data[0].name,
            description: reposResponse.data[0].description
          }, { headers });
          console.log('✅ Link repository:', linkResponse.data);
        } catch (error) {
          console.log('❌ Link repository error:', error.response?.data || error.message);
        }
      }
    } catch (error) {
      console.log('❌ Repositories error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.log('❌ General error:', error.message);
  }
}

// Run the test if auth token is provided
if (process.argv[2]) {
  console.log('Using provided auth token...');
  testGitHubAPI();
} else {
  console.log('Usage: node test-github.js YOUR_FIREBASE_TOKEN');
  console.log('\nTo get your Firebase token:');
  console.log('1. Open your browser dev tools');
  console.log('2. Go to Network tab');
  console.log('3. Make a request from your app');
  console.log('4. Look for Authorization header: "Bearer YOUR_TOKEN"');
  console.log('5. Copy the token (without "Bearer ") and run:');
  console.log('   node test-github.js YOUR_TOKEN');
}