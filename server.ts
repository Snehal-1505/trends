import express from "express";
console.log("[SERVER] Initializing...");
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database.Database;

async function startServer() {
  try {
    db = new Database("marketing_intel.db");
    console.log("[DB] Database connected successfully");
    
    // Schema Migration: Drop old tables if they use the deprecated 'platforms' column
    try {
      const tableInfo = db.prepare("PRAGMA table_info(trends)").all();
      const hasPlatforms = tableInfo.some((col: any) => col.name === 'platforms');
      if (hasPlatforms) {
        console.log("Detected old schema. Dropping tables for migration...");
        db.exec("DROP TABLE IF EXISTS recommendations;");
        db.exec("DROP TABLE IF EXISTS companies;");
        db.exec("DROP TABLE IF EXISTS influencers;");
        db.exec("DROP TABLE IF EXISTS trends;");
      }
    } catch (e) {
      // Table might not exist yet, which is fine
    }

    // Initialize Database
    db.exec(`
      CREATE TABLE IF NOT EXISTS trends (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        industry TEXT NOT NULL,
        primary_platform TEXT NOT NULL,
        secondary_platforms TEXT NOT NULL,
        views TEXT NOT NULL,
        likes TEXT NOT NULL,
        shares TEXT NOT NULL,
        comments TEXT NOT NULL,
        total_videos TEXT NOT NULL,
        influencers_count INTEGER NOT NULL,
        companies_count INTEGER NOT NULL,
        virality_score INTEGER NOT NULL,
        vibe TEXT,
        course_survey TEXT,
        educational_mapping TEXT, -- JSON
        platform_performance TEXT, -- JSON
        trend_period TEXT, -- e.g., "Active for 3 days"
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS influencers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trend_id TEXT NOT NULL,
        name TEXT NOT NULL,
        platform TEXT NOT NULL,
        followers TEXT NOT NULL,
        video_name TEXT,
        video_link TEXT NOT NULL,
        views TEXT NOT NULL,
        engagement_rate TEXT,
        relevance_reason TEXT,
        niche TEXT,
        FOREIGN KEY(trend_id) REFERENCES trends(id)
      );

      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trend_id TEXT NOT NULL,
        name TEXT NOT NULL,
        platform TEXT NOT NULL,
        video_name TEXT,
        content_type TEXT NOT NULL,
        views TEXT NOT NULL,
        video_link TEXT,
        FOREIGN KEY(trend_id) REFERENCES trends(id)
      );

      CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trend_id TEXT NOT NULL,
        company_name TEXT NOT NULL,
        ideas TEXT NOT NULL,
        reel_script TEXT NOT NULL,
        shorts_script TEXT NOT NULL,
        linkedin_post TEXT NOT NULL,
        FOREIGN KEY(trend_id) REFERENCES trends(id)
      );
    `);

    // Migrations
    try { db.exec("ALTER TABLE trends ADD COLUMN primary_platform TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE trends ADD COLUMN secondary_platforms TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE trends ADD COLUMN total_videos TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE trends ADD COLUMN platform_performance TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE influencers ADD COLUMN engagement_rate TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE influencers ADD COLUMN video_name TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE companies ADD COLUMN platform TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE companies ADD COLUMN content_type TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE companies ADD COLUMN views TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE companies ADD COLUMN video_name TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE trends ADD COLUMN vibe TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE trends ADD COLUMN educational_mapping TEXT;"); } catch (e) {}
    try { db.exec("ALTER TABLE trends ADD COLUMN trend_period TEXT;"); } catch (e) {}
  } catch (err) {
    console.error("[DB] Critical error during database initialization:", err);
    throw err;
  }

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Routes
  app.get("/api/trends", (req, res) => {
    const { category, industry, keyword, recency } = req.query;
    let query = "SELECT * FROM trends WHERE 1=1";
    const params: any[] = [];

    if (category && category !== 'All') {
      query += " AND category = ?";
      params.push(category);
    }
    if (industry && industry !== 'All') {
      query += " AND industry = ?";
      params.push(industry);
    }
    if (keyword) {
      query += " AND (name LIKE ? OR category LIKE ? OR industry LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (recency) {
      const hours = parseInt(recency as string);
      if (!isNaN(hours)) {
        query += " AND last_updated >= datetime('now', ?)";
        params.push(`-${hours} hours`);
      }
    }

    query += " ORDER BY virality_score DESC";
    
    const trends = db.prepare(query).all(...params);
    res.json(trends.map((t: any) => ({
      ...t,
      platform_performance: t.platform_performance ? JSON.parse(t.platform_performance) : []
    })));
  });

  app.get("/api/trends/:id", (req, res) => {
    const trend = db.prepare("SELECT * FROM trends WHERE id = ?").get(req.params.id);
    if (!trend) return res.status(404).json({ error: "Trend not found" });

    const influencers = db.prepare("SELECT * FROM influencers WHERE trend_id = ?").all(req.params.id);
    const companies = db.prepare("SELECT * FROM companies WHERE trend_id = ?").all(req.params.id);
    const recommendations = db.prepare("SELECT * FROM recommendations WHERE trend_id = ?").all(req.params.id);

    res.json({ 
      ...trend, 
      platform_performance: trend.platform_performance ? JSON.parse(trend.platform_performance) : [],
      influencers, 
      companies, 
      recommendations 
    });
  });

  app.post("/api/research", async (req, res) => {
    try {
      const data = req.body;
      if (!data || !data.trends) throw new Error("Invalid trend data");

      // Save to DB
      const insertTrend = db.prepare(`
        INSERT OR REPLACE INTO trends (id, name, category, industry, primary_platform, secondary_platforms, views, likes, shares, comments, total_videos, influencers_count, companies_count, virality_score, vibe, course_survey, educational_mapping, platform_performance, trend_period)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertInfluencer = db.prepare(`
        INSERT INTO influencers (trend_id, name, platform, followers, video_name, video_link, views, engagement_rate, relevance_reason, niche)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertCompany = db.prepare(`
        INSERT INTO companies (trend_id, name, platform, video_name, content_type, views, video_link)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const insertRec = db.prepare(`
        INSERT INTO recommendations (trend_id, company_name, ideas, reel_script, shorts_script, linkedin_post)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const trend of data.trends) {
        insertTrend.run(
          trend.id, 
          trend.name || "Unknown", 
          trend.category || "General", 
          trend.industry || "General", 
          trend.primary_platform || "Unknown", 
          trend.secondary_platforms || "Unknown",
          trend.views || "0", 
          trend.likes || "0", 
          trend.shares || "0", 
          trend.comments || "0",
          trend.total_videos || "0", 
          trend.influencers?.length || 0, 
          trend.companies?.length || 0, 
          trend.virality_score || 0, 
          trend.vibe || null, 
          trend.course_survey || "", 
          JSON.stringify(trend.educational_mapping || []),
          JSON.stringify(trend.platform_performance || []),
          trend.trend_period || "Recent"
        );

        // Clear old data for this trend
        db.prepare("DELETE FROM influencers WHERE trend_id = ?").run(trend.id);
        db.prepare("DELETE FROM companies WHERE trend_id = ?").run(trend.id);
        db.prepare("DELETE FROM recommendations WHERE trend_id = ?").run(trend.id);

        for (const inf of trend.influencers) {
          insertInfluencer.run(trend.id, inf.name, inf.platform, inf.followers, inf.video_name || null, inf.video_link, inf.views, inf.engagement_rate || "0%", inf.relevance_reason || null, inf.niche || null);
        }

        for (const comp of trend.companies) {
          insertCompany.run(trend.id, comp.name, comp.platform || "Unknown", comp.video_name || null, comp.content_type || "Unknown", comp.views || "0", comp.video_link || null);
        }

        for (const rec of trend.recommendations) {
          insertRec.run(
            trend.id, 
            rec.company_name || "Unknown", 
            JSON.stringify(rec.ideas || []),
            JSON.stringify(rec.reel_script || {}), 
            rec.shorts_script || "", 
            JSON.stringify(rec.linkedin_post || {})
          );
        }
      }

      res.json({ success: true, count: data.trends.length });
    } catch (error) {
      console.error("Save Research Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Started successfully`);
      console.log(`[SERVER] Listening on http://0.0.0.0:${PORT}`);
      console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Seed the database after server starts
      seedDatabase();
    });
}

function seedDatabase() {
  const count = db.prepare("SELECT COUNT(*) as count FROM trends").get() as any;
  if (count.count > 0) return;

  console.log("Seeding initial trends...");

  const initialTrends = [
    {
      id: "ai-automation-loop",
      name: "The AI Efficiency Loop",
      vibe: "Technical/Minimalist",
      category: "AI Automation",
      industry: "Tech/Business",
      primary_platform: "Instagram Reels",
      secondary_platforms: "LinkedIn, YouTube Shorts",
      views: "12M+",
      likes: "850K",
      shares: "120K",
      comments: "45K",
      total_videos: "8,500",
      virality_score: 94,
      influencers_count: 15,
      companies_count: 8,
      course_survey: "This trend highlights the shift from manual workflows to AI-driven automation. It's perfect for teaching how to integrate LLMs into enterprise systems.",
      educational_mapping: [
        { "title": "The Hook", "description": "Show a cluttered desk vs. a clean one with just a laptop running a script." },
        { "title": "The Bridge", "description": "Explain that the difference is a 10-line Python script using Gemini API." },
        { "title": "The Value", "description": "Demonstrate the script automating a boring task like email sorting." },
        { "title": "The CTA", "description": "Link to the 'AI for Business' masterclass." }
      ],
      platform_performance: [
        { "platform": "Instagram Reels", "videos": "5,200", "views": "7.5M" },
        { "platform": "LinkedIn", "videos": "1,200", "views": "2.1M" },
        { "platform": "YouTube Shorts", "videos": "2,100", "views": "2.4M" }
      ],
      influencers: [
        { name: "TechWithTim", platform: "YouTube", followers: "1.2M", video_link: "https://www.youtube.com/watch?v=fC7oUOUEk70", views: "500K", engagement_rate: "5.2%", niche: "Coding", relevance_reason: "Showcased AI automation tools." },
        { name: "MarketingMax", platform: "Instagram", followers: "450K", video_link: "https://www.instagram.com/reels/C3X8k9vS1z2/", views: "200K", engagement_rate: "4.8%", niche: "Marketing", relevance_reason: "Adapted trend for agency growth." }
      ],
      companies: [
        { name: "Zapier", platform: "Instagram", content_type: "Product Demo", views: "150K", video_link: "https://www.instagram.com/reels/C2p7L9vS3x1/" },
        { name: "Make.com", platform: "LinkedIn", content_type: "Case Study", views: "85K", video_link: "https://www.linkedin.com/posts/make-com_automation-ai-efficiency-activity-7156234567890123456" }
      ],
      recommendations: [
        {
          company_name: "TechnoEdgeLS",
          ideas: ["AI Workflow Audit", "ROI of Automation", "Custom GPT Demo"],
          reel_script: JSON.stringify({
            hook: "Stop wasting 4 hours a day on data entry.",
            scenes: [
              { visual: "Fast cuts of manual typing", text: "This was my client last week." },
              { visual: "Screen recording of Python script", text: "This is them now. 100% automated." }
            ],
            cta: "DM 'AUTO' for a free audit."
          }),
          shorts_script: "The secret to scaling? It's not more people. It's better loops. [Loop back to start]",
          linkedin_post: JSON.stringify({
            body: "Automation isn't about replacing people. It's about replacing the parts of people's jobs they hate.\n\nWe just saved a client 40 hours/week.\n\nHere is how...",
            interactive_element: { type: "Poll", content: "What's your most hated manual task?" }
          })
        },
        {
          company_name: "PavanLalwani.com",
          ideas: ["Python for Beginners", "AI Career Path", "No-Code Tools"],
          reel_script: JSON.stringify({
            hook: "You don't need a CS degree to build AI tools.",
            scenes: [
              { visual: "Pavan smiling at camera", text: "I'll show you how to build a bot in 5 mins." },
              { visual: "Drag and drop interface", text: "No code. Just logic." }
            ],
            cta: "Join my free webinar."
          }),
          shorts_script: "AI is the new Excel. Learn it or get left behind. [Loop back to start]",
          linkedin_post: JSON.stringify({
            body: "The most valuable skill in 2024 isn't coding.\n\nIt's knowing HOW to talk to the machines.\n\nI've simplified the path for you.",
            interactive_element: { type: "Q&A", content: "What's stopping you from learning AI?" }
          })
        }
      ]
    },
    {
      id: "aesthetic-data-viz",
      name: "The Ghibli Data Vibe",
      vibe: "Aesthetic/Coziness",
      category: "Data Science",
      industry: "Education/Tech",
      primary_platform: "TikTok",
      secondary_platforms: "Instagram Reels, YouTube Shorts",
      views: "25M+",
      likes: "2.1M",
      shares: "450K",
      comments: "88K",
      total_videos: "15,000",
      virality_score: 97,
      influencers_count: 25,
      companies_count: 5,
      course_survey: "Using lo-fi beats and Ghibli-style visuals to explain complex data concepts. High retention due to 'cozy' learning environment.",
      educational_mapping: [
        { "title": "The Hook", "description": "Lo-fi music starts, cozy desk setup with a moving chart." },
        { "title": "The Bridge", "description": "Text overlay: 'Data cleaning doesn't have to be stressful.'" },
        { "title": "The Value", "description": "Quick tip on using Pandas for data transformation." },
        { "title": "The CTA", "description": "Follow for more cozy tech tips." }
      ],
      platform_performance: [
        { "platform": "TikTok", "videos": "8,500", "views": "15M" },
        { "platform": "Instagram Reels", "videos": "4,200", "views": "7M" },
        { "platform": "YouTube Shorts", "videos": "2,300", "views": "3M" }
      ],
      influencers: [
        { name: "KenJee", platform: "YouTube", followers: "250K", video_link: "https://www.youtube.com/watch?v=mH0oCDa74tE", views: "150K", engagement_rate: "6.5%", niche: "Data Science", relevance_reason: "Pioneer of the cozy data trend." }
      ],
      companies: [
        { name: "Notion", platform: "Instagram", content_type: "Aesthetic Setup", views: "400K", video_link: "https://www.instagram.com/reels/C1m9K8vS5y4/" }
      ],
      recommendations: [
        {
          company_name: "TechnoEdgeLS",
          ideas: ["Clean Code Aesthetics", "Minimalist Architecture", "Quiet Automation"],
          reel_script: JSON.stringify({
            hook: "Complex systems should feel simple.",
            scenes: [
              { visual: "Clean dashboard loading", text: "This is what 10,000 lines of code looks like." },
              { visual: "Peaceful office view", text: "When it's built right, you don't even notice it." }
            ],
            cta: "Build with us."
          }),
          shorts_script: "The best tech is invisible. [Loop back to start]",
          linkedin_post: JSON.stringify({
            body: "Why is enterprise software so ugly?\n\nIt doesn't have to be.\n\nWe build tools that people actually enjoy using.",
            interactive_element: { type: "Fill-in-the-blank", "content": "My favorite software tool is ________." }
          })
        },
        {
          company_name: "PavanLalwani.com",
          ideas: ["Study With Me", "Cozy Coding", "Simplified Tech"],
          reel_script: JSON.stringify({
            hook: "Let's learn SQL in 60 seconds of peace.",
            scenes: [
              { visual: "Rain on window, laptop open", text: "SELECT * FROM dreams..." },
              { visual: "Code highlighting", text: "WHERE status = 'active';" }
            ],
            cta: "Full course in bio."
          }),
          shorts_script: "Learning tech is a marathon, not a sprint. Take a breath. [Loop back to start]",
          linkedin_post: JSON.stringify({
            body: "Stop rushing.\n\nTech is a language. You learn it one word at a time.\n\nI've made the lessons as peaceful as a morning coffee.",
            interactive_element: { type: "Poll", content: "Morning or Night learner?" }
          })
        }
      ]
    },
    {
      id: "productivity-hacks-2024",
      name: "The 1% Better Workflow",
      vibe: "High-Energy/Productivity",
      category: "Personal Growth",
      industry: "Business/Tech",
      primary_platform: "YouTube Shorts",
      secondary_platforms: "Instagram Reels, X (Twitter)",
      views: "18M+",
      likes: "1.5M",
      shares: "300K",
      comments: "25K",
      total_videos: "10,000",
      virality_score: 92,
      influencers_count: 20,
      companies_count: 12,
      course_survey: "Focuses on small, incremental improvements in tech skills. Perfect for promoting short-form courses and daily learning habits.",
      educational_mapping: [
        { "title": "The Hook", "description": "Fast-paced montage of small wins (coding a function, closing a ticket)." },
        { "title": "The Bridge", "description": "Text: 'You don't need 10 hours. You need 10 minutes of focus.'" },
        { "title": "The Value", "description": "Show a specific keyboard shortcut or AI prompt that saves time." },
        { "title": "The CTA", "description": "Join the 30-day challenge." }
      ],
      platform_performance: [
        { "platform": "YouTube Shorts", "videos": "4,500", "views": "10M" },
        { "platform": "Instagram Reels", "videos": "3,500", "views": "6M" },
        { "platform": "X (Twitter)", "videos": "2,000", "views": "2M" }
      ],
      influencers: [
        { name: "AliAbdaal", platform: "YouTube", followers: "5M", video_link: "https://www.youtube.com/watch?v=iO6vS0_N7fI", views: "2M", engagement_rate: "4.2%", niche: "Productivity", relevance_reason: "Master of the incremental growth trend." }
      ],
      companies: [
        { name: "Todoist", platform: "X", content_type: "Thread", views: "120K", video_link: "https://twitter.com/todoist/status/1745678901234567890" }
      ],
      recommendations: [
        {
          company_name: "TechnoEdgeLS",
          ideas: ["Micro-Automation Tips", "Dev Productivity Hacks", "AI Prompt of the Day"],
          reel_script: JSON.stringify({
            hook: "This one AI prompt saves me 1 hour of debugging.",
            scenes: [
              { visual: "Frustrated dev at screen", text: "Stuck on a bug for hours?" },
              { visual: "Typing prompt into Gemini", text: "Ask it to 'Explain the logic flow of this block'." }
            ],
            cta: "Save this for your next sprint."
          }),
          shorts_script: "Productivity isn't about doing more. It's about doing less, better. [Loop back to start]",
          linkedin_post: JSON.stringify({
            body: "The best developers aren't the fastest typists.\n\nThey're the ones who know which tools to automate.\n\nWe build those tools.",
            interactive_element: { type: "Q&A", content: "What's your #1 productivity killer?" }
          })
        },
        {
          company_name: "PavanLalwani.com",
          ideas: ["10-Min Learning Habit", "Tech Career Roadmap", "Daily Skill Bites"],
          reel_script: JSON.stringify({
            hook: "How to learn Power BI in 10 mins a day.",
            scenes: [
              { visual: "Pavan pointing at a chart", text: "Don't watch 5-hour tutorials." },
              { visual: "Mobile app interface", text: "Just one lesson while you have coffee." }
            ],
            cta: "Start your habit today."
          }),
          shorts_script: "Consistency beats intensity every single time. [Loop back to start]",
          linkedin_post: JSON.stringify({
            body: "Stop waiting for the 'perfect time' to learn.\n\nIt doesn't exist.\n\n10 minutes today is better than 0 minutes tomorrow.",
            interactive_element: { type: "Poll", content: "How much time do you spend learning daily?" }
          })
        }
      ]
    },
    {
      id: "pov-office-chaos",
      name: "POV: Office Chaos",
      vibe: "Comedy/Relatable",
      category: "Entertainment",
      industry: "Corporate/Workplace",
      primary_platform: "TikTok",
      secondary_platforms: "Instagram Reels",
      views: "45M+",
      likes: "4.2M",
      shares: "800K",
      comments: "120K",
      total_videos: "35,000",
      virality_score: 98,
      influencers_count: 40,
      companies_count: 15,
      course_survey: "A high-energy comedy trend where creators act out relatable workplace struggles. Extremely effective for humanizing brands and B2B engagement.",
      educational_mapping: [
        { "title": "The Hook", "description": "Fast-paced music with a text overlay: 'When the meeting could have been an email.'" },
        { "title": "The Bridge", "description": "Dramatic reaction shots or lip-syncing to a funny audio clip." },
        { "title": "The Value", "description": "Subtle product placement (e.g., using a specific software to solve the chaos)." },
        { "title": "The CTA", "description": "Tag a coworker who relates." }
      ],
      platform_performance: [
        { "platform": "TikTok", "videos": "25,000", "views": "30M" },
        { "platform": "Instagram Reels", "videos": "10,000", "views": "15M" }
      ],
      influencers: [
        { name: "CorporateNatalie", platform: "TikTok", followers: "1.5M", video_link: "https://www.tiktok.com/@corporatenatalie/video/7338662366810246442", views: "3.5M", engagement_rate: "8.2%", niche: "Comedy", relevance_reason: "Queen of corporate relatability." },
        { name: "LoicSuberville", platform: "Instagram", followers: "2.1M", video_link: "https://www.instagram.com/reels/C4Y9k8vS9z8/", views: "1.8M", engagement_rate: "7.5%", niche: "Entertainment", relevance_reason: "Master of language and cultural comedy." }
      ],
      companies: [
        { name: "Slack", platform: "TikTok", content_type: "Comedy Skit", views: "600K", video_link: "https://www.tiktok.com/@slack/video/7296568443350174982" },
        { name: "Monday.com", platform: "Instagram", content_type: "Relatable Meme", views: "450K", video_link: "https://www.instagram.com/reels/C3p8L9vS2x1/" }
      ],
      recommendations: [
        {
          company_name: "TechnoEdgeLS",
          ideas: ["The 'Legacy Code' Struggle", "Deployment Day Panic", "Coffee-Driven Development"],
          reel_script: JSON.stringify({
            hook: "POV: You're debugging at 4:59 PM on a Friday.",
            scenes: [
              { visual: "Intense typing, sweating", text: "Just one more fix..." },
              { visual: "Screen turns red", text: "Everything is broken." }
            ],
            cta: "We handle the bugs so you don't have to."
          }),
          shorts_script: "The only thing faster than our code is how fast I run to the coffee machine. [Loop]",
          linkedin_post: JSON.stringify({
            body: "We've all been there.\n\nThe 'quick fix' that takes 6 hours.\n\nAt TechnoEdge, we prioritize stability over speed-hacks.",
            interactive_element: { type: "Poll", content: "What's your Friday afternoon mood?" }
          })
        }
      ]
    },
    {
      id: "meme-marketing-2024",
      name: "The 'Wait, That's Illegal' Meme",
      vibe: "Meme/Sarcastic",
      category: "Meme Culture",
      industry: "General",
      primary_platform: "Instagram Reels",
      secondary_platforms: "X (Twitter), TikTok",
      views: "60M+",
      likes: "5.5M",
      shares: "1.2M",
      comments: "150K",
      total_videos: "50,000",
      virality_score: 99,
      influencers_count: 100,
      companies_count: 25,
      course_survey: "A versatile meme format used to highlight 'hacks' or 'cheats' that feel too good to be true. Perfect for promoting high-value freebies or unique features.",
      educational_mapping: [
        { "title": "The Hook", "description": "Show a 'hack' that saves massive time/money." },
        { "title": "The Bridge", "description": "The classic 'Wait, that's illegal' audio or reaction." },
        { "title": "The Value", "description": "Explain the legitimate tool or method behind the hack." },
        { "title": "The CTA", "description": "Get the tool in bio." }
      ],
      platform_performance: [
        { "platform": "Instagram Reels", "videos": "30,000", "views": "40M" },
        { "platform": "TikTok", "videos": "15,000", "views": "15M" },
        { "platform": "X", "videos": "5,000", "views": "5M" }
      ],
      influencers: [
        { name: "KhabyLame", platform: "TikTok", followers: "160M", video_link: "https://www.tiktok.com/@khaby.lame/video/6954992307200118021", views: "25M", engagement_rate: "12.5%", niche: "Comedy", relevance_reason: "The king of simplifying overcomplicated things." }
      ],
      companies: [
        { name: "Duolingo", platform: "TikTok", content_type: "Meme/Chaos", views: "2.5M", video_link: "https://www.tiktok.com/@duolingo/video/7021669434685005099" }
      ],
      recommendations: [
        {
          company_name: "PavanLalwani.com",
          ideas: ["The 'Excel Cheat' Hack", "Power BI Magic", "Interview Shortcuts"],
          reel_script: JSON.stringify({
            hook: "How I finished a 4-hour report in 4 seconds.",
            scenes: [
              { visual: "Stressed face", text: "Boss: 'I need this by 5.'" },
              { visual: "One click in Power BI", text: "Done." }
            ],
            cta: "Learn the magic in my course."
          }),
          shorts_script: "Work smarter, not harder. [Loop]",
          linkedin_post: JSON.stringify({
            body: "Is it cheating if you're just better at using the tools?\n\nI don't think so.\n\nHere are 3 Power BI hacks that feel illegal.",
            interactive_element: { type: "Poll", content: "Which tool do you want to master?" }
          })
        }
      ]
    },
    {
      id: "quiet-luxury-tech",
      name: "Quiet Luxury Tech",
      vibe: "Minimalist/Premium",
      category: "Lifestyle",
      industry: "Fashion/Tech",
      primary_platform: "Instagram Reels",
      secondary_platforms: "TikTok, Pinterest",
      views: "35M+",
      likes: "2.8M",
      shares: "600K",
      comments: "45K",
      total_videos: "22,000",
      virality_score: 91,
      influencers_count: 30,
      companies_count: 12,
      course_survey: "The shift from flashy gadgets to subtle, high-performance tech that blends into the home. Perfect for high-ticket B2B services.",
      educational_mapping: [
        { "title": "The Hook", "description": "Slow, cinematic shots of a clean, high-end home office." },
        { "title": "The Bridge", "description": "Text: 'Luxury isn't loud. It's efficient.'" },
        { "title": "The Value", "description": "Showcase a high-end AI tool or hardware that simplifies life." },
        { "title": "The CTA", "description": "Elevate your workflow." }
      ],
      platform_performance: [
        { "platform": "Instagram Reels", "videos": "12,000", "views": "20M" },
        { "platform": "TikTok", "videos": "8,000", "views": "12M" }
      ],
      influencers: [
        { name: "LydiaMillen", platform: "Instagram", followers: "1.4M", video_link: "https://www.instagram.com/reels/C4Y9k8vS9z8/", views: "1.2M", engagement_rate: "4.5%", niche: "Lifestyle", relevance_reason: "Embodiment of quiet luxury." }
      ],
      companies: [
        { name: "Apple", platform: "Instagram", content_type: "Aesthetic Product", views: "5M", video_link: "https://www.instagram.com/reels/C3p8L9vS2x1/" }
      ],
      recommendations: [
        {
          company_name: "TechnoEdgeLS",
          ideas: ["Bespoke AI Solutions", "White-Glove Automation", "The Executive Dashboard"],
          reel_script: JSON.stringify({
            hook: "The most powerful tools are the ones you don't see.",
            scenes: [
              { visual: "Clean, minimalist office", text: "We build AI that works in the background." },
              { visual: "Subtle notifications", text: "No noise. Just results." }
            ],
            cta: "Experience quiet efficiency."
          }),
          shorts_script: "True power is silent. [Loop]",
          linkedin_post: JSON.stringify({
            body: "In a world of noise, silence is a competitive advantage.\n\nOur AI systems don't scream for attention. They just deliver ROI.\n\nQuietly.",
            interactive_element: { type: "Q&A", content: "What's your favorite 'quiet' tool?" }
          })
        }
      ]
    },
    {
      id: "crypto-etf-boom",
      name: "The ETF Era",
      vibe: "Educational/Finance",
      category: "Finance",
      industry: "Finance/Tech",
      primary_platform: "YouTube",
      secondary_platforms: "X (Twitter), LinkedIn",
      views: "15M+",
      likes: "1.2M",
      shares: "250K",
      comments: "95K",
      total_videos: "5,000",
      virality_score: 88,
      influencers_count: 15,
      companies_count: 20,
      course_survey: "Explaining the mainstream adoption of crypto through ETFs. High demand for simplified financial education.",
      educational_mapping: [
        { "title": "The Hook", "description": "Headline: 'Wall Street is finally here.'" },
        { "title": "The Bridge", "description": "Explain what an ETF means for the average person." },
        { "title": "The Value", "description": "Break down the risks and rewards in simple terms." },
        { "title": "The CTA", "description": "Download the 'Finance 101' guide." }
      ],
      platform_performance: [
        { "platform": "YouTube", "videos": "2,000", "views": "8M" },
        { "platform": "X", "videos": "2,000", "views": "5M" },
        { "platform": "LinkedIn", "videos": "1,000", "views": "2M" }
      ],
      influencers: [
        { name: "GrahamStephan", platform: "YouTube", followers: "4.5M", video_link: "https://www.youtube.com/watch?v=iO6vS0_N7fI", views: "1.5M", engagement_rate: "5.1%", niche: "Finance", relevance_reason: "Leading voice in financial trends." }
      ],
      companies: [
        { name: "BlackRock", platform: "LinkedIn", content_type: "Market Analysis", views: "300K", video_link: "https://www.linkedin.com/posts/blackrock_etf-crypto-finance-activity-7156234567890123456" }
      ],
      recommendations: [
        {
          company_name: "PavanLalwani.com",
          ideas: ["Finance for Techies", "Crypto Simplified", "Investment Roadmaps"],
          reel_script: JSON.stringify({
            hook: "Is crypto finally safe? Let's talk ETFs.",
            scenes: [
              { visual: "Pavan with a whiteboard", text: "It's not just for hackers anymore." },
              { visual: "Simple chart", text: "Wall Street is buying in." }
            ],
            cta: "Learn the basics in my course."
          }),
          shorts_script: "The future of money is being rewritten. Are you reading? [Loop]",
          linkedin_post: JSON.stringify({
            body: "The line between 'Tech' and 'Finance' is disappearing.\n\nIf you're in tech, you need to understand the money.\n\nI've simplified the ETF boom for you.",
            interactive_element: { type: "Poll", content: "Do you own any crypto?" }
          })
        }
      ]
    }
  ];

  const insertTrend = db.prepare(`
    INSERT INTO trends (id, name, category, industry, primary_platform, secondary_platforms, views, likes, shares, comments, total_videos, influencers_count, companies_count, virality_score, vibe, course_survey, educational_mapping, platform_performance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInfluencer = db.prepare(`
    INSERT INTO influencers (trend_id, name, platform, followers, video_link, views, engagement_rate, relevance_reason, niche)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCompany = db.prepare(`
    INSERT INTO companies (trend_id, name, platform, content_type, views, video_link)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertRec = db.prepare(`
    INSERT INTO recommendations (trend_id, company_name, ideas, reel_script, shorts_script, linkedin_post)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const trend of initialTrends) {
    insertTrend.run(
      trend.id, trend.name, trend.category, trend.industry, trend.primary_platform, trend.secondary_platforms,
      trend.views, trend.likes, trend.shares, trend.comments, trend.total_videos, trend.influencers_count,
      trend.companies_count, trend.virality_score, trend.vibe, trend.course_survey,
      JSON.stringify(trend.educational_mapping), JSON.stringify(trend.platform_performance)
    );

    for (const inf of trend.influencers) {
      insertInfluencer.run(trend.id, inf.name, inf.platform, inf.followers, inf.video_link, inf.views, inf.engagement_rate, inf.relevance_reason, inf.niche);
    }

    for (const comp of trend.companies) {
      insertCompany.run(trend.id, comp.name, comp.platform, comp.content_type, comp.views, comp.video_link);
    }

    for (const rec of trend.recommendations) {
      insertRec.run(trend.id, rec.company_name, JSON.stringify(rec.ideas), rec.reel_script, rec.shorts_script, rec.linkedin_post);
    }
  }

  console.log("Seeding complete.");
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
  process.exit(1);
});
