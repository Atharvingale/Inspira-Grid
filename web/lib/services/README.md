# API Services Layer

This directory contains a centralized API service layer for the Inspira-Grid application. The service layer provides type-safe, consistent, and maintainable API interactions across the entire application.

## Architecture

```
lib/services/
├── baseService.ts          # Base class with common functionality
├── authService.ts          # Authentication operations
├── projectService.ts       # Project-related operations
├── userService.ts          # User management operations
├── applicationService.ts   # Application/job requests operations
├── messageService.ts       # Messaging and conversations
├── notificationService.ts  # Notifications and alerts
├── index.ts               # Main exports and utilities
└── README.md              # This documentation
```

## Key Features

- **Type Safety**: All services are fully typed with TypeScript
- **Consistent API**: Standardized request/response patterns
- **Error Handling**: Centralized error handling and logging
- **File Uploads**: Built-in support for file uploads
- **Query Building**: Automatic query parameter handling
- **Singleton Pattern**: Single instances prevent memory leaks

## Basic Usage

### Import Services

```typescript
import { 
  projectService, 
  userService, 
  authService,
  applicationService,
  messageService,
  notificationService 
} from '@/lib/services';
```

### Authentication

```typescript
// Login
const loginResult = await authService.login({
  email: 'user@example.com',
  password: 'password123'
});

// Register
const registerResult = await authService.register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  confirmPassword: 'password123'
});

// Get current user
const currentUser = await authService.getCurrentUser();
```

### Projects

```typescript
// Get all projects with filtering
const projects = await projectService.getProjects(
  { category: 'web-development', difficulty: 'intermediate' },
  { page: 1, limit: 10 }
);

// Create a new project
const newProject = await projectService.createProject({
  title: 'My Awesome Project',
  description: 'A great project description',
  category: 'web-development',
  tags: ['react', 'typescript'],
  skillsRequired: ['JavaScript', 'React'],
  teamSize: 3,
  difficulty: 'intermediate'
});

// Get project by ID
const project = await projectService.getProjectById('project-id');

// Upload project image
const imageResult = await projectService.uploadProjectImage(
  'project-id', 
  imageFile
);
```

### Users

```typescript
// Get current user profile
const profile = await userService.getCurrentUser();

// Update profile
const updatedProfile = await userService.updateProfile({
  displayName: 'New Display Name',
  bio: 'Updated bio',
  skills: ['React', 'TypeScript', 'Node.js']
});

// Search users by skills
const developers = await userService.getUsersBySkills(
  ['React', 'TypeScript'],
  { page: 1, limit: 20 }
);

// Get user statistics
const stats = await userService.getMyStats();
```

### Applications

```typescript
// Submit an application
const application = await applicationService.submitApplication('project-id', {
  message: 'I would love to join this project...',
  skills: ['React', 'TypeScript'],
  portfolioUrl: 'https://myportfolio.com',
  githubUsername: 'myusername'
});

// Get my applications
const myApplications = await applicationService.getUserApplications();

// Review an application (for project owners)
const reviewResult = await applicationService.reviewApplication(
  'application-id',
  'accept',
  'Welcome to the team!'
);
```

### Messages

```typescript
// Get conversations
const conversations = await messageService.getConversations();

// Send a message
const message = await messageService.sendMessage(
  'conversation-id',
  'Hello, how are you?'
);

// Send message with attachment
const messageWithFile = await messageService.sendMessageWithAttachment(
  'conversation-id',
  'Check out this file',
  fileObject
);

// Mark messages as read
await messageService.markMessagesAsRead('conversation-id');
```

### Notifications

```typescript
// Get notifications
const notifications = await notificationService.getNotifications();

// Mark notification as read
await notificationService.markAsRead('notification-id');

// Get unread count
const unreadCount = await notificationService.getUnreadCount();

// Update notification preferences
await notificationService.updatePreferences({
  emailNotifications: true,
  pushNotifications: false,
  messages: true
});
```

## Advanced Usage

### Error Handling

All services return standardized responses with the `ApiResponse<T>` type:

```typescript
import { serviceUtils } from '@/lib/services';

try {
  const response = await projectService.getProjects();
  
  if (serviceUtils.isSuccessResponse(response)) {
    // Handle success
    const projects = response.data;
    console.log('Projects loaded:', projects);
  } else {
    // Handle API error
    console.error('API Error:', response.error);
  }
} catch (error) {
  // Handle network/unexpected errors
  const errorMessage = serviceUtils.handleApiError(error);
  console.error('Network Error:', errorMessage);
}
```

### Pagination

Use the utility function for consistent pagination:

```typescript
import { serviceUtils } from '@/lib/services';

const pagination = serviceUtils.buildPagination(1, 20, 'createdAt', 'desc');
const projects = await projectService.getProjects({}, pagination);
```

### Custom Headers

For requests requiring custom headers:

```typescript
// This would require authentication token
const protectedData = await projectService.getProjectById('id');
// The BaseService automatically handles auth headers through the api client
```

## Service Extension

To create a new service, extend the `BaseService` class:

```typescript
import { BaseService } from './baseService';
import type { ApiResponse } from '@/types';

class MyCustomService extends BaseService {
  constructor() {
    super('/api/my-endpoint');
  }

  async getCustomData(): Promise<ApiResponse<CustomDataType>> {
    return this.get<CustomDataType>('/custom-endpoint');
  }

  async createCustomData(data: CreateCustomData): Promise<ApiResponse<CustomDataType>> {
    return this.post<CustomDataType>('/custom-endpoint', data);
  }
}

export const myCustomService = new MyCustomService();
```

## File Uploads

The base service includes built-in file upload support:

```typescript
// Upload a single file
const uploadResult = await projectService.uploadProjectImage(projectId, file);

// Upload with additional data
const customUpload = await baseService.uploadFile(
  '/upload-endpoint',
  file,
  { metadata: 'additional info' }
);
```

## Query Building

The base service automatically handles query parameters:

```typescript
// This automatically builds: /projects?category=web&page=1&limit=10
const projects = await projectService.getProjects(
  { category: 'web' },
  { page: 1, limit: 10 }
);
```

## Best Practices

1. **Always handle responses**: Check for success/error conditions
2. **Use TypeScript**: Leverage the full type system for safety
3. **Consistent error handling**: Use the provided utility functions
4. **Pagination**: Use the utility functions for consistent pagination
5. **Loading states**: Handle loading states in your components
6. **Caching**: Consider implementing caching for frequently accessed data

## Migration from Direct API Calls

To migrate from direct API calls to services:

### Before:
```typescript
const response = await fetch('/api/projects', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();
```

### After:
```typescript
const response = await projectService.getProjects();
const projects = serviceUtils.extractData(response);
```

## Testing

Services can be easily mocked for testing:

```typescript
// Mock the entire service
jest.mock('@/lib/services', () => ({
  projectService: {
    getProjects: jest.fn().mockResolvedValue({
      success: true,
      data: mockProjectsData
    })
  }
}));
```

## Environment Configuration

Services automatically use the correct base URL based on your environment configuration in the `api.ts` client.

## Performance Considerations

- Services use singleton pattern to avoid memory leaks
- Request deduplication can be implemented at the service level
- Consider implementing caching for frequently accessed endpoints
- File uploads are handled efficiently with FormData

## Support

For questions about the service layer, check the implementation in the individual service files or refer to the TypeScript types for detailed API specifications.