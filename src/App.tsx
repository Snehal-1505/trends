import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  FileText, 
  RefreshCw, 
  ChevronRight, 
  Instagram, 
  Youtube, 
  Linkedin, 
  Twitter,
  LayoutDashboard,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  MessageSquare,
  Share2,
  Heart,
  Play,
  Lightbulb,
  Target,
  Rocket,
  Globe,
  Shield,
  Music2,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trend, TrendDetails } from './types';

const PlatformIcon = ({ platform }: { platform?: string }) => {
  const p = (platform || '').toLowerCase();
  if (p.includes('instagram')) return <Instagram className="w-4 h-4 text-pink-500" />;
  if (p.includes('youtube')) return <Youtube className="w-4 h-4 text-red-500" />;
  if (p.includes('linkedin')) return <Linkedin className="w-4 h-4 text-blue-600" />;
  if (p.includes('twitter') || p.includes('x')) return <Twitter className="w-4 h-4 text-sky-500" />;
  return <TrendingUp className="w-4 h-4 text-gray-500" />;
};

const TrendingTicker = ({ trends }: { trends: Trend[] }) => {
  return (
    <div className="bg-slate-900 text-white py-2 overflow-hidden relative border-b border-white/10">
      <div className="flex whitespace-nowrap animate-marquee items-center gap-12">
        {trends.length > 0 ? [...trends, ...trends].map((trend, i) => (
          <div key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
            <span className="text-indigo-400"># {trend.name}</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400">{trend.views} REACH</span>
            <span className="text-slate-500">•</span>
            <span className="text-pink-400">{trend.category}</span>
          </div>
        )) : (
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest opacity-50">
            <span>Scanning Global Social Media for Real-Time Trends...</span>
          </div>
        )}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
};

const MarketPulse = ({ trends }: { trends: Trend[] }) => {
  const categories = Array.from(new Set(trends.map(t => t.category)));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-indigo-600" />
          </div>
          <h4 className="font-bold text-slate-900">Global Reach</h4>
        </div>
        <p className="text-2xl font-black text-slate-900">
          {trends.reduce((acc, t) => acc + (parseInt(t.views) || 0), 0)}M+
        </p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Impressions</p>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-900">Market Pulse</h4>
        </div>
        <p className="text-2xl font-black text-slate-900">
          {categories.length}
        </p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Active Categories</p>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-pink-600" />
          </div>
          <h4 className="font-bold text-slate-900">Influencer Density</h4>
        </div>
        <p className="text-2xl font-black text-slate-900">
          {trends.reduce((acc, t) => acc + t.influencers_count, 0)}
        </p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Key Participants</p>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h4 className="font-bold text-slate-900">Brand Adoption</h4>
        </div>
        <p className="text-2xl font-black text-slate-900">
          {trends.reduce((acc, t) => acc + t.companies_count, 0)}
        </p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Corporate Movers</p>
      </div>
    </div>
  );
};

export default function App() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<TrendDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'strategy' | 'content'>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [recencyFilter, setRecencyFilter] = useState<string>('All');
  const [regenerating, setRegenerating] = useState<Record<string, boolean>>({});
  const [scriptTones, setScriptTones] = useState<Record<string, string>>({});
  const [scriptDurations, setScriptDurations] = useState<Record<string, string>>({});

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        if (err?.message?.includes('429') || err?.status === 429 || err?.code === 429) {
          if (i === maxRetries - 1) throw err;
          const delay = Math.pow(2, i) * 3000;
          console.log(`Rate limit hit, retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        throw err;
      }
    }
  };

  const fetchTrends = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedIndustry !== 'All') params.append('industry', selectedIndustry);
      if (searchKeyword) params.append('keyword', searchKeyword);
      if (recencyFilter !== 'All') params.append('recency', recencyFilter);

      const res = await fetch(`/api/trends?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        console.error(`API Error (${res.status}): ${text.substring(0, 100)}`);
        throw new Error(`Failed to fetch trends: ${res.status}`);
      }
      const data = await res.json();
      setTrends(data);
    } catch (err: any) {
      console.error("Fetch Trends Error:", err);
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        setError("Could not connect to the server. Please ensure the backend is running.");
      } else {
        setError(err.message || "Failed to load trends.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [selectedCategory, selectedIndustry, searchKeyword, recencyFilter]);

  useEffect(() => {
    // Auto-refresh every 15 minutes
    const interval = setInterval(() => {
      console.log('Auto-refreshing trends...');
      fetchTrends();
    }, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchTrendDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/trends/${id}`);
      if (!res.ok) {
        const text = await res.text();
        console.error(`API Error (${res.status}): ${text.substring(0, 100)}`);
        throw new Error(`Failed to fetch trend details: ${res.status}`);
      }
      const data = await res.json();
      setSelectedTrend(data);
      setActiveTab('analysis');
    } catch (err) {
      console.error("Fetch Trend Details Error:", err);
    }
  };

  const runResearch = async () => {
    setResearching(true);
    setError(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Identify and analyze 8-10 viral trends currently dominating social media (TikTok, Instagram, YouTube, Twitter/X, LinkedIn) specifically from the LAST 48 HOURS as of ${new Date().toLocaleString()}.
        
        CRITICAL: You MUST cover a diverse mix of categories to provide a "Complete Market Pulse". Include at least one trend from EACH of these categories:
        1. AI & Automation (Technical breakthroughs, new tools)
        2. Finance & Fintech (Investing, crypto, economy)
        3. Lifestyle & Fashion (Aesthetics, wellness, travel)
        4. B2B & Professional (Workplace culture, LinkedIn strategies)
        5. Gaming & Entertainment (Viral games, meme culture)
        6. Education & Career (Learning hacks, job market)
        
        You are an AI Marketing Intelligence System and Automation Engineer with 20+ years of experience in digital marketing strategy, viral content analysis, influencer trend monitoring, and social media algorithm behavior.

        Your task is to research real-time trending topics across social media platforms and provide marketing insights and content strategy specifically for:
        1. TechnoEdgeLS (Focus: AI Automation, Enterprise Workflows, Technical Implementation)
        2. Pavan Lalwani (PL.com) (Focus: Technology Education, Simplified Learning, Career Growth)

        RESEARCH CRITERIA (STRICT VALIDATION):
        - Use Google Search to find trends active in the last 48 hours.
        - Scan: Instagram Reels, YouTube Shorts, TikTok, X (Twitter), LinkedIn.
        - VALID Trend: Used by at least 10+ different influencers.
        - INFLUENCER QUALITY: Each influencer must have a minimum of 1 Million followers.
        - VOLUME: Minimum 5 million total views across posts.
        - SEARCH QUERIES: "trending social media topics last 48 hours", "viral instagram reels yesterday", "trending tiktok sounds today", "trending linkedin topics for tech", "latest viral finance trends", "trending lifestyle aesthetics 2024".

        DATA TO EXTRACT FOR EACH TREND:
        - Trend Name, Category, Industry.
        - Trend Period: How long this trend has been active (e.g., "Active for 24 hours", "Began 2 days ago").
        - Platform Dominance (Ranking of platforms).
        - Performance Metrics: Total Views, Likes, Shares, Comments, Total Videos.
        - Trend Participants (Influencers): List 3-5 specific influencers who have ACTIVELY FOLLOWED or PARTICIPATED in this trend (Name, Platform, Followers, Video Name/Title, Video Link, Views, and a concise relevance_reason). 
        - Trend Participants (Companies): List 2-3 specific company brands who have ACTIVELY ADOPTED this trend (Name, Platform, Video Name/Title, Video Link).

        **STRICT LINK & CONTENT VALIDATION PROTOCOL (APPLIES TO ALL LINKS):**
        1. **PRIORITY 1 (Specific Video):** You MUST provide the exact URL of the specific viral video where the influencer/company followed the trend.
        2. **VIDEO NAME:** You MUST provide the actual title or caption of that specific video as it appears on the platform.
        3. **PARTICIPATION PROOF:** Every influencer and company listed MUST have a corresponding video link that proves they followed the trend.
        4. **FORBIDDEN:** Never generate 'hallucinated', placeholder, or dead links. Every link must be a real, functional URL.
        5. **ACCURACY:** Ensure the link matches the platform and the specific trend content.
        - Performance Score (0-100) based on virality, influencer adoption, and company usage.

        MARKETING STRATEGY & CONTENT GENERATION (MANDATORY):
        - For EVERY trend identified, you MUST generate exactly TWO sets of recommendations: one for TechnoEdgeLS and one for Pavan Lalwani (PL.com).
        - Generate 3 high-impact Marketing Ideas for each company.
        - Generate PROPER, professional Viral Content Scripts for 3 platforms: Instagram/TikTok Reel, YouTube Shorts, and LinkedIn Post for BOTH companies.
        - SCRIPT QUALITY STANDARDS:
          - Instagram/TikTok: Focus on visual pacing, trending audio cues, and high-energy delivery. Use [Visual] and [Audio] tags to describe the scene.
          - YouTube Shorts: Focus on rapid value delivery and loop-ability. Use a fast-paced, high-retention structure.
          - LinkedIn: Focus on professional insights, authority building, and structured storytelling with line breaks and relevant emojis.
        - SCRIPT STRUCTURE (MANDATORY FOR ALL):
          1. Hook (0-3 seconds): A high-retention psychological trigger or pattern interrupt.
          2. Value: The core educational or entertaining message.
          3. Demonstration: Specific visual or technical proof (e.g., "[Visual] Show screen recording of AI tool").
          4. Result: The tangible outcome, ROI, or transformation.
          5. CTA: A specific, high-conversion call to action tailored to the platform.

        Return the data in a strict JSON format:
        {
          "trends": [
            {
              "id": "unique-slug",
              "name": "Trend Name",
              "vibe": "Aesthetic/Technical/High-Energy/etc",
              "category": "AI tools/Automation/Business growth/etc",
              "industry": "Tech/Business/Education",
              "trend_period": "Active for 36 hours",
              "primary_platform": "Instagram Reels",
              "secondary_platforms": "YouTube Shorts, TikTok, LinkedIn",
              "views": "50M+",
              "likes": "5M",
              "shares": "1M",
              "comments": "500K",
              "total_videos": "12,000",
              "course_survey": "Detailed analysis of why this trend works for education/B2B.",
              "educational_mapping": [
                { "title": "The Hook", "description": "..." },
                { "title": "The Bridge", "description": "..." },
                { "title": "The Value", "description": "..." },
                { "title": "The CTA", "description": "..." }
              ],
              "virality_score": 92,
              "platform_performance": [
                { "platform": "Instagram Reels", "videos": "12,000", "views": "48M" }
              ],
              "influencers": [
                { 
                  "name": "Influencer Name", 
                  "platform": "TikTok", 
                  "followers": "5M", 
                  "video_name": "How I Automated My Entire Business with AI",
                  "video_link": "https://www.instagram.com/reels/C4Y9k8vS9z8/", 
                  "views": "10M",
                  "engagement_rate": "4.5%",
                  "niche": "AI/Tech",
                  "relevance_reason": "..."
                }
              ],
              "companies": [
                { 
                  "name": "Brand A", 
                  "platform": "Instagram", 
                  "video_name": "Our Team's AI Workflow Revealed",
                  "content_type": "Educational Reel", 
                  "views": "1.8M", 
                  "video_link": "..." 
                }
              ],
              "recommendations": [
                {
                  "company_name": "TechnoEdgeLS",
                  "ideas": ["Idea 1", "Idea 2", "Idea 3"],
                  "reel_script": "...",
                  "shorts_script": "...",
                  "linkedin_post": {
                    "body": "...",
                    "interactive_element": { "type": "Poll", "content": "..." }
                  }
                },
                {
                  "company_name": "Pavan Lalwani (PL.com)",
                  "ideas": ["Idea 1", "Idea 2", "Idea 3"],
                  "reel_script": "...",
                  "shorts_script": "...",
                  "linkedin_post": {
                    "body": "...",
                    "interactive_element": { "type": "Q&A", "content": "..." }
                  }
                }
              ]
            }
          ]
        }
      `;
 
      const result = await retryWithBackoff(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }]
        }
      }));

      let text = result.text;
      // Basic cleanup for common JSON issues
      text = text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/^```json/, '').replace(/```$/, '').trim();
      }

      const data = JSON.parse(text);
      
      const saveRes = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!saveRes.ok) throw new Error("Failed to save research");
      
      await fetchTrends();
      setResearching(false);
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes('429') || err?.status === 429 || err?.code === 429) {
        setError("AI Quota Exceeded. Please try again in a few minutes or check your Gemini API billing details.");
      } else {
        setError(err?.message || "An unexpected error occurred during research.");
      }
      setResearching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const regenerateScript = async (company: string, platform: string, currentScript: string, tone: string, duration?: string) => {
    const key = `${company}-${platform}`;
    setRegenerating(prev => ({ ...prev, [key]: true }));
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Rewrite the following ${platform} script for ${company} to have a ${tone} tone of voice${duration ? ` and a duration of approximately ${duration}` : ''}.
        Maintain the core message and value but adapt the language, pacing, and style to match the requested tone and timing.
        
        Original Script:
        ${currentScript}
        
        Return ONLY the rewritten script text.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const newScript = response.text || currentScript;

      if (selectedTrend) {
        const updatedTrend = { ...selectedTrend };
        const recIndex = updatedTrend.recommendations.findIndex(r => r.company_name === company);
        if (recIndex !== -1) {
          if (platform === 'Instagram Reel') updatedTrend.recommendations[recIndex].reel_script = newScript;
          if (platform === 'YouTube Shorts') updatedTrend.recommendations[recIndex].shorts_script = newScript;
          if (platform === 'LinkedIn Post') {
             try {
                const li = JSON.parse(updatedTrend.recommendations[recIndex].linkedin_post);
                li.body = newScript;
                updatedTrend.recommendations[recIndex].linkedin_post = JSON.stringify(li);
             } catch(e) {
                updatedTrend.recommendations[recIndex].linkedin_post = newScript;
             }
          }
          setSelectedTrend(updatedTrend);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(prev => ({ ...prev, [key]: false }));
    }
  };

  const SidebarItem = ({ id, icon: Icon, label, active, onClick }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        active 
          ? 'bg-indigo-50 text-indigo-600' 
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#fcfcfc] font-sans selection:bg-indigo-100 selection:text-indigo-700 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200/60 flex flex-col bg-white z-20">
        <div className="p-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">TrendIntel AI</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Trend Discovery" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          {selectedTrend && (
            <>
              <SidebarItem 
                icon={TrendingUp} 
                label="Trend Analysis" 
                active={activeTab === 'analysis'} 
                onClick={() => setActiveTab('analysis')} 
              />
              <SidebarItem 
                icon={Target} 
                label="Recommendations" 
                active={activeTab === 'strategy'} 
                onClick={() => setActiveTab('strategy')} 
              />
              <SidebarItem 
                icon={Zap} 
                label="Content Engine" 
                active={activeTab === 'content'} 
                onClick={() => setActiveTab('content')} 
              />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="mb-4 px-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Last Update</p>
            <p className="text-xs font-medium text-slate-600">{new Date().toLocaleTimeString()}</p>
          </div>
          <button
            onClick={runResearch}
            disabled={researching}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-indigo-200"
          >
            <RefreshCw className={`w-4 h-4 ${researching ? 'animate-spin' : ''}`} />
            <span>{researching ? 'Scanning...' : 'Sync Intelligence'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar">
        <TrendingTicker trends={trends} />
        <div className="p-10 max-w-6xl mx-auto">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600"
            >
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </motion.div>
          )}
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="mb-12 flex items-end justify-between">
                  <div>
                    <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Trend Discovery</h2>
                    <p className="text-slate-500 font-medium">Real-time social media intelligence for TechnoEdgeLS & PL.com</p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={runResearch}
                      disabled={researching}
                      className="bg-slate-900 text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all text-sm"
                    >
                      <RefreshCw className={`w-4 h-4 ${researching ? 'animate-spin' : ''}`} />
                      <span>{researching ? 'Scanning...' : 'Research Now'}</span>
                    </button>
                    <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live Monitoring</span>
                    </div>
                  </div>
                </div>

                <MarketPulse trends={trends} />

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Search Keywords</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search trends, categories..."
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Industry Filter</label>
                      <select
                        value={selectedIndustry}
                        onChange={(e) => setSelectedIndustry(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                      >
                        <option value="All">All Industries</option>
                        {Array.from(new Set(trends.map(t => t.industry))).filter(Boolean).map(ind => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Trend Recency</label>
                      <select
                        value={recencyFilter}
                        onChange={(e) => setRecencyFilter(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                      >
                        <option value="All">All Time</option>
                        <option value="24">Past 24 Hours</option>
                        <option value="48">Past 48 Hours</option>
                        <option value="168">Past 7 Days</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                  {['All', ...Array.from(new Set(trends.map(t => t.category)))].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedCategory === cat 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                          : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-64 card animate-pulse" />
                    ))}
                  </div>
                ) : trends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <TrendingUp className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No trends discovered yet</h3>
                    <p className="text-slate-500 mb-8 text-center max-w-sm">
                      Click "Sync Intelligence" in the sidebar to perform real-time research across social media platforms.
                    </p>
                    <button
                      onClick={runResearch}
                      disabled={researching}
                      className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                      <RefreshCw className={`w-4 h-4 ${researching ? 'animate-spin' : ''}`} />
                      <span>{researching ? 'Searching Live...' : 'Start Real-Time Research'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trends.map((trend) => (
                        <motion.div
                          key={trend.id}
                          whileHover={{ y: -4, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
                          onClick={() => fetchTrendDetails(trend.id)}
                          className="group card p-6 cursor-pointer hover:border-indigo-200 transition-all duration-300"
                        >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2">
                            <PlatformIcon platform={trend.primary_platform} />
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">
                              {trend.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600">{trend.virality_score}%</span>
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors leading-tight">
                          {trend.name}
                        </h3>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-4">{trend.trend_period}</p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-slate-50 p-3 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reach</p>
                            <p className="text-sm font-bold text-slate-700">{trend.views}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Videos</p>
                            <p className="text-sm font-bold text-slate-700">{trend.total_videos}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">{trend.influencers_count} Influencers</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">{trend.companies_count} Brands</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'analysis' && selectedTrend && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Trend Overview */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                      <div className="flex items-center gap-3 mb-6">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full uppercase tracking-widest">
                          {selectedTrend.category}
                        </span>
                        <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-widest">
                          {selectedTrend.industry}
                        </span>
                      </div>
                      <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-6">{selectedTrend.name}</h2>
                      <p className="text-lg text-slate-600 leading-relaxed mb-8">
                        {selectedTrend.course_survey}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Reach</p>
                          <p className="text-xl font-bold text-slate-900">{selectedTrend.views}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Engagement</p>
                          <p className="text-xl font-bold text-slate-900">{selectedTrend.engagement}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Videos</p>
                          <p className="text-xl font-bold text-slate-900">{selectedTrend.total_videos}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Influencers</p>
                          <p className="text-xl font-bold text-slate-900">{selectedTrend.influencers_count}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" /> Platform Dominance
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedTrend.platform_performance.map((perf, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              {perf.platform.toLowerCase().includes('instagram') && <Instagram className="w-6 h-6 text-pink-500" />}
                              {perf.platform.toLowerCase().includes('youtube') && <Youtube className="w-6 h-6 text-red-600" />}
                              {perf.platform.toLowerCase().includes('linkedin') && <Linkedin className="w-6 h-6 text-blue-600" />}
                              {perf.platform.toLowerCase().includes('tiktok') && <Music2 className="w-6 h-6 text-black" />}
                              {!['instagram', 'youtube', 'linkedin', 'tiktok'].some(p => perf.platform.toLowerCase().includes(p)) && <Globe className="w-6 h-6 text-slate-400" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-slate-700">{perf.platform}</span>
                                <span className="text-xs font-bold text-indigo-600">{perf.views}</span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-500 h-full rounded-full" 
                                  style={{ width: `${Math.min(100, (parseInt(perf.views.replace(/[^0-9]/g, '')) / 1000000) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Score & Influencers */}
                  <div className="space-y-8">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Trend Performance Score</h3>
                      <div className="relative w-40 h-40 mx-auto mb-6">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle
                            className="text-slate-100 stroke-current"
                            strokeWidth="8"
                            fill="transparent"
                            r="42"
                            cx="50"
                            cy="50"
                          />
                          <circle
                            className="text-indigo-600 stroke-current transition-all duration-1000 ease-out"
                            strokeWidth="8"
                            strokeLinecap="round"
                            fill="transparent"
                            r="42"
                            cx="50"
                            cy="50"
                            style={{
                              strokeDasharray: 263.89,
                              strokeDashoffset: 263.89 - (263.89 * selectedTrend.virality_score) / 100
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-bold text-slate-900">{selectedTrend.virality_score}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Viral Index</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        Based on influencer adoption, cross-platform velocity, and engagement depth.
                      </p>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-500" /> Influencers Following Trend
                      </h3>
                      <div className="space-y-4">
                        {selectedTrend.influencers.map((inf, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl transition-colors group">
                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                              {inf.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{inf.name}</p>
                              <p className="text-[10px] font-medium text-slate-500 mb-1">{inf.followers} • {inf.platform}</p>
                              {inf.video_name && (
                                <p className="text-[10px] italic text-indigo-500 truncate mb-1">"{inf.video_name}"</p>
                              )}
                              {inf.relevance_reason && (
                                <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">{inf.relevance_reason}</p>
                              )}
                            </div>
                            <a 
                              href={inf.video_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all"
                            >
                              <Play className="w-3 h-3 fill-current" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-500" /> Brands Following Trend
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedTrend.companies.map((comp, idx) => (
                      <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-900">{comp.name}</h4>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-wider">
                            {comp.platform}
                          </span>
                        </div>
                        {comp.video_name && (
                          <p className="text-[10px] italic text-emerald-600 mb-4 truncate">"{comp.video_name}"</p>
                        )}
                        <div className="flex items-center gap-4 mb-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Views</p>
                            <p className="text-sm font-bold text-slate-700">{comp.views}</p>
                          </div>
                          <div className="w-px h-6 bg-slate-200" />
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strategy</p>
                            <p className="text-xs font-medium text-slate-600 truncate">{comp.content_type}</p>
                          </div>
                        </div>
                        <a 
                          href={comp.video_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all"
                        >
                          View Execution <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'strategy' && selectedTrend && (
              <motion.div
                key="strategy"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Marketing Recommendations</h3>
                      <p className="text-slate-500 font-medium">Strategic adoption paths for TechnoEdgeLS and Pavan Lalwani.</p>
                    </div>
                    <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase tracking-widest">
                      Trend: {selectedTrend.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {selectedTrend.recommendations.map((rec, idx) => {
                      const ideas = JSON.parse(rec.ideas || '[]');
                      const isTechno = (rec.company_name || '').toLowerCase().includes('techno');
                      
                      return (
                        <div key={idx} className="space-y-8">
                          <div className={`flex items-center gap-4 p-6 rounded-2xl ${isTechno ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                              <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Target Brand</p>
                              <h4 className="text-xl font-bold">{rec.company_name}</h4>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Strategic Ideas</h5>
                            {ideas.map((idea: string, i: number) => (
                              <div key={i} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm">
                                  <Zap className="w-4 h-4" />
                                </div>
                                <p className="text-sm font-medium text-slate-700 leading-relaxed">{idea}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Educational Mapping Section */}
                <div className="bg-slate-900 rounded-3xl p-10 text-white">
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-indigo-400" /> Educational Mapping
                      </h3>
                      <p className="text-slate-400 font-medium">How to bridge this trend into high-value educational content.</p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest border border-indigo-400/30 px-3 py-1 rounded-full">
                      4-Step Hijack Blueprint
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {(() => {
                      let mapping = [];
                      try {
                        mapping = typeof selectedTrend.educational_mapping === 'string' 
                          ? JSON.parse(selectedTrend.educational_mapping) 
                          : (selectedTrend.educational_mapping || []);
                      } catch (e) {
                        mapping = [];
                      }

                      if (mapping.length === 0) {
                        return <div className="col-span-4 text-center py-12 text-slate-500 italic">No mapping data available.</div>;
                      }

                      return mapping.map((step: any, i: number) => (
                        <div key={i} className="relative group">
                          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all duration-300 h-full">
                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold mb-6 shadow-lg shadow-indigo-600/20">
                              0{i + 1}
                            </div>
                            <h4 className="font-bold text-white mb-3 text-sm uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{step.title}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                          </div>
                          {i < mapping.length - 1 && (
                            <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-20">
                              <ArrowRight className="w-6 h-6 text-white/20" />
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'content' && selectedTrend && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Content Engine</h3>
                      <p className="text-slate-500 font-medium">Viral-ready scripts optimized for platform engagement.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center border-2 border-white"><Instagram className="w-4 h-4 text-pink-500" /></div>
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center border-2 border-white"><Youtube className="w-4 h-4 text-red-600" /></div>
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white"><Linkedin className="w-4 h-4 text-blue-600" /></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {selectedTrend.recommendations.map((rec, idx) => {
                      const isTechno = (rec.company_name || '').toLowerCase().includes('techno');
                      
                      return (
                        <div key={idx} className="space-y-8">
                          <div className={`flex items-center gap-4 p-6 rounded-2xl ${isTechno ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                              <FileText className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Content For</p>
                              <h4 className="text-xl font-bold">{rec.company_name}</h4>
                            </div>
                          </div>

                          {/* Instagram Reel Section */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-pink-50 rounded-lg">
                                  <Instagram className="w-4 h-4 text-pink-500" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Instagram Reel Script</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <select 
                                  value={scriptTones[`${rec.company_name}-Instagram Reel`] || 'Professional'} 
                                  onChange={(e) => setScriptTones(prev => ({ ...prev, [`${rec.company_name}-Instagram Reel`]: e.target.value }))}
                                  className="text-[10px] font-bold bg-slate-100 border-none rounded-full px-2 py-1 text-slate-600 focus:ring-0 cursor-pointer"
                                >
                                  <option value="Professional">Professional</option>
                                  <option value="Humorous">Humorous</option>
                                  <option value="Educational">Educational</option>
                                  <option value="Energetic">Energetic</option>
                                </select>
                                <select 
                                  value={scriptDurations[`${rec.company_name}-Instagram Reel`] || '30s'} 
                                  onChange={(e) => setScriptDurations(prev => ({ ...prev, [`${rec.company_name}-Instagram Reel`]: e.target.value }))}
                                  className="text-[10px] font-bold bg-slate-100 border-none rounded-full px-2 py-1 text-slate-600 focus:ring-0 cursor-pointer"
                                >
                                  <option value="15s">15s</option>
                                  <option value="30s">30s</option>
                                  <option value="60s">60s</option>
                                  <option value="90s">90s</option>
                                </select>
                                <button 
                                  onClick={() => regenerateScript(
                                    rec.company_name, 
                                    'Instagram Reel', 
                                    rec.reel_script, 
                                    scriptTones[`${rec.company_name}-Instagram Reel`] || 'Professional',
                                    scriptDurations[`${rec.company_name}-Instagram Reel`] || '30s'
                                  )}
                                  disabled={regenerating[`${rec.company_name}-Instagram Reel`]}
                                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-[10px] font-bold text-indigo-600 rounded-full transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  <RefreshCw className={`w-3 h-3 ${regenerating[`${rec.company_name}-Instagram Reel`] ? 'animate-spin' : ''}`} />
                                  {regenerating[`${rec.company_name}-Instagram Reel`] ? 'Regenerating...' : 'Regenerate'}
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(rec.reel_script)}
                                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 rounded-full transition-colors"
                                >
                                  Copy Script
                                </button>
                              </div>
                            </div>
                            <div className="bg-slate-900 rounded-2xl p-6 text-slate-300 text-sm leading-relaxed font-mono whitespace-pre-wrap border-l-4 border-pink-500 shadow-xl relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Instagram className="w-24 h-24" />
                              </div>
                              <div className="relative z-10">
                                {rec.reel_script}
                              </div>
                            </div>
                          </div>

                          {/* YouTube Shorts Section */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-red-50 rounded-lg">
                                  <Youtube className="w-4 h-4 text-red-600" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">YouTube Shorts Script</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <select 
                                  value={scriptTones[`${rec.company_name}-YouTube Shorts`] || 'Professional'} 
                                  onChange={(e) => setScriptTones(prev => ({ ...prev, [`${rec.company_name}-YouTube Shorts`]: e.target.value }))}
                                  className="text-[10px] font-bold bg-slate-100 border-none rounded-full px-2 py-1 text-slate-600 focus:ring-0 cursor-pointer"
                                >
                                  <option value="Professional">Professional</option>
                                  <option value="Humorous">Humorous</option>
                                  <option value="Educational">Educational</option>
                                  <option value="Energetic">Energetic</option>
                                </select>
                                <select 
                                  value={scriptDurations[`${rec.company_name}-YouTube Shorts`] || '30s'} 
                                  onChange={(e) => setScriptDurations(prev => ({ ...prev, [`${rec.company_name}-YouTube Shorts`]: e.target.value }))}
                                  className="text-[10px] font-bold bg-slate-100 border-none rounded-full px-2 py-1 text-slate-600 focus:ring-0 cursor-pointer"
                                >
                                  <option value="15s">15s</option>
                                  <option value="30s">30s</option>
                                  <option value="60s">60s</option>
                                </select>
                                <button 
                                  onClick={() => regenerateScript(
                                    rec.company_name, 
                                    'YouTube Shorts', 
                                    rec.shorts_script, 
                                    scriptTones[`${rec.company_name}-YouTube Shorts`] || 'Professional',
                                    scriptDurations[`${rec.company_name}-YouTube Shorts`] || '30s'
                                  )}
                                  disabled={regenerating[`${rec.company_name}-YouTube Shorts`]}
                                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-[10px] font-bold text-indigo-600 rounded-full transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  <RefreshCw className={`w-3 h-3 ${regenerating[`${rec.company_name}-YouTube Shorts`] ? 'animate-spin' : ''}`} />
                                  {regenerating[`${rec.company_name}-YouTube Shorts`] ? 'Regenerating...' : 'Regenerate'}
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(rec.shorts_script)}
                                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 rounded-full transition-colors"
                                >
                                  Copy Script
                                </button>
                              </div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-600 text-sm leading-relaxed font-medium whitespace-pre-wrap border-l-4 border-red-500 shadow-sm relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Youtube className="w-24 h-24" />
                              </div>
                              <div className="relative z-10">
                                {rec.shorts_script}
                              </div>
                            </div>
                          </div>

                          {/* LinkedIn Post Section */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 rounded-lg">
                                  <Linkedin className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">LinkedIn Scroll-Stopper</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <select 
                                  value={scriptTones[`${rec.company_name}-LinkedIn Post`] || 'Professional'} 
                                  onChange={(e) => setScriptTones(prev => ({ ...prev, [`${rec.company_name}-LinkedIn Post`]: e.target.value }))}
                                  className="text-[10px] font-bold bg-slate-100 border-none rounded-full px-2 py-1 text-slate-600 focus:ring-0 cursor-pointer"
                                >
                                  <option value="Professional">Professional</option>
                                  <option value="Humorous">Humorous</option>
                                  <option value="Educational">Educational</option>
                                  <option value="Energetic">Energetic</option>
                                </select>
                                <button 
                                  onClick={() => {
                                    let body = '';
                                    try { body = JSON.parse(rec.linkedin_post).body; } catch(e) { body = rec.linkedin_post; }
                                    regenerateScript(rec.company_name, 'LinkedIn Post', body, scriptTones[`${rec.company_name}-LinkedIn Post`] || 'Professional');
                                  }}
                                  disabled={regenerating[`${rec.company_name}-LinkedIn Post`]}
                                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-[10px] font-bold text-indigo-600 rounded-full transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  <RefreshCw className={`w-3 h-3 ${regenerating[`${rec.company_name}-LinkedIn Post`] ? 'animate-spin' : ''}`} />
                                  {regenerating[`${rec.company_name}-LinkedIn Post`] ? 'Regenerating...' : 'Regenerate'}
                                </button>
                                <button 
                                  onClick={() => {
                                    try {
                                      const li = JSON.parse(rec.linkedin_post);
                                      copyToClipboard(`${li.body}\n\nEngagement Booster: ${li.interactive_element?.content}`);
                                    } catch (e) {
                                      copyToClipboard(rec.linkedin_post);
                                    }
                                  }}
                                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 rounded-full transition-colors"
                                >
                                  Copy Post
                                </button>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-700 text-sm leading-relaxed font-medium whitespace-pre-wrap shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                                  <Linkedin className="w-24 h-24" />
                                </div>
                                <div className="relative z-10">
                                  {(() => {
                                    try {
                                      return JSON.parse(rec.linkedin_post).body;
                                    } catch (e) {
                                      return rec.linkedin_post;
                                    }
                                  })()}
                                </div>
                              </div>
                              {(() => {
                                try {
                                  const li = JSON.parse(rec.linkedin_post);
                                  if (li.interactive_element) {
                                    return (
                                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Share2 className="w-3 h-3 text-blue-600" />
                                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Engagement Booster: {li.interactive_element.type}</p>
                                        </div>
                                        <p className="text-sm font-bold text-blue-900">{li.interactive_element.content}</p>
                                      </div>
                                    );
                                  }
                                } catch (e) {}
                                return null;
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
