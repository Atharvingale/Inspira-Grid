# 🚀 Inspira-Grid

> A collaborative platform connecting students, creators, and developers to build amazing projects together.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)
![Firebase](https://img.shields.io/badge/Firebase-10.7.1-orange.svg)

---

## 📖 Overview

**Inspira-Grid** is a full-stack web platform designed to bring together students, creators, and developers to collaborate on innovative projects. Whether you're looking to join a team, create your own project, or showcase your skills, Inspira-Grid provides the tools and community to make it happen.

### ✨ Key Features

- 🔐 **Secure Authentication** - Firebase Auth with Google & GitHub OAuth
- 👥 **Project Management** - Create, browse, and join collaborative projects  
- 💬 **Real-time Messaging** - Team communication with Socket.IO
- 📊 **User Profiles** - Showcase skills, experience, and project portfolio
- 🎯 **Smart Matching** - AI-powered project recommendations
- 📱 **Responsive Design** - Beautiful UI that works on all devices
- ⚡ **Real-time Updates** - Live notifications and project status updates
- 🛡️ **Admin Dashboard** - Project approval and user management

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 15.5.3 (App Router)
- **Language**: TypeScript 5.3.3
- **Styling**: Tailwind CSS 3.4.0
- **UI Components**: Headless UI, Heroicons, Lucide React
- **Animations**: Framer Motion 12.23.16
- **State Management**: React Context + Hooks
- **Authentication**: Firebase Auth 10.7.1
- **Real-time**: Socket.IO Client 4.8.1

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 5.1.0
- **Language**: JavaScript (CommonJS)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Admin SDK 13.5.0
- **Real-time**: Socket.IO 4.8.1
- **File Upload**: Multer 2.0.2
- **Image Hosting**: Cloudinary 2.7.0
- **Security**: Helmet 8.1.0, CORS 2.8.5
- **OAuth**: Passport.js with GitHub Strategy

### Development & Tools
- **Package Manager**: npm
- **Development Server**: Nodemon 3.1.10
- **Code Quality**: ESLint, TypeScript
- **Environment**: dotenv 17.2.2
- **Deployment**: Vercel (Frontend), Node.js Server (Backend)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Firebase Account** (for authentication & database)
- **GitHub OAuth App** (for GitHub integration)
- **Cloudinary Account** (optional, for image uploads)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd inspira-grid-nextjs
```

### 2. Install Dependencies

Install all dependencies for both frontend and backend:

```bash
npm run install-all
```

Or install manually:

```bash
# Root dependencies
npm install

# Frontend dependencies
cd web && npm install

# Backend dependencies  
cd ../server && npm install
```

### 3. Environment Setup

Copy and configure the environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# ====================================
# INSPIRA-GRID ENVIRONMENT VARIABLES
# ====================================

# ====================================
# APPLICATION ENVIRONMENT
# ====================================
NODE_ENV=development

# ====================================
# SERVER CONFIGURATION
# ====================================
PORT=5000
CLIENT_URL=http://localhost:3000

# Session & JWT Secrets
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here

# ====================================
# FIREBASE CONFIGURATION (Client Side)
# ====================================
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

# ====================================
# FIREBASE CONFIGURATION (Server Side)
# ====================================
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# ====================================
# GITHUB OAUTH CONFIGURATION
# ====================================
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/github/callback

# ====================================
# CLOUDINARY CONFIGURATION (Optional)
# ====================================
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 4. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** with Google and Email providers
3. Create a **Firestore database**
4. Generate a **service account key** and add it to your environment variables
5. Set up **Firestore security rules** (use the provided `firestore.rules`)

### 5. GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/applications/new)
2. Create a new OAuth App with:
   - **Authorization callback URL**: `http://localhost:5000/api/github/callback`
3. Copy the Client ID and Secret to your `.env` file

### 6. Start Development Servers

Run both frontend and backend simultaneously:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend Server
npm run server:dev

# Terminal 2 - Frontend
npm run web:dev
```

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

---

## 📁 Project Structure

```
inspira-grid-nextjs/
├── 📁 server/                 # Backend Express.js application
│   ├── 📁 config/            # Configuration files (Firebase, Passport)
│   ├── 📁 middleware/        # Authentication & validation middleware
│   ├── 📁 routes/            # API routes
│   │   ├── auth.js          # Authentication routes
│   │   ├── projects.js      # Project management routes
│   │   ├── users.js         # User profile routes
│   │   ├── applications.js  # Project applications routes
│   │   ├── messages.js      # Messaging routes
│   │   └── github.js        # GitHub integration routes
│   ├── server.js            # Main server file
│   └── package.json         # Backend dependencies
├── 📁 web/                   # Frontend Next.js application
│   ├── 📁 app/              # Next.js App Router pages
│   │   ├── 📁 auth/         # Authentication pages
│   │   ├── 📁 dashboard/    # Dashboard pages
│   │   │   ├── 📁 projects/ # Project management
│   │   │   ├── 📁 profile/  # User profiles
│   │   │   ├── 📁 applications/ # Application management
│   │   │   └── 📁 messages/ # Messaging interface
│   │   └── 📁 admin/        # Admin dashboard
│   ├── 📁 components/       # Reusable UI components
│   ├── 📁 lib/             # Utilities, contexts, services
│   ├── 📁 styles/          # Global styles & Tailwind config
│   └── package.json        # Frontend dependencies
├── 📄 .env                  # Environment variables
├── 📄 .gitignore           # Git ignore rules
├── 📄 firestore.rules      # Firestore security rules
├── 📄 storage.rules        # Firebase Storage security rules
├── 📄 package.json         # Root package.json for scripts
└── 📄 README.md           # This file
```

---

## 🔧 Available Scripts

### Root Level Scripts

```bash
# Install all dependencies (root + frontend + backend)
npm run install-all

# Start both frontend and backend in development mode
npm run dev

# Start backend development server
npm run server:dev

# Start frontend development server
npm run web:dev

# Build production version
npm run build

# Start production server
npm start
```

### Frontend Scripts (web/)

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint code
npm run lint

# Type checking
npm run type-check
```

### Backend Scripts (server/)

```bash
# Start production server
npm start

# Development server with auto-reload
npm run dev
```

---

## 🌟 Core Features

### 🔐 Authentication System
- **Firebase Authentication** with email/password
- **OAuth integration** with Google and GitHub
- **Protected routes** and role-based access
- **Session management** with secure cookies

### 👥 Project Management
- **Create projects** with detailed descriptions and requirements
- **Browse and search** projects by category, skills, or keywords
- **Application system** for joining project teams
- **Project status tracking** (draft → approved → in-progress → completed)
- **Team member management** and role assignments

### 💬 Real-time Communication
- **Socket.IO integration** for instant messaging
- **Team conversations** with file sharing support
- **Real-time notifications** for project updates
- **Typing indicators** and message status

### 📊 User Profiles
- **Comprehensive profiles** with skills, experience, and portfolio
- **GitHub integration** for automatic profile enhancement
- **Project showcase** and contribution history
- **Skill verification** and endorsements

### 🎯 Smart Recommendations
- **AI-powered project matching** based on user skills
- **Personalized dashboard** with relevant opportunities
- **Skill-based filtering** and advanced search
- **Trending projects** and featured opportunities

### 🛡️ Admin Features
- **Project moderation** and approval system
- **User management** and role assignments
- **Analytics dashboard** with key metrics
- **Content moderation** tools

---

## 🔒 Security Features

- **Firebase Authentication** with secure token validation
- **CORS protection** with configurable origins
- **Helmet.js** for security headers
- **Input validation** and sanitization
- **Rate limiting** on API endpoints
- **Secure session management**
- **Environment variable protection**

---

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - User logout

### Projects
- `GET /api/projects` - List projects (with filtering)
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/user/my-projects` - User's owned projects
- `GET /api/projects/user/team-projects` - User's team projects

### Applications
- `POST /api/applications` - Apply to project
- `GET /api/applications/my-applications` - User's applications
- `PUT /api/applications/:id` - Update application status

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `GET /api/users` - Search users

### GitHub Integration
- `GET /api/github/connect` - Connect GitHub account
- `GET /api/github/callback` - GitHub OAuth callback
- `GET /api/github/profile` - Get GitHub profile data

### Messages
- `GET /api/messages/conversations` - Get conversations
- `POST /api/messages` - Send message
- `GET /api/messages/:conversationId` - Get conversation messages

---

## 🚦 Development Workflow

### 1. Setting Up Development Environment

```bash
# Clone and setup
git clone <repository-url>
cd inspira-grid-nextjs
npm run install-all

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start development
npm run dev
```

### 2. Making Changes

1. **Frontend changes**: Edit files in `/web`
2. **Backend changes**: Edit files in `/server`  
3. **Database changes**: Update Firestore rules if needed
4. **Environment changes**: Update `.env` and restart servers

### 3. Testing Features

1. **Authentication**: Test login/register flows
2. **Projects**: Create, browse, and apply to projects
3. **Real-time**: Test messaging and notifications
4. **Integrations**: Verify GitHub OAuth works
5. **Mobile**: Test responsive design

---

## 📊 Database Schema

### Firestore Collections

#### `users`
```javascript
{
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,
  skills: string[],
  bio: string,
  experience: string,
  location: string,
  githubUsername: string,
  profileComplete: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `projects`
```javascript
{
  id: string,
  title: string,
  description: string,
  category: string,
  skillsRequired: string[],
  ownerId: string,
  ownerName: string,
  teamSize: number,
  currentTeamSize: number,
  teamMembers: Array<{userId: string, role: string}>,
  status: 'pending' | 'approved' | 'in-progress' | 'completed',
  duration: string,
  budget: string,
  githubRepo: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `applications`
```javascript
{
  id: string,
  projectId: string,
  applicantId: string,
  message: string,
  status: 'pending' | 'accepted' | 'rejected',
  appliedAt: Timestamp,
  respondedAt: Timestamp
}
```

---

## 🎨 UI/UX Design

### Design System
- **Color Palette**: Dark theme with brand colors (purple/blue gradients)
- **Typography**: Inter font family for clean readability
- **Components**: Consistent design system with reusable components
- **Animations**: Framer Motion for smooth micro-interactions
- **Responsive**: Mobile-first approach with Tailwind breakpoints

### Key UI Features
- **Glass morphism** effects with backdrop blur
- **Gradient backgrounds** and hover effects
- **Interactive cards** with smooth transitions
- **Loading states** and skeleton components
- **Toast notifications** for user feedback
- **Modal dialogs** for forms and confirmations

---

## 🔧 Deployment

### Frontend (Vercel)

1. **Connect to Vercel**:
   ```bash
   npm install -g vercel
   cd web
   vercel
   ```

2. **Environment Variables**: Add all `NEXT_PUBLIC_*` variables in Vercel dashboard

3. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Backend (Node.js Server)

1. **Deploy to your preferred platform** (Railway, Render, DigitalOcean, etc.)
2. **Set environment variables** on the server
3. **Configure CORS** to allow your frontend domain
4. **Set up process manager** (PM2, etc.) for production

### Environment Variables for Production

Update these in your production environment:

```env
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com
GITHUB_CALLBACK_URL=https://your-backend-domain.com/api/github/callback
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to your branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines

- **Code Style**: Follow existing patterns and ESLint rules
- **Commit Messages**: Use clear, descriptive commit messages
- **Testing**: Test your changes thoroughly before submitting
- **Documentation**: Update README and comments as needed

---

## 🐛 Troubleshooting

### Common Issues

#### 1. CORS Errors
```bash
# Ensure CLIENT_URL matches your frontend URL
CLIENT_URL=http://localhost:3000  # for development
```

#### 2. Firebase Connection Issues
- Verify all Firebase configuration variables are correct
- Check that Firestore database is created and accessible
- Ensure service account key is properly formatted

#### 3. GitHub OAuth Issues
- Verify GitHub OAuth app callback URL matches `GITHUB_CALLBACK_URL`
- Check that CLIENT_ID and CLIENT_SECRET are correct

#### 4. Port Already in Use
```bash
# Kill processes on ports 3000 or 5000
npx kill-port 3000 5000
```

#### 5. Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules web/node_modules server/node_modules
npm run install-all
```

### Getting Help

- **Issues**: Create an issue on GitHub with detailed description
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Documentation**: Check inline code comments for implementation details

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Firebase** for authentication and database services
- **Vercel** for frontend hosting and deployment
- **Tailwind CSS** for the utility-first CSS framework
- **Next.js** for the React framework
- **Express.js** for the backend server framework
- **Socket.IO** for real-time communication
- **Framer Motion** for smooth animations

---

## 📞 Support

If you need help or have questions:

- 📧 **Email**: [support@inspiragrid.com](mailto:support@inspiragrid.com)
- 💬 **Discussions**: GitHub Discussions tab
- 🐛 **Issues**: GitHub Issues tab
- 📚 **Documentation**: Check this README and inline code comments

---

<div align="center">

**Made with ❤️ by the Inspira-Grid Team**

[Website](https://inspiragrid.com) • [GitHub](https://github.com/inspiragrid) • [Twitter](https://twitter.com/inspiragrid)

</div>