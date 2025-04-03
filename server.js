import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import multer from 'multer';


const port = 3000;
const app = express();

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "inspira_grid",
  password: "123456789",
  port: 5432,
});

db.connect();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/'); // Save files in the 'public/uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + uniqueSuffix + '-' + file.originalname); // Unique filename
  },
});

// Initialize Multer
const upload = multer({ storage: storage });
// Setup session
app.use(
  session({
    secret: "your_secret_key", // Change this to a secure key
    resave: false,
    saveUninitialized: true,
  })
);

// Home Route
app.get("/", (req, res) => {
  if(req.session.user){
    res.render("dashboard", { user, userStats, userProjects, userTeams, recentMessages, applications, notifications, recommendedProjects });

  } else {
    res.render("index", { user: req.session.user });
  }
});

app.get("/dashboard", async (req, res) => {
  if (!req.session.user) return res.redirect("/signin");

  try {
    // 1. Get user data
    const user = (await db.query("SELECT * FROM users WHERE user_id = $1", [req.session.user_id])).rows[0];

    // 2. Get user stats
    const userStats = {
      activeProjects: (await db.query(
        "SELECT COUNT(*) FROM projects WHERE owner_id = $1 AND status != 'Completed'", 
        [user.user_id]
      )).rows[0].count,
      teamCount: (await db.query(
        "SELECT COUNT(*) FROM team_members WHERE user_id = $1",
        [user.user_id]
      )).rows[0].count,
      pendingTasks: 0 // Add actual task logic later
    };

    // 3. Get other data
    const userProjects = (await db.query(
      "SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 5",
      [user.user_id]
    )).rows;

    const teamMembers = (await db.query(
      `SELECT u.* FROM team_members tm
       JOIN users u ON tm.user_id = u.user_id
       WHERE tm.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)
       LIMIT 5`,
      [user.user_id]
    )).rows;

    const upcomingDeadlines = (await db.query(
      `SELECT p.title, p.deadline, p.project_id AS link
       FROM projects p
       WHERE (p.owner_id = $1 OR p.project_id IN (
         SELECT project_id FROM team_members WHERE user_id = $1
       ))
       AND p.deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days'
       ORDER BY p.deadline ASC
       LIMIT 5`,
      [user.user_id]
    )).rows.map(deadline => ({
      ...deadline,
      date: new Date(deadline.deadline).toLocaleDateString(),
      isUrgent: new Date(deadline.deadline) - Date.now() < 3 * 24 * 60 * 60 * 1000 // 3 days
    }));

    // Render with all data
    res.render("dashboard", {
      user,
      userStats,
      userProjects,
      teamMembers,
      activities: [], // Add actual data
      applications: [],
      notifications: [],
      topProjects: [],
      upcomingDeadlines // Add this line to pass deadlines to template
    });

  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/signin?error=An error occurred");
  }
});

// Sign-In Page
app.get("/signin", (req, res) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    res.render("signin", { error: req.query.error || null });
  }
});

// Sign-Up Page
app.get("/signup", (req, res) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    res.render("signup", { error: req.query.error || null });
  }
});

// Handle Sign-In Request
app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Query database for the provided email and password
    const result = await db.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2",
      [email, password]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      req.session.user = user.name; // Store user name in session
      req.session.user_id = user.user_id; // Store user_id in session
 // Store user_id in session
      res.redirect("/dashboard");
    } else {
      res.redirect("/signin?error=Invalid email or password");
    }
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/signin?error=Error logging in");
  }
});

// Handle Sign-Up Request
app.post("/signup", async (req, res) => {
  const { name, email, password, bio, skills } = req.body;
  const skillsArray = skills ? skills.split(',').map(skill => skill.trim()) : [];

  try {
    // Check if email already exists
    const existingUser = await db.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.redirect(
        "/signup?error=Email already exists. Try another."
      );
    }

    // Insert new user into database with all required fields
    const result = await db.query(
      "INSERT INTO users (name, email, password, bio, skills, profile_pic) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id", 
      [name, email, password, bio || '', skillsArray, '/images/user.jpg'] // Add default here
    );

    const newUserId = result.rows[0].user_id;

    // Set session variables
    req.session.user = name;
    req.session.user_id = newUserId;

    // Redirect to dashboard
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/signup?error=Error signing up. Please try again later.");
  }
});

// Add new project
app.post("/projects/add", async (req, res) => {
  if (!req.session.user_id) {
    return res.redirect("/signin");
  }

  const { title, description, required_skills } = req.body;

  try {
    await db.query(
      "INSERT INTO projects (title, description, owner_id, required_skills, status) VALUES ($1, $2, $3, $4, $5)",
      [title, description, req.session.user_id, required_skills, "Open"]
    );
    
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/dashboard?error=Error creating project");
  }
});

// Apply to project
app.post("/projects/apply", async (req, res) => {
  if (!req.session.user_id) {
    return res.redirect("/signin");
  }

  const { project_id } = req.body;

  try {
    // Check if already applied
    const existingApplication = await db.query(
      "SELECT * FROM applications WHERE project_id = $1 AND user_id = $2",
      [project_id, req.session.user_id]
    );

    if (existingApplication.rows.length > 0) {
      return res.redirect("/dashboard?error=You have already applied to this project");
    }

    // Insert new application
    await db.query(
      "INSERT INTO applications (project_id, user_id, status) VALUES ($1, $2, $3)",
      [project_id, req.session.user_id, "Pending"]
    );
    
    res.redirect("/dashboard?message=Application submitted successfully");
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/dashboard?error=Error applying to project");
  }
});

// Update application status
app.post("/applications/update", async (req, res) => {
  if (!req.session.user_id) {
    return res.redirect("/signin");
  }

  const { application_id, status } = req.body;

  try {
    // Check if user owns the project
    const projectCheck = await db.query(
      `SELECT p.* FROM projects p
       JOIN applications a ON p.project_id = a.project_id
       WHERE a.application_id = $1 AND p.owner_id = $2`,
      [application_id, req.session.user_id]
    );

    if (projectCheck.rows.length === 0) {
      return res.redirect("/dashboard?error=You don't have permission to update this application");
    }

    // Update application status
    await db.query(
      "UPDATE applications SET status = $1 WHERE application_id = $2",
      [status, application_id]
    );
    
    // If accepted, add user to team
    if (status === "Accepted") {
      const appData = await db.query(
        "SELECT * FROM applications WHERE application_id = $1",
        [application_id]
      );
      
      if (appData.rows.length > 0) {
        const application = appData.rows[0];
        
        // Get or create team
        let teamResult = await db.query(
          "SELECT * FROM teams WHERE project_id = $1",
          [application.project_id]
        );
        
        let teamId;
        
        if (teamResult.rows.length === 0) {
          // Create new team
          const projectData = await db.query(
            "SELECT title FROM projects WHERE project_id = $1",
            [application.project_id]
          );
          
          const projectTitle = projectData.rows[0]?.title || "Project Team";
          const newTeamResult = await db.query(
            "INSERT INTO teams (project_id, team_name) VALUES ($1, $2) RETURNING team_id",
            [application.project_id, projectTitle + " Team"]
          );
          
          teamId = newTeamResult.rows[0].team_id;
        } else {
          teamId = teamResult.rows[0].team_id;
        }
        
        // Add user to team
        await db.query(
          "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)",
          [teamId, application.user_id, "Member"]
        );
        
        // Update project status if needed
        await db.query(
          "UPDATE projects SET status = 'In Progress' WHERE project_id = $1 AND status = 'Open'",
          [application.project_id]
        );
      }
    }
    
    res.redirect("/dashboard?message=Application updated successfully");
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/dashboard?error=Error updating application");
  }
});


app.get("/profile", async (req, res) => {
  // Check if user is logged in
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  try {
    // Get user data
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [req.session.user_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.redirect("/signin");
    }
    
    const user = userResult.rows[0];

    // Get user stats
    const activeProjectsResult = await db.query(
      "SELECT COUNT(*) AS count FROM projects WHERE owner_id = $1 AND status != 'Completed'",
      [user.user_id]
    );
    
    const projectsCreatedResult = await db.query(
      "SELECT COUNT(*) AS count FROM projects WHERE owner_id = $1",
      [user.user_id]
    );
    
    const activeTeamsResult = await db.query(
      "SELECT COUNT(*) AS count FROM team_members WHERE user_id = $1",
      [user.user_id]
    );
    
    const applicationsSubmittedResult = await db.query(
      "SELECT COUNT(*) AS count FROM applications WHERE user_id = $1",
      [user.user_id]
    );
    
    const messagesSentResult = await db.query(
      "SELECT COUNT(*) AS count FROM chats WHERE sender_id = $1",
      [user.user_id]
    );

    const userStats = {
      activeProjects: activeProjectsResult.rows[0].count,
      projectsCreated: projectsCreatedResult.rows[0].count,
      activeTeams: activeTeamsResult.rows[0].count,
      applicationsSubmitted: applicationsSubmittedResult.rows[0].count,
      messagesSent: messagesSentResult.rows[0].count
    };

    // Get user's projects
    const userProjectsResult = await db.query(
      "SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC",
      [user.user_id]
    );
    
    const userProjects = userProjectsResult.rows;

    // Get user's teams
    const userTeamsResult = await db.query(
      `SELECT t.*, p.title AS project_title,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.team_id) AS member_count
       FROM teams t
       JOIN projects p ON t.project_id = p.project_id
       JOIN team_members tm ON t.team_id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [user.user_id]
    );
    
    const userTeams = userTeamsResult.rows;

    // Get applications
    const applicationsResult = await db.query(
      `SELECT a.*, p.title AS project_title
       FROM applications a
       JOIN projects p ON a.project_id = p.project_id
       WHERE a.user_id = $1
       ORDER BY a.applied_at DESC`,
      [user.user_id]
    );
    
    const applications = applicationsResult.rows;

    // Get activity log
    const activityLogResult = await db.query(
      `SELECT 
        CASE 
          WHEN type = 'project_created' THEN 'Created a new project'
          WHEN type = 'team_joined' THEN 'Joined a team'
          WHEN type = 'project_applied' THEN 'Applied to a project'
          WHEN type = 'message_sent' THEN 'Sent a message'
          ELSE 'Activity'
        END AS action,
        description,
        CASE
          WHEN type = 'project_created' THEN 'fas fa-folder-plus'
          WHEN type = 'team_joined' THEN 'fas fa-users'
          WHEN type = 'project_applied' THEN 'fas fa-clipboard-list'
          WHEN type = 'message_sent' THEN 'fas fa-comment'
          ELSE 'fas fa-check-circle'
        END AS icon,
        CASE
          WHEN NOW() - created_at < INTERVAL '1 hour' THEN EXTRACT(MINUTE FROM (NOW() - created_at)) || ' mins ago'
          WHEN NOW() - created_at < INTERVAL '1 day' THEN EXTRACT(HOUR FROM (NOW() - created_at)) || ' hrs ago'
          ELSE EXTRACT(DAY FROM (NOW() - created_at)) || ' days ago'
        END AS time_ago
       FROM activity_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [user.user_id]
    );
    
    let activityLog = [];
    
    // If activity_log table exists, use the result
    if (activityLogResult.rows) {
      activityLog = activityLogResult.rows;
    } else {
      // Generate mock activity log if table doesn't exist
      activityLog = [
        {
          action: "Created a new project",
          description: "You created a new project: " + (userProjects[0]?.title || "Project"),
          icon: "fas fa-folder-plus",
          time_ago: "2 days ago"
        },
        {
          action: "Joined a team",
          description: "You joined the team: " + (userTeams[0]?.team_name || "Team"),
          icon: "fas fa-users",
          time_ago: "3 days ago"
        },
        {
          action: "Updated profile",
          description: "You updated your profile information",
          icon: "fas fa-user-edit",
          time_ago: "5 days ago"
        }
      ];
    }

    // Render profile with all data
    res.render("profile", {
      user,
      userStats,
      userProjects,
      userTeams,
      applications,
      activityLog
    });
    
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/dashboard?error=An error occurred. Please try again.");
  }
});

// Profile Edit Page
app.get("/profile/edit", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  try {
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [req.session.user_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.redirect("/signin");
    }
    
    const user = userResult.rows[0];
    
    res.render("profile-edit", { 
      user,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/profile?error=An error occurred. Please try again.");
  }
});

// Handle Profile Update
app.post("/profile/update", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  const { name, bio, skills, phone, location, website } = req.body;

  try {
    await db.query(
      "UPDATE users SET name = $1, bio = $2, skills = $3, phone = $4, location = $5, website = $6 WHERE user_id = $7",
      [name, bio || '', skills || '', phone || '', location || '', website || '', req.session.user_id]
    );
    
    // Update session user name if changed
    if (name !== req.session.user) {
      req.session.user = name;
    }
    
    res.redirect("/profile?success=Profile updated successfully");
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/profile/edit?error=Error updating profile. Please try again.");
  }
});

// Handle Profile Photo Update
app.post('/profile/update-photo', upload.single('profilePhoto'), async (req, res) => {
  if (!req.session.user_id) {
    return res.redirect('/signin');
  }

  try {
    // Check if a file was uploaded
    if (!req.file) {
      return res.redirect('/profile?error=No file uploaded');
    }

    // Construct the file path
    const profilePicPath = '/uploads/' + req.file.filename;

    // Update the user's profile picture in the database
    await db.query(
      'UPDATE users SET profile_pic = $1 WHERE user_id = $2',
      [profilePicPath, req.session.user_id]
    );

    // Redirect with success message
    res.redirect('/profile?success=Profile photo updated successfully');
  } catch (err) {
    console.error('Error updating profile photo:', err);
    res.redirect('/profile?error=Failed to update profile photo');
  }
});
// Handle Password Change
app.post("/profile/change-password", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validate passwords
  if (newPassword !== confirmPassword) {
    return res.redirect("/profile/edit?error=New passwords do not match");
  }

  try {
    // Check if current password is correct
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1 AND password = $2",
      [req.session.user_id, currentPassword]
    );
    
    if (userResult.rows.length === 0) {
      return res.redirect("/profile/edit?error=Current password is incorrect");
    }
    
    // Update password
    await db.query(
      "UPDATE users SET password = $1 WHERE user_id = $2",
      [newPassword, req.session.user_id]
    );
    
    // Log the activity
    try {
      await db.query(
        "INSERT INTO activity_log (user_id, type, description) VALUES ($1, $2, $3)",
        [req.session.user_id, "password_changed", "You changed your password"]
      );
    } catch (logErr) {
      // If activity log fails, just continue - it's not critical
      console.error("Failed to log activity:", logErr);
    }
    
    res.redirect("/profile/edit?success=Password updated successfully");
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/profile/edit?error=Error updating password. Please try again.");
  }
});

// Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/signin");
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    error: err.message || "An unexpected error occurred"
  });
});
// Add this after all routes in server.js

// Add these routes to your server.js file, just before the app.listen section

// Resources Route
app.get("/resources", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  
  res.render("quick-links", {
    user: req.session.user,
    pageTitle: "Resources",
    pageIcon: "fas fa-book",
    activePage: "resources"
  });
});

// Calendar Route
app.get("/calendar", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  
  res.render("quick-links", {
    user: req.session.user,
    pageTitle: "Calendar",
    pageIcon: "fas fa-calendar-alt",
    activePage: "calendar"
  });
});

// Reports Route
app.get("/reports", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  
  res.render("quick-links", {
    user: req.session.user,
    pageTitle: "Reports & Analytics",
    pageIcon: "fas fa-chart-bar",
    activePage: "reports"
  });
});

// Help Center Route
app.get("/help", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  
  res.render("quick-links", {
    user: req.session.user,
    pageTitle: "Help Center",
    pageIcon: "fas fa-question-circle",
    activePage: "help"
  });
});

// For custom content pages, you can add these routes as well:

// Documentation subpage route
app.get("/resources/documentation", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  
  const content = [
    {
      title: "Getting Started Guide",
      icon: "fas fa-play-circle",
      description: "Learn the basics of using InspiraGrid with our comprehensive getting started guide.",
      link: "#",
      colSize: 6
    },
    {
      title: "Project Management",
      icon: "fas fa-tasks",
      description: "Detailed documentation on creating and managing projects effectively.",
      link: "#",
      colSize: 6
    },
    {
      title: "Team Collaboration",
      icon: "fas fa-users",
      description: "Learn how to collaborate efficiently with your team members.",
      link: "#",
      colSize: 6
    },
    {
      title: "Advanced Features",
      icon: "fas fa-star",
      description: "Explore advanced features to maximize your productivity.",
      link: "#",
      colSize: 6
    }
  ];
  
  res.render("quick-links", {
    user: req.session.user,
    pageTitle: "Documentation",
    pageIcon: "fas fa-book",
    activePage: "resources",
    content: content
  });
});

// Project Reports subpage route example
app.get("/reports/projects", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  
  // In a real app, you would fetch this data from the database
  const content = [
    {
      title: "Active Projects",
      icon: "fas fa-project-diagram",
      description: "Overview of all your active projects with progress metrics and deadlines.",
      link: "#",
      colSize: 12
    },
    {
      title: "Project Timeline Analysis",
      icon: "fas fa-chart-line",
      description: "Analyze project timelines and identify potential delays or bottlenecks.",
      link: "#",
      colSize: 6
    },
    {
      title: "Resource Allocation",
      icon: "fas fa-people-carry",
      description: "Review how resources are allocated across your projects.",
      link: "#",
      colSize: 6
    }
  ];
  
  res.render("quick-links", {
    user: req.session.user,
    pageTitle: "Project Reports",
    pageIcon: "fas fa-chart-bar",
    activePage: "reports",
    content: content
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});