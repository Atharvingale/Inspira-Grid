import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";

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
    res.render("dashboard");
  } else {
    res.render("index", { user: req.session.user });
  }
});

app.get("/dashboard", async (req, res) => {
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
    
    const activeTeamsResult = await db.query(
      "SELECT COUNT(*) AS count FROM team_members WHERE user_id = $1",
      [user.user_id]
    );

    const userStats = {
      activeProjects: activeProjectsResult.rows[0].count,
      activeTeams: activeTeamsResult.rows[0].count
    };

    // Get user's projects
    const userProjectsResult = await db.query(
      "SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 5",
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
       ORDER BY t.created_at DESC
       LIMIT 5`,
      [user.user_id]
    );
    
    const userTeams = userTeamsResult.rows;

    // Get recent messages
    const recentMessagesResult = await db.query(
      `SELECT c.*, u.name AS sender_name, 
        CASE
          WHEN NOW() - c.sent_at < INTERVAL '1 hour' THEN EXTRACT(MINUTE FROM (NOW() - c.sent_at)) || ' mins ago'
          WHEN NOW() - c.sent_at < INTERVAL '1 day' THEN EXTRACT(HOUR FROM (NOW() - c.sent_at)) || ' hrs ago'
          ELSE EXTRACT(DAY FROM (NOW() - c.sent_at)) || ' days ago'
        END AS time_ago
       FROM chats c
       JOIN users u ON c.sender_id = u.user_id
       WHERE c.receiver_id = $1
       ORDER BY c.sent_at DESC
       LIMIT 3`,
      [user.user_id]
    );
    
    const recentMessages = recentMessagesResult.rows;

    // Get applications
    const applicationsResult = await db.query(
      `SELECT a.*, p.title AS project_title
       FROM applications a
       JOIN projects p ON a.project_id = p.project_id
       WHERE a.user_id = $1
       ORDER BY a.applied_at DESC
       LIMIT 3`,
      [user.user_id]
    );
    
    const applications = applicationsResult.rows;

    // Simulate notifications (would be more complex in a real app)
    const notifications = [
      {
        icon: "fas fa-comment",
        message: "You have a new message from " + (recentMessages[0] ? recentMessages[0].sender_name : "a team member"),
        link: "/messages",
        time_ago: "Just now"
      },
      {
        icon: "fas fa-clipboard-check",
        message: "Your application for " + (applications[0] ? applications[0].project_title : "a project") + " was accepted!",
        link: "/applications",
        time_ago: "2 hours ago"
      }
    ];

    // Get recommended projects (based on user skills)
    const recommendedProjectsResult = await db.query(
      `SELECT p.*, u.name AS owner_name FROM projects p
       JOIN users u ON p.owner_id = u.user_id
       WHERE p.status = 'Open'
       AND p.required_skills LIKE $1
       AND p.owner_id != $2
       LIMIT 3`,
      ['%' + (user.skills || '') + '%', user.user_id]
    );
    
    const recommendedProjects = recommendedProjectsResult.rows;

    // Render dashboard with all data
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
    
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/signin?error=An error occurred. Please try again.");
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
      "INSERT INTO users (name, email, password, bio, skills) VALUES ($1, $2, $3, $4, $5) RETURNING user_id", 
      [name, email, password, bio || '', skills || '']
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

// Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/signin");
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});