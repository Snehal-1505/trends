export interface PlatformPerformance {
  platform: string;
  videos: string;
  views: string;
  engagement?: string;
}

export interface Trend {
  id: string;
  name: string;
  category: string;
  industry: string;
  primary_platform: string;
  secondary_platforms: string;
  views: string;
  likes: string;
  shares: string;
  comments: string;
  total_videos: string;
  influencers_count: number;
  companies_count: number;
  virality_score: number;
  vibe?: string;
  course_survey: string;
  educational_mapping?: string; // JSON string of steps
  trend_period: string;
  last_updated: string;
  platform_performance: PlatformPerformance[];
}

export interface Influencer {
  id: number;
  trend_id: string;
  name: string;
  platform: string;
  followers: string;
  profile_link: string;
  video_name?: string;
  video_link: string;
  views: string;
  engagement_rate: string;
  relevance_reason?: string;
  niche?: string;
}

export interface Company {
  id: number;
  trend_id: string;
  name: string;
  platform: string;
  video_name?: string;
  content_type: string;
  views: string;
  video_link?: string;
}

export interface Recommendation {
  id: number;
  trend_id: string;
  company_name: string;
  ideas: string; // JSON string
  reel_script: string; // JSON string (Detailed structure with scenes)
  shorts_script: string;
  linkedin_post: string;
}

export interface TrendDetails extends Trend {
  influencers: Influencer[];
  companies: Company[];
  recommendations: Recommendation[];
}
