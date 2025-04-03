import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import multer from "multer";
import path from "path";

const port = 3000;
const app = express();
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/signin");
};
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "inspira_grid",
  password: "123456789",
  port: 5432,
});

db.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => {
    console.error('Error connecting to database:', err);
    process.exit(1);
  });

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Configure Multer storage


// Configure multer for file upload
const storage = multer.memoryStorage();

// Initialize Multer
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
});
// Setup session
app.use(
  session({
    secret: "your_secret_key", // Change this to a secure key
    resave: false,
    saveUninitialized: true,
  })
);

app.get("/", async (req, res) => {
  if (req.session.user) {
    try {
      // Get user data
      const userResult = await db.query(
        "SELECT * FROM users WHERE user_id = $1",
        [req.session.user_id]
      );
      const user = userResult.rows[0];

      // Get user stats
      const userStats = {
        totalProjects: (await db.query(
          "SELECT COUNT(*) FROM projects WHERE owner_id = $1",
          [req.session.user_id]
        )).rows[0].count,
        teamProjects: (await db.query(
          "SELECT COUNT(DISTINCT p.project_id) FROM projects p JOIN teams t ON p.project_id = t.project_id JOIN team_members tm ON t.team_id = tm.team_id WHERE tm.user_id = $1",
          [req.session.user_id]
        )).rows[0].count,
        applications: (await db.query(
          "SELECT COUNT(*) FROM applications WHERE user_id = $1",
          [req.session.user_id]
        )).rows[0].count
      };

      // Get user's projects
      const userProjects = (await db.query(
        "SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 5",
        [req.session.user_id]
      )).rows;

      // Get user's teams
      const userTeams = (await db.query(
        "SELECT t.*, p.title as project_title FROM teams t JOIN projects p ON t.project_id = p.project_id JOIN team_members tm ON t.team_id = tm.team_id WHERE tm.user_id = $1 LIMIT 5",
        [req.session.user_id]
      )).rows;

      // Get recent messages (placeholder for now)
      const recentMessages = [];

      // Get applications
      const applications = (await db.query(
        "SELECT a.*, p.title as project_title FROM applications a JOIN projects p ON a.project_id = p.project_id WHERE a.user_id = $1 ORDER BY a.applied_at DESC LIMIT 5",
        [req.session.user_id]
      )).rows;

      // Get notifications (placeholder for now)
      const notifications = [];

      // Get recommended projects
      const recommendedProjects = (await db.query(
        "SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.user_id WHERE p.status = 'Open' AND p.owner_id != $1 LIMIT 5",
        [req.session.user_id]
      )).rows;

      res.render("dashboard", {
        user,
        userStats,
        userProjects,
        userTeams,
        recentMessages,
        applications,
        notifications,
        recommendedProjects
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
      res.status(500).render("error", {
        user: req.session.user,
        error: "Failed to load dashboard"
      });
    }
  } else {
    res.render("index", { user: req.session.user });
  }
});

app.get("/dashboard", async (req, res) => {
  if (!req.session.user) return res.redirect("/signin");

  try {
    // 1. Get user data
    const user = (
      await db.query("SELECT * FROM users WHERE user_id = $1", [
        req.session.user_id,
      ])
    ).rows[0];

    // 2. Get user stats
    const userStats = {
      activeProjects: (
        await db.query(
          "SELECT COUNT(*) FROM projects WHERE owner_id = $1 AND status != 'Completed'",
          [user.user_id]
        )
      ).rows[0].count,
      teamCount: (
        await db.query("SELECT COUNT(*) FROM team_members WHERE user_id = $1", [
          user.user_id,
        ])
      ).rows[0].count,
      pendingTasks: 0, // Add actual task logic later
    };

    // 3. Get other data
    const userProjects = (
      await db.query(
        "SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 5",
        [user.user_id]
      )
    ).rows;

    const teamMembers = (
      await db.query(
        `SELECT u.* FROM team_members tm
       JOIN users u ON tm.user_id = u.user_id
       WHERE tm.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)
       LIMIT 5`,
        [user.user_id]
      )
    ).rows;

    const upcomingDeadlines = (
      await db.query(
        `SELECT p.title, p.deadline, p.project_id AS link
       FROM projects p
       WHERE (p.owner_id = $1 OR p.project_id IN (
         SELECT project_id FROM team_members WHERE user_id = $1
       ))
       AND p.deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days'
       ORDER BY p.deadline ASC
       LIMIT 5`,
        [user.user_id]
      )
    ).rows.map((deadline) => ({
      ...deadline,
      date: new Date(deadline.deadline).toLocaleDateString(),
      isUrgent:
        new Date(deadline.deadline) - Date.now() < 3 * 24 * 60 * 60 * 1000, // 3 days
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
      upcomingDeadlines, // Add this line to pass deadlines to template
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
  const skillsArray = skills
    ? skills.split(",").map((skill) => skill.trim())
    : [];

  try {
    // Check if email already exists
    const existingUser = await db.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.redirect("/signup?error=Email already exists. Try another.");
    }

    // Insert new user into database with all required fields
    const result = await db.query(
      "INSERT INTO users (name, email, password, bio, skills, profile_pic) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id",
      [name, email, password, bio || "", skillsArray, "/images/user.jpg"] // Add default here
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
app.post("/projects/apply", isAuthenticated, async (req, res) => {
  try {
    const { project_id, cover_letter, relevant_skills } = req.body;
    const applicant_id = req.session.user.user_id;
    
    await db.query(
      "INSERT INTO project_applications (project_id, applicant_id, cover_letter, relevant_skills, status) " +
      "VALUES ($1, $2, $3, $4, 'Pending')",
      [project_id, applicant_id, cover_letter, JSON.stringify(relevant_skills)]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error applying to project:", error);
    res.status(500).json({ error: "Failed to apply to project" });
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
      return res.redirect(
        "/dashboard?error=You don't have permission to update this application"
      );
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

// Profile Route
app.get("/profile", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  try {
    // Get user data with all necessary information
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [req.session.user_id]
    );

    if (userResult.rows.length === 0) {
      return res.redirect("/signin");
    }

    const user = userResult.rows[0];

    // Get all data in parallel for better performance
    const [
      projectCountResult,
      teamCountResult,
      taskCountResult,
      experienceResult,
      educationResult,
      activitiesResult,
    ] = await Promise.all([
      // Project count
      db.query("SELECT COUNT(*) FROM projects WHERE owner_id = $1", [
        user.user_id,
      ]),
      // Team count
      db.query("SELECT COUNT(*) FROM team_members WHERE user_id = $1", [
        user.user_id,
      ]),
      // Task count (assuming you have a tasks table, adjust as needed)
      db
        .query("SELECT COUNT(*) FROM tasks WHERE assigned_to = $1", [
          user.user_id,
        ])
        .catch(() => ({ rows: [{ count: 0 }] })), // Fallback if table doesn't exist
      // Work experience
      db.query(
        "SELECT * FROM user_experience WHERE user_id = $1 ORDER BY start_date DESC",
        [user.user_id]
      ),
      // Education
      db.query(
        "SELECT * FROM user_education WHERE user_id = $1 ORDER BY start_year DESC",
        [user.user_id]
      ),
      // Recent activities
      db.query(
        `SELECT * FROM user_activities 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [user.user_id]
      ),
    ]);

    // Parse skills if they exist
    user.skills = user.skills
      ? user.skills.split(",").map((skill) => ({
          name: skill.trim(),
          level: Math.floor(Math.random() * 40) + 60, // Random level between 60-100 for demo
        }))
      : [];

    // Add counts to user object
    user.projectCount = projectCountResult.rows[0].count;
    user.teamCount = teamCountResult.rows[0].count;
    user.taskCount = taskCountResult.rows[0].count;

    // Format experience dates
    const experience = experienceResult.rows.map((exp) => ({
      ...exp,
      startDate: new Date(exp.start_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }),
      endDate: exp.current
        ? "Present"
        : exp.end_date
        ? new Date(exp.end_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          })
        : null,
    }));

    // Format activities
    const recentActivities = activitiesResult.rows.map((activity) => ({
      ...activity,
      icon: getActivityIcon(activity.activity_type),
      time_ago: getTimeAgo(activity.created_at),
    }));

    res.render("profile", {
      user,
      experience: experience,
      education: educationResult.rows,
      recentActivities: recentActivities,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/dashboard?error=Error loading profile");
  }
});

// Helper function to get activity icon
function getActivityIcon(type) {
  const icons = {
    project_created: "fas fa-folder-plus",
    team_joined: "fas fa-users",
    application_sent: "fas fa-paper-plane",
    profile_updated: "fas fa-user-edit",
    default: "fas fa-circle",
  };
  return icons[type] || icons.default;
}

// Helper function to format time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (let [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
    }
  }
  return "Just now";
}

// ... existing imports and setup ...

// Profile Edit Route
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
      success: req.query.success || null,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/profile?error=Error loading profile");
  }
});

// Handle Profile Update
app.post("/profile/update", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  const { name, title, bio, email, phone, location, website, skills } =
    req.body;

  try {
    await db.query(
      `UPDATE users 
       SET name = $1, title = $2, bio = $3, email = $4, 
           phone = $5, location = $6, website = $7, skills = $8 
       WHERE user_id = $9`,
      [
        name,
        title || null,
        bio || null,
        email,
        phone || null,
        location || null,
        website || null,
        skills || null,
        req.session.user_id,
      ]
    );

    res.redirect("/profile?success=Profile updated successfully");
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/profile/edit?error=Error updating profile");
  }
});
// ... existing multer config ...

// Handle Profile Picture Update
app.post("/profile/upload-photo", isAuthenticated, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.redirect('/profile?error=No file uploaded');
  }

  try {
    // Read the file as binary data
    const imageBuffer = req.file.buffer;

    // Update user's profile picture in database
    await db.query(
      "UPDATE users SET profile_pic_data = $1 WHERE user_id = $2",
      [imageBuffer, req.session.user_id]
    );

    res.redirect('/profile?success=Profile picture updated successfully');
  } catch (err) {
    console.error("Error updating profile picture:", err);
    res.redirect('/profile?error=Error updating profile picture');
  }
});

// Add a route to serve the profile picture
app.get("/profile-pic/:userId", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT profile_pic_data FROM users WHERE user_id = $1",
      [req.params.userId]
    );

    if (result.rows.length > 0 && result.rows[0].profile_pic_data) {
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': result.rows[0].profile_pic_data.length
      });
      res.end(result.rows[0].profile_pic_data);
    } else {
      res.redirect('/images/user.jpg'); // Default image
    }
  } catch (err) {
    console.error("Error serving profile picture:", err);
    res.redirect('/images/user.jpg');
  }
});
// Add Experience
app.post("/profile/add-experience", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  const { position, company, startDate, endDate, description } = req.body;

  try {
    await db.query(
      `INSERT INTO user_experience (user_id, position, company, start_date, end_date, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.session.user_id,
        position,
        company,
        startDate,
        endDate || null,
        description,
      ]
    );

    res.redirect("/profile?success=Experience added successfully");
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/profile?error=Error adding experience");
  }
});

// Add Education
app.post("/profile/add-education", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  const { degree, institution, startYear, endYear, description } = req.body;

  try {
    await db.query(
      `INSERT INTO user_education (user_id, degree, institution, start_year, end_year, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.session.user_id,
        degree,
        institution,
        startYear,
        endYear || null,
        description,
      ]
    );

    res.redirect("/profile?success=Education added successfully");
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/profile?error=Error adding education");
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
    await db.query("UPDATE users SET password = $1 WHERE user_id = $2", [
      newPassword,
      req.session.user_id,
    ]);

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
    res.redirect(
      "/profile/edit?error=Error updating password. Please try again."
    );
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
    error: err.message || "An unexpected error occurred",
  });
});

// Resources Route
app.get("/resources", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  res.render("quick-links", {
    user: req.session.user,
    pageTitle: "Resources",
    pageIcon: "fas fa-book",
    activePage: "resources",
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
    activePage: "calendar",
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
    activePage: "reports",
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
    activePage: "help",
  });
});
// Documentation subpage route
app.get("/resources/documentation", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  const content = [
    {
      title: "Getting Started Guide",
      icon: "fas fa-play-circle",
      description:
        "Learn the basics of using InspiraGrid with our comprehensive getting started guide.",
      link: "#",
      colSize: 6,
    },
    {
      title: "Project Management",
      icon: "fas fa-tasks",
      description:
        "Detailed documentation on creating and managing projects effectively.",
      link: "#",
      colSize: 6,
    },
    {
      title: "Team Collaboration",
      icon: "fas fa-users",
      description:
        "Learn how to collaborate efficiently with your team members.",
      link: "#",
      colSize: 6,
    },
    {
      title: "Advanced Features",
      icon: "fas fa-star",
      description: "Explore advanced features to maximize your productivity.",
      link: "#",
      colSize: 6,
    },
  ];

  res.render("quick-links", {
    user: req.session.user,
    pageTitle: "Documentation",
    pageIcon: "fas fa-book",
    activePage: "resources",
    content: content,
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
      description:
        "Overview of all your active projects with progress metrics and deadlines.",
      link: "#",
      colSize: 12,
    },
    {
      title: "Project Timeline Analysis",
      icon: "fas fa-chart-line",
      description:
        "Analyze project timelines and identify potential delays or bottlenecks.",
      link: "#",
      colSize: 6,
    },
    {
      title: "Resource Allocation",
      icon: "fas fa-people-carry",
      description: "Review how resources are allocated across your projects.",
      link: "#",
      colSize: 6,
    },
  ];

  res.render("quick-links", {
    user: req.session.user,
    pageTitle: "Project Reports",
    pageIcon: "fas fa-chart-bar",
    activePage: "reports",
    content: content,
  });
});

// Handle account deletion
app.post("/settings/account/delete", isAuthenticated, async (req, res) => {
  try {
    // Delete user account and related data
    // In a real app, you would use transactions to ensure all related data is deleted

    // Delete user's applications
    await db.query("DELETE FROM applications WHERE user_id = $1", [
      req.session.user_id,
    ]);

    // Delete user's team memberships
    await db.query("DELETE FROM team_members WHERE user_id = $1", [
      req.session.user_id,
    ]);

    // Delete user's projects
    await db.query("DELETE FROM projects WHERE owner_id = $1", [
      req.session.user_id,
    ]);

    // Delete user's settings if they exist
    await db.query("DELETE FROM user_settings WHERE user_id = $1", [
      req.session.user_id,
    ]);

    // Delete user's notification preferences if they exist
    await db.query("DELETE FROM notification_preferences WHERE user_id = $1", [
      req.session.user_id,
    ]);

    // Delete user's integrations if they exist
    await db.query("DELETE FROM user_integrations WHERE user_id = $1", [
      req.session.user_id,
    ]);

    // Finally, delete the user
    await db.query("DELETE FROM users WHERE user_id = $1", [
      req.session.user_id,
    ]);

    // Destroy the session
    req.session.destroy();

    res.json({
      success: true,
      message: "Your account has been deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting account:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete account" });
  }
});

// Projects route
app.get("/projects", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Get complete user information first
    const userResult = await db.query(
      "SELECT user_id, name, email, profile_pic FROM users WHERE user_id = $1",
      [userId]
    );
    const userInfo = userResult.rows[0];
    
    // Fetch different types of projects
    const myProjects = await db.query(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM team_members tm 
         JOIN teams t ON tm.team_id = t.team_id 
         WHERE t.project_id = p.project_id) as team_size
       FROM projects p 
       WHERE owner_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    const teamProjects = await db.query(
      `SELECT p.*, t.team_name as team_name,
        (SELECT COUNT(*) FROM team_members tm2 
         WHERE tm2.team_id = t.team_id) as team_size
       FROM projects p 
       JOIN teams t ON p.project_id = t.project_id 
       JOIN team_members tm ON t.team_id = tm.team_id 
       WHERE tm.user_id = $1 AND p.owner_id != $1`,
      [userId]
    );
    
    // Simplified discover projects query to ensure it returns results
    const discoverProjects = await db.query(
      `SELECT DISTINCT p.*, 
        u.name as creator_name, 
        u.profile_pic as creator_pic,
        COALESCE((SELECT COUNT(*) FROM team_members tm 
         JOIN teams t ON tm.team_id = t.team_id 
         WHERE t.project_id = p.project_id), 0) as team_size,
        COALESCE((SELECT COUNT(*) FROM project_applications pa 
         WHERE pa.project_id = p.project_id AND pa.status = 'pending'), 0) as pending_applications
       FROM projects p 
       JOIN users u ON p.owner_id = u.user_id 
       WHERE p.owner_id != $1 
       ORDER BY p.created_at DESC 
       LIMIT 30`,
      [userId]
    );
    
    const applications = await db.query(
      `SELECT a.*, p.title as project_name, 
        p.category as project_category,
        p.description as project_description,
        u.name as project_owner_name,
        u.profile_pic as project_owner_pic
       FROM project_applications a 
       JOIN projects p ON a.project_id = p.project_id 
       JOIN users u ON p.owner_id = u.user_id
       WHERE a.user_id = $1 
       ORDER BY a.created_at DESC`,
      [userId]
    );

    // Enhanced process projects function with better error handling
    const processProjects = (projects) => {
      return projects.map(project => {
        try {
          // Handle required_skills
          let requiredSkills = [];
          if (project.required_skills) {
            if (typeof project.required_skills === 'string') {
              try {
                requiredSkills = JSON.parse(project.required_skills);
              } catch (e) {
                console.error(`Error parsing required_skills for project ${project.project_id}:`, e);
                requiredSkills = project.required_skills.split(',').map(s => s.trim());
              }
            } else if (Array.isArray(project.required_skills)) {
              requiredSkills = project.required_skills;
            }
          }
          
          // Handle milestones
          let milestones = [];
          if (project.milestones) {
            if (typeof project.milestones === 'string') {
              try {
                milestones = JSON.parse(project.milestones);
              } catch (e) {
                console.error(`Error parsing milestones for project ${project.project_id}:`, e);
                milestones = [];
              }
            } else if (Array.isArray(project.milestones)) {
              milestones = project.milestones;
            }
          }
          
          // Handle milestone_status
          let milestoneStatus = [];
          if (project.milestone_status) {
            if (typeof project.milestone_status === 'string') {
              try {
                milestoneStatus = JSON.parse(project.milestone_status);
              } catch (e) {
                console.error(`Error parsing milestone_status for project ${project.project_id}:`, e);
                milestoneStatus = [];
              }
            } else if (Array.isArray(project.milestone_status)) {
              milestoneStatus = project.milestone_status;
            }
          }
          
          return {
            ...project,
            required_skills: requiredSkills,
            milestones: milestones,
            milestone_status: milestoneStatus,
            created_at_formatted: new Date(project.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          };
        } catch (error) {
          console.error(`Error processing project ${project.project_id}:`, error);
          return {
            ...project,
            required_skills: [],
            milestones: [],
            milestone_status: [],
            created_at_formatted: new Date(project.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          };
        }
      });
    };

    // Process all project types
    const processedMyProjects = processProjects(myProjects.rows);
    const processedTeamProjects = processProjects(teamProjects.rows);
    const processedDiscoverProjects = processProjects(discoverProjects.rows);

    // Log counts to help with debugging
    console.log(`Found ${processedMyProjects.length} my projects`);
    console.log(`Found ${processedTeamProjects.length} team projects`);
    console.log(`Found ${processedDiscoverProjects.length} discover projects`);

    res.render("projects", {
      title: "Projects",
      currentPage: "projects",
      user: userInfo,
      myProjects: processedMyProjects,
      teamProjects: processedTeamProjects,
      discoverProjects: processedDiscoverProjects,
      applications: applications.rows.map(app => ({
        ...app,
        created_at_formatted: new Date(app.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      })),
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load projects. Please try again later.",
      title: "Error",
      currentPage: 'projects'
    });
  }
});

// Add a route for the project creation form
app.get("/projects/new", isAuthenticated, (req, res) => {
  res.render("project-form", {
    user: req.session.user,
    isNew: true,
    project: {},
    error: null,
    success: null,
    title: "Create Project",
    currentPage: 'projects'
  });
});
// Project Details Route
app.get("/projects/:id", async (req, res) => {
  if (!req.session.user) return res.redirect("/signin");

  try {
    const projectId = req.params.id;

    // Get project details
    const projectResult = await db.query(
      "SELECT p.*, u.name as owner_name, u.profile_pic as owner_pic FROM projects p " +
      "JOIN users u ON p.owner_id = u.user_id " +
      "WHERE p.project_id = $1",
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Project not found",
      });
    }

    const project = projectResult.rows[0];

    // Parse JSON fields if they're stored as strings
    if (typeof project.required_skills === "string") {
      project.required_skills = JSON.parse(project.required_skills);
    }

    if (typeof project.milestones === "string") {
      project.milestones = JSON.parse(project.milestones);
    }

    if (typeof project.milestone_status === "string") {
      project.milestone_status = JSON.parse(project.milestone_status);
    }

    // Calculate project progress based on completed milestones
    let completedMilestones = 0;
    if (project.milestone_status) {
      project.milestone_status.forEach((status) => {
        if (status === "completed") completedMilestones++;
      });
    }

    const totalMilestones = project.milestones ? project.milestones.length : 0;
    const progress =
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

    // Get team members
    const teamResult = await db.query(
      "SELECT u.user_id, u.name, u.profile_pic, tm.role FROM users u " +
      "JOIN team_members tm ON u.user_id = tm.user_id " +
      "JOIN teams t ON tm.team_id = t.team_id " +
      "WHERE t.project_id = $1",
      [projectId]
    );

    const team = teamResult.rows;

    // Get project updates/timeline
    const updatesResult = await db.query(
      "SELECT pu.*, u.name as author_name FROM project_updates pu " +
        "JOIN users u ON pu.user_id = u.user_id " +
        "WHERE pu.project_id = $1 " +
        "ORDER BY pu.created_at DESC",
      [projectId]
    );

    const updates = updatesResult.rows;

    // Get comments
    const commentsResult = await db.query(
      "SELECT c.*, u.name as author_name, u.profile_pic FROM comments c " +
        "JOIN users u ON c.user_id = u.user_id " +
        "WHERE c.project_id = $1 " +
        "ORDER BY c.created_at DESC",
      [projectId]
    );

    const comments = commentsResult.rows;

    // Check if user is a member of this project
    const isMemberResult = await db.query(
      "SELECT tm.* FROM team_members tm " +
      "JOIN teams t ON tm.team_id = t.team_id " +
      "WHERE t.project_id = $1 AND tm.user_id = $2",
      [projectId, req.session.user_id]
    );

    const isMember = isMemberResult.rows.length > 0;

    // Check if user has a pending application
    const applicationResult = await db.query(
      "SELECT * FROM project_applications WHERE project_id = $1 AND user_id = $2 AND status = 'pending'",
      [projectId, req.session.user_id]
    );

    const hasPendingApplication = applicationResult.rows.length > 0;

    // Get related projects (same category or similar skills)
    const relatedResult = await db.query(
      "SELECT p.*, u.name as owner_name FROM projects p " +
        "JOIN users u ON p.owner_id = u.user_id " +
        "WHERE p.category = $1 AND p.project_id != $2 " +
        "ORDER BY p.created_at DESC LIMIT 3",
      [project.category, projectId]
    );

    const relatedProjects = relatedResult.rows;

    // Format dates
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    project.formatted_created_at = formatDate(project.created_at);
    project.formatted_updated_at = formatDate(
      project.updated_at || project.created_at
    );

    updates.forEach((update) => {
      update.formatted_date = formatDate(update.created_at);
    });

    comments.forEach((comment) => {
      comment.formatted_date = formatDate(comment.created_at);
    });

    // Render the project details page
    res.render("project-details", {
      user: req.session.user,
      project,
      team,
      updates,
      comments,
      isMember,
      hasPendingApplication,
      relatedProjects,
      progress,
      error: req.query.error || null,
      success: req.query.success || null,
      baseUrl: `${req.protocol}://${req.get('host')}`,
      projectUrl: `${req.protocol}://${req.get('host')}/projects/${project.project_id}`
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).render("error", {
      user: req.session.user,
      error: "An error occurred while loading the project details",
    });
  }
});

// Add Comment to Project
app.post("/projects/:id/comment", async (req, res) => {
  if (!req.session.user) return res.redirect("/signin");

  try {
    const projectId = req.params.id;
    const { comment } = req.body;

    if (!comment || comment.trim() === "") {
      return res.redirect(
        `/projects/${projectId}?error=Comment cannot be empty`
      );
    }

    await db.query(
      "INSERT INTO comments (project_id, user_id, content, created_at) VALUES ($1, $2, $3, NOW())",
      [projectId, req.session.user_id, comment]
    );

    res.redirect(`/projects/${projectId}#comments`);
  } catch (err) {
    console.error("Database error:", err);
    res.redirect(`/projects/${req.params.id}?error=Failed to add comment`);
  }
});

// Update the project application route to ensure it works correctly
// Add this route to handle project applications
app.post("/projects/:id/apply", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.session.user_id;
    const { cover_letter, relevant_skills, availability } = req.body;

    // Check if user already applied to this project
    const existingApplication = await db.query(
      "SELECT * FROM project_applications WHERE project_id = $1 AND user_id = $2",
      [projectId, userId]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "You have already applied to this project" 
      });
    }

    // Insert the application
    await db.query(
      "INSERT INTO project_applications (project_id, user_id, message, status, created_at) VALUES ($1, $2, $3, $4, NOW())",
      [projectId, userId, cover_letter, "pending"]
    );

    // Get project owner to send notification
    const projectOwnerResult = await db.query(
      "SELECT owner_id, title FROM projects WHERE project_id = $1",
      [projectId]
    );
    
    if (projectOwnerResult.rows.length > 0) {
      const ownerId = projectOwnerResult.rows[0].owner_id;
      const projectTitle = projectOwnerResult.rows[0].title;
      
      // Create notification for project owner
      await db.query(
        "INSERT INTO notifications (user_id, type, content, related_id, is_read, created_at) VALUES ($1, $2, $3, $4, false, NOW())",
        [ownerId, 'project_application', `New application for your project: ${projectTitle}`, projectId]
      );
    }

    res.status(200).json({ 
      success: true, 
      message: "Application submitted successfully" 
    });
  } catch (err) {
    console.error("Error submitting application:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to submit application" 
    });
  }
});
// Add route to delete project
app.post("/projects/:id/delete", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.session.user_id;

    // Check if user is the project owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to delete this project" 
      });
    }

    // Start transaction
    await db.query("BEGIN");

    // Delete project applications
    await db.query(
      "DELETE FROM project_applications WHERE project_id = $1",
      [projectId]
    );

    // Delete project updates
    await db.query(
      "DELETE FROM project_updates WHERE project_id = $1",
      [projectId]
    );

    // Delete team members
    await db.query(
      "DELETE FROM team_members WHERE team_id IN (SELECT team_id FROM teams WHERE project_id = $1)",
      [projectId]
    );

    // Delete teams
    await db.query(
      "DELETE FROM teams WHERE project_id = $1",
      [projectId]
    );

    // Delete notifications related to this project
    await db.query(
      "DELETE FROM notifications WHERE related_id = $1",
      [projectId]
    );

    // Finally delete the project
    await db.query(
      "DELETE FROM projects WHERE project_id = $1",
      [projectId]
    );

    // Commit transaction
    await db.query("COMMIT");

    res.status(200).json({ 
      success: true, 
      message: "Project deleted successfully" 
    });
  } catch (err) {
    // Rollback in case of error
    await db.query("ROLLBACK");
    console.error("Error deleting project:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete project" 
    });
  }
});
// Add route to withdraw application
app.post("/applications/:id/withdraw", isAuthenticated, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const userId = req.session.user_id;

    // Check if application exists and belongs to user
    const applicationResult = await db.query(
      "SELECT * FROM project_applications WHERE application_id = $1 AND user_id = $2",
      [applicationId, userId]
    );

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Application not found" 
      });
    }

    // Delete the application
    await db.query(
      "DELETE FROM project_applications WHERE application_id = $1",
      [applicationId]
    );

    res.status(200).json({ 
      success: true, 
      message: "Application withdrawn successfully" 
    });
  } catch (err) {
    console.error("Error withdrawing application:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to withdraw application" 
    });
  }
});

// Add a route to handle application approval/rejection
app.post("/projects/:id/applications/:appId/respond", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const applicationId = req.params.appId;
    const { status } = req.body; // 'accepted' or 'rejected'
    const userId = req.session.user_id;

    // Check if user is the project owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.redirect(
        `/projects/${projectId}?error=You don't have permission to manage applications`
      );
    }

    // Get application details
    const applicationResult = await db.query(
      "SELECT * FROM project_applications WHERE application_id = $1 AND project_id = $2",
      [applicationId, projectId]
    );

    if (applicationResult.rows.length === 0) {
      return res.redirect(`/projects/${projectId}?error=Application not found`);
    }

    const application = applicationResult.rows[0];
    const applicantId = application.user_id;

    // Update application status
    await db.query(
      "UPDATE project_applications SET status = $1 WHERE application_id = $2",
      [status, applicationId]
    );

    // If accepted, add user to team
    if (status === 'accepted') {
      // Get team ID
      const teamResult = await db.query(
        "SELECT * FROM teams WHERE project_id = $1",
        [projectId]
      );

      let teamId;
      if (teamResult.rows.length === 0) {
        // Create team if it doesn't exist
        const newTeamResult = await db.query(
          "INSERT INTO teams (project_id, team_name) VALUES ($1, $2) RETURNING team_id",
          [projectId, projectResult.rows[0].title + " Team"]
        );
        teamId = newTeamResult.rows[0].team_id;
      } else {
        teamId = teamResult.rows[0].team_id;
      }

      // Add user to team
      await db.query(
        "INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())",
        [teamId, applicantId, 'Member']
      );

      // Create notification for applicant
      await db.query(
        "INSERT INTO notifications (user_id, type, content, related_id, is_read, created_at) VALUES ($1, $2, $3, $4, false, NOW())",
        [applicantId, 'application_accepted', `Your application for project "${projectResult.rows[0].title}" has been accepted!`, projectId]
      );
    } else {
      // Create rejection notification
      await db.query(
        "INSERT INTO notifications (user_id, type, content, related_id, is_read, created_at) VALUES ($1, $2, $3, $4, false, NOW())",
        [applicantId, 'application_rejected', `Your application for project "${projectResult.rows[0].title}" has been rejected.`, projectId]
      );
    }

    res.redirect(`/projects/${projectId}?success=Application ${status} successfully`);
  } catch (err) {
    console.error("Database error:", err);
    res.redirect(`/projects/${req.params.id}?error=Failed to process application`);
  }
});
// Add this route to get notifications
app.get("/notifications", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user_id;
    
    // Get unread notifications
    const notificationsResult = await db.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [userId]
    );
    
    // Format notifications for display
    const notifications = notificationsResult.rows.map(notification => {
      return {
        ...notification,
        time_ago: getTimeAgo(notification.created_at),
        icon: getNotificationIcon(notification.type)
      };
    });
    
    res.json({ notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Add this function to get notification icon
function getNotificationIcon(type) {
  const icons = {
    'project_application': 'fas fa-user-plus',
    'application_accepted': 'fas fa-check-circle',
    'application_rejected': 'fas fa-times-circle',
    'team_added': 'fas fa-users',
    'project_update': 'fas fa-project-diagram',
    'default': 'fas fa-bell'
  };
  return icons[type] || icons.default;
}

// Add this route to mark notifications as read
app.post("/notifications/mark-read", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { notificationId } = req.body;
    
    if (notificationId) {
      // Mark specific notification as read
      await db.query(
        "UPDATE notifications SET is_read = true WHERE notification_id = $1 AND user_id = $2",
        [notificationId, userId]
      );
    } else {
      // Mark all notifications as read
      await db.query(
        "UPDATE notifications SET is_read = true WHERE user_id = $1",
        [userId]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking notifications as read:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

app.post("/projects/:id/update-timeline", async (req, res) => {
  if (!req.session.user) return res.redirect("/signin");

  try {
    const projectId = parseInt(req.params.id, 10); // Convert string to integer

    // Validate projectId
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const { title, content } = req.body;

    if (!title || !content) {
      return res.redirect(
        `/projects/${projectId}?error=Title and content are required`
      );
    }

    // Check if user is project owner or team member
    const authCheck = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2 " +
        "UNION " +
        "SELECT p.* FROM projects p " +
        "JOIN teams t ON p.project_id = t.project_id " +
        "JOIN team_members tm ON t.team_id = tm.team_id " +
        "WHERE p.project_id = $1 AND tm.user_id = $2",
      [projectId, req.session.user_id]
    );

    if (authCheck.rows.length === 0) {
      return res.redirect(
        `/projects/${projectId}?error=You don't have permission to add updates`
      );
    }

    await db.query(
      "INSERT INTO project_updates (project_id, user_id, title, content, created_at) VALUES ($1, $2, $3, $4, NOW())",
      [projectId, req.session.user_id, title, content]
    );

    res.redirect(`/projects/${projectId}?success=Update added successfully`);
  } catch (err) {
    console.error("Database error:", err);
    res.redirect(`/projects/${req.params.id}?error=Failed to add update`);
  }
});

app.post("/projects/create", isAuthenticated, async (req, res) => {
  try {
    // Use req.session.user_id directly instead of req.session.user.user_id
    const userId = req.session.user_id;
    
    // Log the user ID to verify it's available
    console.log("Creating project with user ID:", userId);
    
    const { 
      title, 
      description, 
      category, 
      required_skills, 
      status
    } = req.body;
    
    // Process milestones from form or use defaults
    let milestones = req.body.milestones || ['Planning', 'Design', 'Development', 'Testing', 'Deployment'];
    if (!Array.isArray(milestones) && req.body.milestones) {
      // If it's coming as a single value from the form
      milestones = [req.body.milestones];
    }
    
    // Create milestone_status array matching the length of milestones
    const milestone_status = Array(milestones.length).fill('pending');

    // Process required_skills properly
    let processedSkills = [];
    if (Array.isArray(required_skills)) {
      processedSkills = required_skills;
    } else if (required_skills) {
      // If it's a single value, convert to array
      processedSkills = [required_skills];
    }

    // Start a transaction
    await db.query("BEGIN");

    // Insert the project
    const projectResult = await db.query(
      `INSERT INTO projects 
        (title, description, category, required_skills, status, milestones, milestone_status, owner_id, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING project_id`,
      [
        title, 
        description, 
        category, 
        JSON.stringify(processedSkills), // Properly stringify the array
        status || 'Open',
        JSON.stringify(milestones), // Stringify arrays for JSON columns
        JSON.stringify(milestone_status),
        userId
      ]
    );

    const projectId = projectResult.rows[0].project_id;

    // Create a team for the project
    const teamResult = await db.query(
      `INSERT INTO teams (project_id, team_name, created_at)
       VALUES ($1, $2, NOW())
       RETURNING team_id`,
      [projectId, `${title} Team`]
    );

    const teamId = teamResult.rows[0].team_id;

    // Add the owner as a team member with Project Lead role
    await db.query(
      `INSERT INTO team_members (team_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, NOW())`,
      [teamId, userId, 'Project Lead']
    );

    // Commit the transaction
    await db.query("COMMIT");

    // Redirect to the projects page with a success message
    res.redirect(`/projects?success=Project created successfully`);
  } catch (err) {
    // Rollback in case of error
    await db.query("ROLLBACK");
    console.error("Database error:", err);
    res.render("project-form", {
      user: req.session.user,
      isNew: true,
      project: req.body,
      error: "Failed to create project: " + err.message,
      success: null,
      title: "Create Project",
      currentPage: 'projects'
    });
  }
});

app.post("/projects/:id/update", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.session.user.user_id;
    const { 
      title, 
      description, 
      category, 
      required_skills, 
      status, 
      milestones,
      milestone_status
    } = req.body;

    // Check if user is the owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.redirect(
        `/projects?error=You don't have permission to update this project`
      );
    }

    // Update the project
    await db.query(
      `UPDATE projects 
       SET title = $1, description = $2, category = $3, required_skills = $4, 
           status = $5, milestones = $6, milestone_status = $7, updated_at = NOW()
       WHERE project_id = $8`,
      [
        title, 
        description, 
        category, 
        Array.isArray(required_skills) ? required_skills : [required_skills].filter(Boolean), 
        status,
        milestones,
        milestone_status,
        projectId
      ]
    );

    res.redirect(`/projects/${projectId}?success=Project updated successfully`);
  } catch (err) {
    console.error("Database error:", err);
    res.render("project-form", {
      user: req.session.user,
      isNew: false,
      project: { ...req.body, project_id: req.params.id },
      error: "Failed to update project: " + err.message,
      success: null,
      title: "Edit Project",
      currentPage: 'projects'
    });
  }
});
// Add this route to handle the project creation success page
app.get("/projects/:id/success", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Get project details
    const projectResult = await db.query(
      "SELECT p.*, u.name as owner_name, u.profile_pic as owner_pic FROM projects p " +
      "JOIN users u ON p.owner_id = u.user_id " +
      "WHERE p.project_id = $1",
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Project not found",
        title: "Error",
        currentPage: 'projects'
      });
    }

    const project = projectResult.rows[0];
    
    // Parse JSON fields if they're stored as strings
    if (typeof project.required_skills === "string") {
      project.required_skills = JSON.parse(project.required_skills);
    }

    if (typeof project.milestones === "string") {
      project.milestones = JSON.parse(project.milestones);
    }

    if (typeof project.milestone_status === "string") {
      project.milestone_status = JSON.parse(project.milestone_status);
    }

    res.render("project-success", {
      user: req.session.user,
      project: project,
      success: "Project created successfully!",
      title: "Project Created",
      currentPage: 'projects'
    });
  } catch (err) {
    console.error("Error loading project success page:", err);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load project success page",
      title: "Error",
      currentPage: 'projects'
    });
  }
});
// Update project status
app.post("/projects/:id/update-status", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { status } = req.body;

    // Check if user is the owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, req.session.user_id]
    );

    if (projectResult.rows.length === 0) {
      return res.redirect(
        `/projects/${projectId}?error=You don't have permission to update this project`
      );
    }

    // Update project status
    await db.query("UPDATE projects SET status = $1 WHERE project_id = $2", [
      status,
      projectId,
    ]);

    res.redirect(
      `/projects/${projectId}?success=Project status updated to ${status}`
    );
  } catch (err) {
    console.error("Error updating project status:", err);
    res.redirect(
      `/projects/${req.params.id}?error=Failed to update project status`
    );
  }
});

// Add team member to project
app.post("/projects/:id/team/add", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { userId, role } = req.body;

    // Check if user is the owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, req.session.user_id]
    );

    if (projectResult.rows.length === 0) {
      return res.redirect(
        `/projects/${projectId}?error=You don't have permission to manage this team`
      );
    }

    // Get team ID
    const teamResult = await db.query(
      "SELECT * FROM teams WHERE project_id = $1",
      [projectId]
    );

    let teamId;

    if (teamResult.rows.length === 0) {
      // Create team if it doesn't exist
      const newTeamResult = await db.query(
        "INSERT INTO teams (project_id, team_name) VALUES ($1, $2) RETURNING team_id",
        [projectId, projectResult.rows[0].title + " Team"]
      );

      teamId = newTeamResult.rows[0].team_id;
    } else {
      teamId = teamResult.rows[0].team_id;
    }

    // Check if user is already a team member
    const memberResult = await db.query(
      "SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2",
      [teamId, userId]
    );

    if (memberResult.rows.length > 0) {
      // Update role if already a member
      await db.query(
        "UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3",
        [role, teamId, userId]
      );
    } else {
      // Add new team member
      await db.query(
        "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)",
        [teamId, userId, role]
      );
    }

    res.redirect(
      `/projects/${projectId}?success=Team member added successfully`
    );
  } catch (err) {
    console.error("Error adding team member:", err);
    res.redirect(`/projects/${req.params.id}?error=Failed to add team member`);
  }
});

// Remove team member from project
app.post("/projects/:id/team/remove", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { userId } = req.body;

    // Check if user is the owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, req.session.user_id]
    );

    if (projectResult.rows.length === 0) {
      return res.redirect(
        `/projects/${projectId}?error=You don't have permission to manage this team`
      );
    }

    // Get team ID
    const teamResult = await db.query(
      "SELECT * FROM teams WHERE project_id = $1",
      [projectId]
    );

    if (teamResult.rows.length === 0) {
      return res.redirect(`/projects/${projectId}?error=Team not found`);
    }

    const teamId = teamResult.rows[0].team_id;

    // Remove team member
    await db.query(
      "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2",
      [teamId, userId]
    );

    res.redirect(
      `/projects/${projectId}?success=Team member removed successfully`
    );
  } catch (err) {
    console.error("Error removing team member:", err);
    res.redirect(
      `/projects/${req.params.id}?error=Failed to remove team member`
    );
  }
});
app.get("/projects/:id/edit", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Check if user is project owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, req.session.user_id]
    );

    if (projectResult.rows.length === 0) {
      return res.redirect(
        `/projects?error=You don't have permission to edit this project`
      );
    }

    const project = projectResult.rows[0];
    
    // Parse JSON fields if they're stored as strings
    if (typeof project.required_skills === "string") {
      project.required_skills = JSON.parse(project.required_skills);
    }

    if (typeof project.milestones === "string") {
      project.milestones = JSON.parse(project.milestones);
    }

    if (typeof project.milestone_status === "string") {
      project.milestone_status = JSON.parse(project.milestone_status);
    }

    res.render("edit-project", {
      title: "Edit Project",
      currentPage: "projects", // Add this line to fix the error
      user: req.session.user,
      project: project,
      error: null,
      success: null
    });
  } catch (err) {
    console.error("Error loading project edit form:", err);
    res.status(500).render("error", {
      title: "Error",
      currentPage: "projects", // Add this line here too
      user: req.session.user,
      error: "Failed to load project edit form"
    });
  }
});
// Add this route to handle team details
app.get("/teams/:id", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    
    // Validate that teamId is a number
    if (isNaN(parseInt(teamId))) {
      return res.status(400).render("error", {
        user: req.session.user,
        error: "Invalid team ID format",
        title: "Error",
        currentPage: 'teams'
      });
    }
    
    // Get team details
    const teamResult = await db.query(
      "SELECT t.*, p.title as project_title, p.project_id FROM teams t " +
      "JOIN projects p ON t.project_id = p.project_id " +
      "WHERE t.team_id = $1",
      [parseInt(teamId)]
    );
    
    if (teamResult.rows.length === 0) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Team not found",
        title: "Error",
        currentPage: 'teams'
      });
    }
    
    const team = teamResult.rows[0];
    
    // Get team members
    const membersResult = await db.query(
      "SELECT tm.*, u.name, u.profile_pic, u.title as user_title FROM team_members tm " +
      "JOIN users u ON tm.user_id = u.user_id " +
      "WHERE tm.team_id = $1 " +
      "ORDER BY CASE WHEN tm.role = 'Project Lead' THEN 0 ELSE 1 END, tm.joined_at",
      [parseInt(teamId)]
    );
    
    // Render team details page
    res.render("team-details", {
      user: req.session.user,
      team: team,
      members: membersResult.rows,
      error: req.query.error || null,
      success: req.query.success || null,
      title: team.team_name,
      currentPage: 'teams'
    });
  } catch (err) {
    console.error("Error fetching team details:", err);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load team details. Please try again later.",
      title: "Error",
      currentPage: 'teams'
    });
  }
});

// Add this route to handle team member removal
app.post("/teams/:teamId/remove-member/:userId", isAuthenticated, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const memberUserId = parseInt(req.params.userId);
    const currentUserId = req.session.user_id;
    
    // Validate parameters
    if (isNaN(teamId) || isNaN(memberUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parameters"
      });
    }
    
    // Check if current user is project lead or team admin
    const authCheckResult = await db.query(
      "SELECT tm.* FROM team_members tm " +
      "WHERE tm.team_id = $1 AND tm.user_id = $2 AND tm.role IN ('Project Lead', 'Admin')",
      [teamId, currentUserId]
    );
    
    if (authCheckResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to remove team members"
      });
    }
    
    // Don't allow removing yourself
    if (memberUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove yourself from the team"
      });
    }
    
    // Remove the team member
    await db.query(
      "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2",
      [teamId, memberUserId]
    );
    
    res.json({
      success: true,
      message: "Team member removed successfully"
    });
  } catch (err) {
    console.error("Error removing team member:", err);
    res.status(500).json({
      success: false,
      message: "Failed to remove team member"
    });
  }
});
// Teams routes
app.get("/teams", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    
    // Fetch user's teams (teams they are a member of)
    const myTeamsQuery = `
      SELECT t.team_id, t.team_name, p.status, p.title as project_name, p.project_id,
             tm.user_id as member_id, u.name as member_name, tm.role
      FROM teams t
      JOIN projects p ON t.project_id = p.project_id
      JOIN team_members tm ON t.team_id = tm.team_id
      JOIN users u ON tm.user_id = u.user_id
      WHERE tm.user_id = $1
      ORDER BY t.created_at DESC
    `;
    const myTeamsResult = await db.query(myTeamsQuery, [userId]);
    
    // Fetch team members for each team
    const myTeams = await Promise.all(myTeamsResult.rows.map(async (team) => {
      const membersQuery = `
        SELECT u.user_id, u.name, tm.role
        FROM team_members tm
        JOIN users u ON tm.user_id = u.user_id
        WHERE tm.team_id = $1
      `;
      const membersResult = await db.query(membersQuery, [team.team_id]);
      return { ...team, members: membersResult.rows };
    }));
    
    // Fetch featured teams (using project lead role as a proxy for featured teams)
    // Modified to exclude teams for projects owned by the current user
    const featuredTeamsQuery = `
      SELECT t.team_id, t.team_name, p.status, p.title as project_name, p.project_id,
             tm.user_id as member_id, u.name as member_name
      FROM teams t
      JOIN projects p ON t.project_id = p.project_id
      JOIN team_members tm ON t.team_id = tm.team_id
      JOIN users u ON tm.user_id = u.user_id
      WHERE tm.role = 'Project Lead'
      AND p.owner_id != $1
      AND t.team_id NOT IN (
        SELECT team_id FROM team_members WHERE user_id = $1
      )
      ORDER BY t.created_at DESC
      LIMIT 3
    `;
    const featuredTeamsResult = await db.query(featuredTeamsQuery, [userId]);
    
    // Fetch team members and skills for each featured team
    const featuredTeams = await Promise.all(featuredTeamsResult.rows.map(async (team) => {
      const membersQuery = `
        SELECT u.user_id, u.name, tm.role
        FROM team_members tm
        JOIN users u ON tm.user_id = u.user_id
        WHERE tm.team_id = $1
      `;
      const membersResult = await db.query(membersQuery, [team.team_id]);
      
      // Extract skills from project required_skills if available
      const skillsQuery = `
        SELECT required_skills FROM projects WHERE project_id = $1
      `;
      const skillsResult = await db.query(skillsQuery, [team.project_id]);
      
      let skills = ["JavaScript", "React", "Node.js"]; // Default placeholder
      if (skillsResult.rows.length > 0 && skillsResult.rows[0].required_skills) {
        try {
          // If required_skills is stored as JSONB, extract it
          if (typeof skillsResult.rows[0].required_skills === 'object') {
            skills = skillsResult.rows[0].required_skills;
          } else {
            skills = JSON.parse(skillsResult.rows[0].required_skills);
          }
        } catch (e) {
          console.error("Error parsing skills:", e);
        }
      }
      
      return { 
        ...team, 
        members: membersResult.rows,
        skills: skills,
        is_featured: true // Since we're selecting project leads as featured
      };
    }));
    
    // Fetch all teams
    const allTeamsQuery = `
      SELECT t.team_id, t.team_name, p.status, p.title as project_name, p.project_id,
             tm.user_id as member_id, u.name as member_name
      FROM teams t
      JOIN projects p ON t.project_id = p.project_id
      JOIN team_members tm ON t.team_id = tm.team_id
      JOIN users u ON tm.user_id = u.user_id
      WHERE tm.role = 'Project Lead'
      AND p.owner_id != $1
      AND t.team_id NOT IN (
        SELECT team_id FROM team_members WHERE user_id = $1
      )
      ORDER BY t.created_at DESC
    `;
    const allTeamsResult = await db.query(allTeamsQuery, [userId]);
    
    // Fetch team members and check if user is a member for each team
    const allTeams = await Promise.all(allTeamsResult.rows.map(async (team) => {
      const membersQuery = `
        SELECT u.user_id, u.name, tm.role
        FROM team_members tm
        JOIN users u ON tm.user_id = u.user_id
        WHERE tm.team_id = $1
      `;
      const membersResult = await db.query(membersQuery, [team.team_id]);
      
      // Extract skills from project required_skills
      const skillsQuery = `
        SELECT required_skills FROM projects WHERE project_id = $1
      `;
      const skillsResult = await db.query(skillsQuery, [team.project_id]);
      
      let skills = ["JavaScript", "React", "Node.js"]; // Default placeholder
      if (skillsResult.rows.length > 0 && skillsResult.rows[0].required_skills) {
        try {
          // If required_skills is stored as JSONB, extract it
          if (typeof skillsResult.rows[0].required_skills === 'object') {
            skills = skillsResult.rows[0].required_skills;
          } else {
            skills = JSON.parse(skillsResult.rows[0].required_skills);
          }
        } catch (e) {
          console.error("Error parsing skills:", e);
        }
      }
      
      // Check if the current user is a member of this team
      const isMemberQuery = `
        SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2
      `;
      const isMemberResult = await db.query(isMemberQuery, [team.team_id, userId]);
      const is_member = isMemberResult.rows.length > 0;
      
      return { 
        ...team, 
        members: membersResult.rows,
        skills: skills,
        is_member: is_member
      };
    }));
    
    res.render("teams", {
      user: req.session.user,
      myTeams: myTeams,
      featuredTeams: featuredTeams,
      allTeams: allTeams,
      currentPage: 'teams'
    });
  } catch (error) {
    console.error("Error fetching teams data:", error);
    res.status(500).render("error", { 
      message: "Failed to load teams data", 
      error: error,
      user: req.session.user
    });
  }
});

// Route to get a specific team's details
app.get("/teams/:teamId", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.session.user.user_id;
    
    // Fetch team details
    const teamQuery = `
      SELECT t.*, p.title as project_name, p.project_id
      FROM teams t
      JOIN projects p ON t.project_id = p.project_id
      WHERE t.team_id = $1
    `;
    const teamResult = await db.query(teamQuery, [teamId]);
    
    if (teamResult.rows.length === 0) {
      return res.status(404).render("error", { 
        message: "Team not found", 
        error: { status: 404 },
        user: req.session.user,
        title: "Team Not Found",
        currentPage: 'teams'
      });
    }
    
    const team = teamResult.rows[0];
    
    // Fetch team members
    const membersQuery = `
      SELECT u.user_id, u.name, u.email, u.profile_pic, tm.role, tm.joined_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.user_id
      WHERE tm.team_id = $1
      ORDER BY CASE WHEN tm.role = 'Project Lead' THEN 0 ELSE 1 END, tm.joined_at
    `;
    const membersResult = await db.query(membersQuery, [teamId]);
    team.members = membersResult.rows;
    
    // Find the team leader (member with Project Lead role)
    const leaderMember = team.members.find(member => member.role === 'Project Lead');
    if (leaderMember) {
      team.leader_id = leaderMember.user_id;
      team.leader_name = leaderMember.name;
    }
    
    // Get project skills instead of team skills since we don't have a team_skills table
    const skillsQuery = `
      SELECT required_skills FROM projects WHERE project_id = $1
    `;
    const skillsResult = await db.query(skillsQuery, [team.project_id]);
    
    let skills = [];
    if (skillsResult.rows.length > 0 && skillsResult.rows[0].required_skills) {
      try {
        // If required_skills is stored as JSONB, extract it
        if (typeof skillsResult.rows[0].required_skills === 'object') {
          skills = skillsResult.rows[0].required_skills;
        } else {
          skills = JSON.parse(skillsResult.rows[0].required_skills);
        }
        
        // Convert to the format expected by the template
        team.skills = skills.map((skill, index) => ({
          skill_id: index + 1,
          skill_name: skill
        }));
      } catch (e) {
        console.error("Error parsing skills:", e);
        team.skills = [];
      }
    } else {
      team.skills = [];
    }
    
    // Check if the current user is a member and get their role
    const userRoleQuery = `
      SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2
    `;
    const userRoleResult = await db.query(userRoleQuery, [teamId, userId]);
    team.userRole = userRoleResult.rows.length > 0 ? userRoleResult.rows[0].role : null;
    team.isMember = userRoleResult.rows.length > 0;
    
    res.render("team-details", {
      user: req.session.user,
      team: team,
      title: `Team: ${team.team_name}`,
      currentPage: 'teams'
    });
  } catch (error) {
    console.error("Error fetching team details:", error);
    res.status(500).render("error", { 
      message: "Failed to load team details", 
      error: error,
      user: req.session.user,
      title: "Error",
      currentPage: 'teams'
    });
  }
});
// Route to join a team
app.post("/teams/:teamId/join", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.session.user.user_id;
    
    // Check if the team exists - removed status check since column doesn't exist
    const teamQuery = `
      SELECT * FROM teams WHERE team_id = $1
    `;
    const teamResult = await db.query(teamQuery, [teamId]);
    
    if (teamResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Team not found" 
      });
    }
    
    // Check if user is already a member
    const memberCheckQuery = `
      SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2
    `;
    const memberCheckResult = await db.query(memberCheckQuery, [teamId, userId]);
    
    if (memberCheckResult.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "You are already a member of this team" 
      });
    }
    
    // Add user to the team
    const joinQuery = `
      INSERT INTO team_members (team_id, user_id, role, joined_at)
      VALUES ($1, $2, 'Member', NOW())
    `;
    await db.query(joinQuery, [teamId, userId]);
    
    res.json({ success: true, message: "Successfully joined the team" });
  } catch (error) {
    console.error("Error joining team:", error);
    res.status(500).json({ success: false, message: "Failed to join team" });
  }
});

// Route to leave a team
app.post("/teams/:teamId/leave", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.session.user.user_id;
    
    // Check if user is a member
    const memberCheckQuery = `
      SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2
    `;
    const memberCheckResult = await db.query(memberCheckQuery, [teamId, userId]);
    
    if (memberCheckResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "You are not a member of this team" 
      });
    }
    
    // Check if user is the team leader (Project Lead)
    if (memberCheckResult.rows[0].role === 'Project Lead') {
      return res.status(400).json({ 
        success: false, 
        message: "Team leaders cannot leave the team. Transfer leadership first or delete the team." 
      });
    }
    
    // Remove user from the team
    const leaveQuery = `
      DELETE FROM team_members WHERE team_id = $1 AND user_id = $2
    `;
    await db.query(leaveQuery, [teamId, userId]);
    
    res.json({ success: true, message: "Successfully left the team" });
  } catch (error) {
    console.error("Error leaving team:", error);
    res.status(500).json({ success: false, message: "Failed to leave team" });
  }
});

// Route to delete a team
app.post("/teams/:teamId/delete", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.session.user.user_id;
    
    // Check if user is the team leader
    const leaderCheckQuery = `
      SELECT 1 FROM team_members 
      WHERE team_id = $1 AND user_id = $2 AND role = 'Project Lead'
    `;
    const leaderCheckResult = await db.query(leaderCheckQuery, [teamId, userId]);
    
    if (leaderCheckResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: "Only team leaders can delete teams" 
      });
    }
    
    // Delete team members first (due to foreign key constraints)
    await db.query('DELETE FROM team_members WHERE team_id = $1', [teamId]);
    
    // Delete the team
    await db.query('DELETE FROM teams WHERE team_id = $1', [teamId]);
    
    res.json({ success: true, message: "Team deleted successfully" });
  } catch (error) {
    console.error("Error deleting team:", error);
    res.status(500).json({ success: false, message: "Failed to delete team" });
  }
});

// Route to create a new team
app.post("/teams/create", isAuthenticated, async (req, res) => {
  try {
    const { teamName, projectId, description, skills, maxMembers, isOpen } = req.body;
    const leaderId = req.session.user.user_id;
    
    // Start a transaction
    await db.query('BEGIN');
    
    // Create the team
    const createTeamQuery = `
      INSERT INTO teams (team_name, project_id, leader_id, description, max_members, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING team_id
    `;
    const teamResult = await db.query(createTeamQuery, [
      teamName, 
      projectId, 
      leaderId, 
      description, 
      maxMembers, 
      isOpen ? 'open' : 'closed'
    ]);
    
    const teamId = teamResult.rows[0].team_id;
    
    // Add the creator as the team leader
    const addLeaderQuery = `
      INSERT INTO team_members (team_id, user_id, role, joined_at)
      VALUES ($1, $2, 'leader', NOW())
    `;
    await db.query(addLeaderQuery, [teamId, leaderId]);
    
    // Add team skills
    if (skills && skills.length > 0) {
      for (const skillId of skills) {
        const addSkillQuery = `
          INSERT INTO team_skills (team_id, skill_id)
          VALUES ($1, $2)
        `;
        await db.query(addSkillQuery, [teamId, skillId]);
      }
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: "Team created successfully", 
      teamId: teamId 
    });
  } catch (error) {
    // Rollback in case of error
    await db.query('ROLLBACK');
    console.error("Error creating team:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create team", 
      error: error.message 
    });
  }
});
// Route to serve profile pictures
app.get("/profile-pic/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Query the user's profile picture
    const query = "SELECT profile_pic FROM users WHERE user_id = $1";
    const result = await db.query(query, [userId]);
    
    if (result.rows.length > 0 && result.rows[0].profile_pic) {
      // If the profile_pic is a URL, redirect to it
      if (result.rows[0].profile_pic.startsWith('http')) {
        return res.redirect(result.rows[0].profile_pic);
      }
      
      // Otherwise, serve the file from the uploads directory
      const filePath = path.join(__dirname, 'public', 'uploads', result.rows[0].profile_pic);
      return res.sendFile(filePath);
    }
    
    // If no profile pic is found, serve a default image
    res.sendFile(path.join(__dirname, 'public', 'images', 'default-avatar.png'));
  } catch (error) {
    console.error("Error serving profile picture:", error);
    res.sendFile(path.join(__dirname, 'public', 'images', 'default-avatar.png'));
  }
});
// Chat system routes
app.get("/chats", isAuthenticated, async (req, res) => {
  try {
    // Get all chats for the user
    const chatsResult = await db.query(
      `SELECT c.*, 
        CASE 
          WHEN c.sender_id = $1 THEN u2.name
          ELSE u1.name
        END AS chat_with,
        CASE 
          WHEN c.sender_id = $1 THEN u2.profile_pic
          ELSE u1.profile_pic
        END AS chat_with_pic,
        (
          SELECT message FROM messages 
          WHERE chat_id = c.chat_id 
          ORDER BY sent_at DESC 
          LIMIT 1
        ) AS last_message,
        (
          SELECT sent_at FROM messages 
          WHERE chat_id = c.chat_id 
          ORDER BY sent_at DESC 
          LIMIT 1
        ) AS last_message_time
      FROM chats c
      JOIN users u1 ON c.sender_id = u1.user_id
      JOIN users u2 ON c.receiver_id = u2.user_id
      WHERE c.sender_id = $1 OR c.receiver_id = $1
      ORDER BY last_message_time DESC`,
      [req.session.user_id]
    );

    const chats = chatsResult.rows;

    res.render("chats", {
      user: req.session.user,
      chats,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    console.error("Error fetching chats:", err);
    res.status(500).send("Server error");
  }
});

// Get chat messages
app.get("/chats/:id", isAuthenticated, async (req, res) => {
  try {
    const chatId = req.params.id;

    // Check if user is part of this chat
    const chatResult = await db.query(
      "SELECT * FROM chats WHERE chat_id = $1 AND (sender_id = $2 OR receiver_id = $2)",
      [chatId, req.session.user_id]
    );

    if (chatResult.rows.length === 0) {
      return res.redirect("/chats?error=Chat not found");
    }

    const chat = chatResult.rows[0];

    // Get other user's info
    const otherUserId =
      chat.sender_id === req.session.user_id
        ? chat.receiver_id
        : chat.sender_id;
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [otherUserId]
    );

    const otherUser = userResult.rows[0];

    // Get messages
    const messagesResult = await db.query(
      "SELECT * FROM messages WHERE chat_id = $1 ORDER BY sent_at ASC",
      [chatId]
    );

    const messages = messagesResult.rows;

    // Mark messages as read
    await db.query(
      "UPDATE messages SET is_read = true WHERE chat_id = $1 AND receiver_id = $2",
      [chatId, req.session.user_id]
    );

    res.render("chat-detail", {
      user: req.session.user,
      chat,
      otherUser,
      messages,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    console.error("Error fetching chat messages:", err);
    res.status(500).send("Server error");
  }
});

// Send message
app.post("/chats/send", isAuthenticated, async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    // Check if chat exists
    const chatResult = await db.query(
      "SELECT * FROM chats WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)",
      [req.session.user_id, receiverId]
    );

    let chatId;

    if (chatResult.rows.length === 0) {
      // Create new chat
      const newChatResult = await db.query(
        "INSERT INTO chats (sender_id, receiver_id) VALUES ($1, $2) RETURNING chat_id",
        [req.session.user_id, receiverId]
      );

      chatId = newChatResult.rows[0].chat_id;
    } else {
      chatId = chatResult.rows[0].chat_id;
    }

    // Send message
    await db.query(
      "INSERT INTO messages (chat_id, sender_id, receiver_id, message) VALUES ($1, $2, $3, $4)",
      [chatId, req.session.user_id, receiverId, message]
    );

    res.redirect(`/chats/${chatId}`);
  } catch (err) {
    console.error("Error sending message:", err);
    res.redirect("/chats?error=Failed to send message");
  }
});
// Add this after your other project routes
// Project deletion route
app.post("/projects/:id/delete", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Check if user owns the project
    const projectResult = await db.query(
      "SELECT owner_id FROM projects WHERE project_id = $1",
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.json({ success: false, message: "Project not found" });
    }

    if (projectResult.rows[0].owner_id !== req.session.user_id) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    // Start transaction
    await db.query("BEGIN");

    // Delete project applications
    await db.query("DELETE FROM applications WHERE project_id = $1", [projectId]);

    // Delete team members
    await db.query(
      "DELETE FROM team_members WHERE team_id IN (SELECT team_id FROM teams WHERE project_id = $1)",
      [projectId]
    );

    // Delete teams
    await db.query("DELETE FROM teams WHERE project_id = $1", [projectId]);

    // Delete project updates
    await db.query("DELETE FROM project_updates WHERE project_id = $1", [projectId]);

    // Delete project comments
    await db.query("DELETE FROM comments WHERE project_id = $1", [projectId]);

    // Finally, delete the project
    await db.query("DELETE FROM projects WHERE project_id = $1", [projectId]);

    await db.query("COMMIT");

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error deleting project:", error);
    res.json({ success: false, message: "Failed to delete project" });
  }
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
