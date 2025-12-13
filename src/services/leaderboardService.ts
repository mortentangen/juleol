import { getDisplayName } from '../utils/displayName';
import type { Beer, Rating } from '../types';

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
}

export interface LeaderboardData {
    beerScores: BeerScore[];
    voterStats: VoterStats[];
    funStats: FunStats;
}

// Define types for joined data
export interface RatingWithRelations extends Rating {
    beers: Beer;
    profiles: {
        full_name: string | null;
        email: string | null;
    } | null;
}

export function calculateLeaderboardStats(ratings: RatingWithRelations[], filterCriteria: 'all' | 'taste' | 'mouthfeel' | 'overall'): LeaderboardData {
    const beerMap = new Map<string, BeerScore>();
    // Extended voter map to track all ratings for variance/stats
    const voterMap = new Map<string, {
        total: number;
        count: number;
        name: string;
        ratings: number[]; // Total stars per beer
        tasteScores: number[];
        mouthfeelScores: number[];
        comments: number;
        lowScores: { beerName: string; score: number }[];
        perfectScores: number; // Count of 15s
        deviations: number[]; // Deviation from mean per beer
    }>();

    // First pass: Calculate beer statistics (needed for deviations)
    ratings.forEach((rating) => {
        const beerId = rating.beer_id;
        const beer = rating.beers;

        if (!beerMap.has(beerId)) {
            beerMap.set(beerId, {
                beer,
                avgScore: 0,
                avgTaste: 0,
                avgMouthfeel: 0,
                avgOverall: 0,
                ratingCount: 0,
                ratings: [],
            });
        }

        const beerScore = beerMap.get(beerId)!;
        beerScore.ratings.push(rating);
        beerScore.ratingCount++;
        beerScore.avgTaste += rating.taste;
        beerScore.avgMouthfeel += rating.mouthfeel;
        beerScore.avgOverall += rating.overall;

        const ratingTotalStars = rating.taste + rating.mouthfeel + rating.overall;
        beerScore.avgScore += ratingTotalStars;
    });

    // Calculate beer averages for deviation logic
    const beerAverages = new Map<string, number>();
    beerMap.forEach((score, beerId) => {
        // Average TOTAL score for this beer
        beerAverages.set(beerId, score.avgScore / score.ratingCount);
    });

    // Second pass: Voter statistics
    ratings.forEach((rating) => {
        const userId = rating.user_id;
        const beerId = rating.beer_id;
        const ratingTotalStars = rating.taste + rating.mouthfeel + rating.overall;

        if (!voterMap.has(userId)) {
            voterMap.set(userId, {
                total: 0,
                count: 0,
                name: getDisplayName(rating.profiles?.full_name, rating.profiles?.email),
                ratings: [],
                tasteScores: [],
                mouthfeelScores: [],
                comments: 0,
                lowScores: [],
                perfectScores: 0,
                deviations: []
            });
        }

        const voter = voterMap.get(userId)!;
        voter.total += ratingTotalStars;
        voter.count++;
        voter.ratings.push(ratingTotalStars);
        voter.tasteScores.push(rating.taste);
        voter.mouthfeelScores.push(rating.mouthfeel);

        if (rating.comment && rating.comment.length > 0) {
            voter.comments++;
        }

        // Check for lowest score (Hater) - defined as <= 3 total stars (avg 1 per criteria)
        if (ratingTotalStars <= 3) {
            voter.lowScores.push({
                beerName: rating.beers.name || 'Øl',
                score: ratingTotalStars
            });
        }

        // Check for perfect score (Lover)
        if (ratingTotalStars === 15) {
            voter.perfectScores++;
        }

        // Deviation from group average for this beer
        const beerAvg = beerAverages.get(beerId) || 0;
        voter.deviations.push(ratingTotalStars - beerAvg);
    });

    // Process Beer Scores for display
    const scores = Array.from(beerMap.values()).map((score) => ({
        ...score,
        avgTaste: score.avgTaste / score.ratingCount,
        avgMouthfeel: score.avgMouthfeel / score.ratingCount,
        avgOverall: score.avgOverall / score.ratingCount,
    }));

    const sortedScores = scores.sort((a, b) => {
        switch (filterCriteria) {
            case 'taste': return b.avgTaste - a.avgTaste;
            case 'mouthfeel': return b.avgMouthfeel - a.avgMouthfeel;
            case 'overall': return b.avgOverall - a.avgOverall;
            default: return b.avgScore - a.avgScore;
        }
    });

    // Process Voter Stats and calculate Fun Facts
    const stats = Array.from(voterMap.entries()).map(([userId, data]) => {
        // Calculate Variance
        const mean = data.total / data.count;
        const variance = data.ratings.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.count;

        return {
            userId,
            name: data.name,
            avgRating: mean,
            ratingCount: data.count,
            avgTaste: data.tasteScores.reduce((a, b) => a + b, 0) / data.count,
            avgMouthfeel: data.mouthfeelScores.reduce((a, b) => a + b, 0) / data.count,
            comments: data.comments,
            perfectScores: data.perfectScores,
            lowestScore: data.lowScores.sort((a, b) => a.score - b.score)[0], // Lowest of the low
            stdDev: Math.sqrt(variance),
            totalDeviations: data.deviations.reduce((acc, val) => acc + Math.abs(val), 0)
        };
    });

    const sortedVoterStats = stats.sort((a, b) => b.avgRating - a.avgRating);

    // Determine Fun Fact Winners
    const newFunStats: FunStats = {};

    // 1. Smaksdommeren (Highest avg taste)
    const tasteMaster = [...stats].sort((a, b) => b.avgTaste - a.avgTaste)[0];
    if (tasteMaster) newFunStats.tasteMaster = { name: tasteMaster.name, score: tasteMaster.avgTaste };

    // 2. Munnfølelse-entusiasten
    const mouthfeelMaster = [...stats].sort((a, b) => b.avgMouthfeel - a.avgMouthfeel)[0];
    if (mouthfeelMaster) newFunStats.mouthfeelMaster = { name: mouthfeelMaster.name, score: mouthfeelMaster.avgMouthfeel };

    // 3. Hater (Lowest single score)
    let currentHater: { name: string; beerName: string; score: number } | null = null;
    stats.forEach(s => {
        if (s.lowestScore) {
            if (!currentHater || s.lowestScore.score < currentHater.score) {
                currentHater = { name: s.name, ...s.lowestScore };
            }
        }
    });
    if (currentHater) newFunStats.hater = currentHater;

    // 4. Lover (Most perfect scores)
    const lover = [...stats].sort((a, b) => b.perfectScores - a.perfectScores)[0];
    if (lover && lover.perfectScores > 0) newFunStats.lover = { name: lover.name, count: lover.perfectScores };

    // 5. Chatterbox
    const chatter = [...stats].sort((a, b) => b.comments - a.comments)[0];
    if (chatter && chatter.comments > 0) newFunStats.chatterbox = { name: chatter.name, count: chatter.comments };

    // 6. Maverick / Berg-og-dal-bane (Highest Standard Deviation)
    // Filter out people with few votes to avoid skewing
    const qualifiedStats = stats.filter(s => s.ratingCount >= 2);
    const maverick = [...qualifiedStats].sort((a, b) => b.stdDev - a.stdDev)[0];
    if (maverick && maverick.stdDev > 0) newFunStats.maverick = { name: maverick.name, deviation: maverick.stdDev };

    // 7. Hipster (Highest Total Deviation from Consensus)
    // This person disagrees with the group average the most (up or down)
    const hipster = [...qualifiedStats].sort((a, b) => b.totalDeviations - a.totalDeviations)[0];
    if (hipster && hipster.totalDeviations > 0) newFunStats.hipster = { name: hipster.name, score: hipster.totalDeviations };

    return {
        beerScores: sortedScores,
        voterStats: sortedVoterStats,
        funStats: newFunStats
    };
}
