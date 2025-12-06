import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Target, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Beer, Rating } from '../types';
import { motion } from 'framer-motion';

interface BeerScore {
    beer: Beer;
    avgScore: number;
    avgTaste: number;
    avgMouthfeel: number;
    avgOverall: number;
    ratingCount: number;
    ratings: (Rating & { profiles: { full_name: string | null } })[];
}

interface VoterStats {
    userId: string;
    name: string;
    avgRating: number;
    ratingCount: number;
}

export default function Leaderboard() {
    const { id } = useParams<{ id: string }>();
    const [sessionName, setSessionName] = useState('');
    const [beerScores, setBeerScores] = useState<BeerScore[]>([]);
    const [voterStats, setVoterStats] = useState<VoterStats[]>([]);
    const [filterCriteria, setFilterCriteria] = useState<'all' | 'taste' | 'mouthfeel' | 'overall'>('all');
    const [loading, setLoading] = useState(true);

    const fetchLeaderboardData = async () => {
        if (!id) return;

        try {
            const { data: session } = await supabase
                .from('sessions')
                .select('name')
                .eq('id', id)
                .single();

            if (session) setSessionName(session.name);

            const { data: ratings } = await supabase
                .from('ratings')
                .select(`
                    *,
                    beers (*),
                    profiles (full_name)
                `)
                .eq('session_id', id);

            if (!ratings) return;

            const beerMap = new Map<string, BeerScore>();
            const voterMap = new Map<string, { total: number; count: number; name: string }>();

            ratings.forEach((rating: any) => {
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

                const userId = rating.user_id;
                if (!voterMap.has(userId)) {
                    voterMap.set(userId, {
                        total: 0,
                        count: 0,
                        name: rating.profiles?.full_name || 'Anonymous',
                    });
                }
                const voter = voterMap.get(userId)!;
                voter.total += rating.overall;
                voter.count++;
            });

            const scores = Array.from(beerMap.values()).map((score) => ({
                ...score,
                avgTaste: score.avgTaste / score.ratingCount,
                avgMouthfeel: score.avgMouthfeel / score.ratingCount,
                avgOverall: score.avgOverall / score.ratingCount,
                avgScore: (score.avgTaste + score.avgMouthfeel + score.avgOverall) / 3,
            }));

            const sortedScores = scores.sort((a, b) => {
                switch (filterCriteria) {
                    case 'taste':
                        return b.avgTaste - a.avgTaste;
                    case 'mouthfeel':
                        return b.avgMouthfeel - a.avgMouthfeel;
                    case 'overall':
                        return b.avgOverall - a.avgOverall;
                    default:
                        return b.avgScore - a.avgScore;
                }
            });

            setBeerScores(sortedScores);

            const stats = Array.from(voterMap.entries()).map(([userId, data]) => ({
                userId,
                name: data.name,
                avgRating: data.total / data.count,
                ratingCount: data.count,
            }));

            setVoterStats(stats.sort((a, b) => b.avgRating - a.avgRating));
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboardData();

        const channel = supabase
            .channel(`leaderboard-${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ratings',
                    filter: `session_id=eq.${id}`,
                },
                () => {
                    fetchLeaderboardData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, filterCriteria]);

    const getRankEmoji = (index: number) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `${index + 1}.`;
    };

    const mostOptimistic = voterStats[0];
    const mostCritical = voterStats[voterStats.length - 1];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Laster inn resultater...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-4">
            <header className="glass sticky top-0 z-40 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <Link
                                to={`/session/${id}`}
                                className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <div className="p-1.5 bg-amber-500/20 rounded flex-shrink-0">
                                <Trophy className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg sm:text-xl font-bold text-white truncate">{sessionName}</h1>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-slate-400">Direkte</span>
                                </div>
                            </div>
                        </div>

                        <select
                            value={filterCriteria}
                            onChange={(e) => setFilterCriteria(e.target.value as any)}
                            className="bg-slate-800 border border-white/20 rounded-lg px-2 py-1 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="all">Alle</option>
                            <option value="taste">Smak</option>
                            <option value="mouthfeel">Munnfølelse</option>
                            <option value="overall">Helhet</option>
                        </select>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-3">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                    <div className="lg:col-span-3 space-y-2">
                        {beerScores.length === 0 ? (
                            <div className="glass rounded-xl p-8 text-center">
                                <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-white mb-1">Ingen vurderinger ennå</h3>
                                <p className="text-slate-400 text-sm">Begynn å vurdere øl for å se resultatlisten!</p>
                            </div>
                        ) : (
                            beerScores.map((score, index) => (
                                <motion.div
                                    key={score.beer.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    className={`glass rounded-lg p-2.5 ${index === 0 ? 'border border-amber-500/50' : ''
                                        }`}
                                >
                                    {/* Header Row */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="text-xl font-bold text-amber-500 w-8 text-center flex-shrink-0">
                                            {getRankEmoji(index)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-white truncate leading-tight">{score.beer.name}</h3>
                                            <p className="text-slate-400 text-xs truncate leading-tight">{score.beer.brewery}</p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {/* Criteria scores inline */}
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-400">T:</span>
                                                <span className="text-white font-medium w-6">{score.avgTaste.toFixed(1)}</span>
                                                <span className="text-slate-400">M:</span>
                                                <span className="text-white font-medium w-6">{score.avgMouthfeel.toFixed(1)}</span>
                                                <span className="text-slate-400">O:</span>
                                                <span className="text-white font-medium w-6">{score.avgOverall.toFixed(1)}</span>
                                            </div>
                                            {/* Average score */}
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-amber-500 leading-tight">
                                                    {score.avgScore.toFixed(1)}
                                                </div>
                                                <div className="text-xs text-slate-400 leading-tight">{score.ratingCount}v</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Voters - Compact inline layout */}
                                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                                        {score.ratings.map((rating) => {
                                            const totalStars = rating.taste + rating.mouthfeel + rating.overall;
                                            const maxStars = 15;

                                            return (
                                                <div
                                                    key={rating.id}
                                                    className="flex items-center gap-1.5 bg-slate-800/30 rounded px-2 py-1"
                                                    title={`${rating.profiles?.full_name || 'Anonymous'}: ${totalStars}/${maxStars} stars`}
                                                >
                                                    <span className="text-white text-xs font-medium truncate max-w-[80px]">
                                                        {rating.profiles?.full_name?.split(' ')[0] || 'Anon'}
                                                    </span>
                                                    <div className="flex items-center gap-0.5">
                                                        {Array.from({ length: 5 }, (_, i) => {
                                                            const starThreshold = i * 3; // Each visual star represents 3 actual stars (15/5)
                                                            const isFilled = totalStars > starThreshold;
                                                            const isPartial = totalStars > starThreshold && totalStars < starThreshold + 3;

                                                            return (
                                                                <Star
                                                                    key={i}
                                                                    className={`w-3 h-3 ${isFilled
                                                                        ? 'fill-amber-500 text-amber-500'
                                                                        : 'fill-slate-700 text-slate-700'
                                                                        } ${isPartial ? 'opacity-60' : ''}`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                    <span className="text-amber-500 font-medium text-xs">
                                                        {totalStars}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    <div className="space-y-3">
                        {mostOptimistic && (
                            <div className="glass rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                    <h3 className="font-bold text-white text-sm">Mest optimistisk</h3>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-green-500 truncate">{mostOptimistic.name}</div>
                                    <div className="text-xs text-slate-400">
                                        Avg: {mostOptimistic.avgRating.toFixed(1)}/5
                                    </div>
                                </div>
                            </div>
                        )}

                        {mostCritical && voterStats.length > 1 && (
                            <div className="glass rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                    <h3 className="font-bold text-white text-sm">Mest kritisk</h3>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-red-500 truncate">{mostCritical.name}</div>
                                    <div className="text-xs text-slate-400">
                                        Avg: {mostCritical.avgRating.toFixed(1)}/5
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="glass rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Target className="w-4 h-4 text-amber-500" />
                                <h3 className="font-bold text-white text-sm">Alle deltakere</h3>
                            </div>
                            <div className="space-y-1">
                                {voterStats.map((voter) => (
                                    <div key={voter.userId} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-300 truncate">{voter.name}</span>
                                        <span className="text-amber-500 font-medium flex-shrink-0 ml-2">{voter.avgRating.toFixed(1)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
