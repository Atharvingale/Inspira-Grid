import express from 'express';
const router = express.Router();
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase.js';

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/signin");
};

// Get help center page
router.get("/", isAuthenticated, async (req, res) => {
  try {
    // Get FAQ categories
    const faqRef = collection(db, 'faqs');
    const faqQuery = query(faqRef, orderBy('category'));
    const faqSnapshot = await getDocs(faqQuery);
    
    const faqs = faqSnapshot.docs.reduce((acc, doc) => {
      const data = doc.data();
      if (!acc[data.category]) {
        acc[data.category] = [];
      }
      acc[data.category].push({
        id: doc.id,
        ...data
      });
      return acc;
    }, {});
    
    res.render("help", {
      title: "Help Center",
      user: req.session.user,
      faqs,
      currentPage: 'help'
    });
  } catch (error) {
    console.error("Error loading help center:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load help center. Please try again later.",
      title: "Error"
    });
  }
});

// Get FAQ page
router.get("/faq", isAuthenticated, async (req, res) => {
  try {
    const faqRef = collection(db, 'faqs');
    const faqQuery = query(faqRef, orderBy('category'));
    const faqSnapshot = await getDocs(faqQuery);
    
    const faqs = faqSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.render("faq", {
      title: "Frequently Asked Questions",
      user: req.session.user,
      faqs,
      currentPage: 'help'
    });
  } catch (error) {
    console.error("Error loading FAQ:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load FAQ. Please try again later.",
      title: "Error"
    });
  }
});

// Get contact support page
router.get("/contact", isAuthenticated, (req, res) => {
  res.render("contact", {
    title: "Contact Support",
    user: req.session.user,
    currentPage: 'help'
  });
});

// Submit support ticket
router.post("/ticket", isAuthenticated, async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;
    
    if (!subject || !message || !category || !priority) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    const ticketData = {
      user_id: req.session.user.uid,
      subject,
      message,
      category,
      priority,
      status: 'Open',
      created_at: new Date()
    };
    
    const ticketsRef = collection(db, 'support_tickets');
    await addDoc(ticketsRef, ticketData);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error submitting ticket:", error);
    res.status(500).json({ error: "Failed to submit support ticket" });
  }
});

// Get user's support tickets
router.get("/tickets", isAuthenticated, async (req, res) => {
  try {
    const ticketsRef = collection(db, 'support_tickets');
    const ticketsQuery = query(
      ticketsRef,
      where('user_id', '==', req.session.user.uid),
      orderBy('created_at', 'desc')
    );
    
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.render("tickets", {
      title: "My Support Tickets",
      user: req.session.user,
      tickets,
      currentPage: 'help'
    });
  } catch (error) {
    console.error("Error loading tickets:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load support tickets. Please try again later.",
      title: "Error"
    });
  }
});

export default router; 