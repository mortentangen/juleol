export interface Session {
    id: string;
    created_at: string;
    name: string;
    date: string;
    host_id: string;
    is_active: boolean;
    join_code: string;
}

export interface Beer {
    id: string;
    name: string;
    brewery: string;
    style: string;
    abv: number;
    description: string;
    image_url?: string;
    addedBy?: {
        full_name: string | null;
        email: string | null;
        avatar_url?: string | null;
    };
}

export interface Rating {
    id: string;
    created_at: string;
    user_id: string;
    beer_id: string;
    session_id: string;
    taste: number;
    mouthfeel: number;
    overall: number;
    comment?: string;
}

// --- Leaderboard Types ---

export interface BeerScore {
    beer: Beer;
    avgScore: number;
    avgTaste: number;
    avgMouthfeel: number;
    avgOverall: number;
    ratingCount: number;
    ratings: RatingWithRelations[];
}

export interface VoterStats {
    userId: string;
    name: string;
    avgRating: number;
    ratingCount: number;
    avgTaste: number;
    avgMouthfeel: number;
    comments: number;
    perfectScores: number;
    lowestScore?: { beerName: string; score: number };
    stdDev: number;
    totalDeviations: number;
}

export interface FunStats {
    tasteMaster?: { name: string; score: number };
    mouthfeelMaster?: { name: string; score: number };
    hater?: { name: string; beerName: string; score: number };
    lover?: { name: string; count: number };
    chatterbox?: { name: string; count: number };
    maverick?: { name: string; deviation: number };
    hipster?: { name: string; score: number };
    mestBog?: { name: string; consistency: number };
}

export interface LeaderboardData {
    beerScores: BeerScore[];
    voterStats: VoterStats[];
    funStats: FunStats;
}

export interface RatingWithRelations extends Rating {
    beers: Beer;
    profiles: {
        full_name: string | null;
        email: string | null;
    } | null;
}

export type FilterCriteria = 'all' | 'taste' | 'mouthfeel' | 'overall';
