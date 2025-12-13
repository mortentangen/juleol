import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDisplayName } from '../utils/displayName';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Target, Star, Volume2, Radio } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { calculateLeaderboardStats, type BeerScore, type VoterStats, type FunStats, type RatingWithRelations } from '../services/leaderboardService';
import TalkingSanta from '../components/TalkingSanta';
import { useLiveCommentator } from '../hooks/useLiveCommentator';
import ApiKeyModal from '../components/ApiKeyModal';

type FilterCriteria = 'all' | 'taste' | 'mouthfeel' | 'overall';

interface FunFactCardProps {
    title: string;
    icon: React.ElementType;
    color: string;
    name: string;
    value: string;
    delay?: number;
}

export default function Leaderboard() {
    const { id } = useParams<{ id: string }>();
    const [sessionName, setSessionName] = useState('');
    const [beerScores, setBeerScores] = useState<BeerScore[]>([]);
    const [voterStats, setVoterStats] = useState<VoterStats[]>([]);
    const [funStats, setFunStats] = useState<FunStats>({});
    const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>('all');
    const [loading, setLoading] = useState(true);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

    // AI Live Commentator Hook
    const { liveMode, toggleLiveMode, isPlaying, audioRef } = useLiveCommentator({
        beerScores,
        voterStats,
        onApiKeyMissing: () => setIsApiKeyModalOpen(true)
    });

    const fetchLeaderboardData = useCallback(async () => {
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

            // Use service to calculate all stats
            const result = calculateLeaderboardStats(ratings as unknown as RatingWithRelations[], filterCriteria);

            setBeerScores(result.beerScores);
            setVoterStats(result.voterStats);
            setFunStats(result.funStats);

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    }, [id, filterCriteria]);

    // ... (rest of component, skipping to the select part)

    // Use replace_file_content smartly. I don't want to replace huge chunks if I can avoid it.
    // I will split this.


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
                (payload) => {
                    console.log('Real-time update received:', payload);
                    fetchLeaderboardData();
                }
            )
            .subscribe((status) => {
                console.log('Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to leaderboard updates');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('Error subscribing to leaderboard updates');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, filterCriteria, fetchLeaderboardData]);

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
        <div className="min-h-screen pb-8">
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

                        <div className="flex gap-2 items-center">
                            {/* Hidden Audio Element */}
                            <audio ref={audioRef} className="hidden" />

                            {/* Live Mode Toggle */}
                            <button
                                onClick={toggleLiveMode}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${liveMode
                                    ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                                    : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                                    }`}
                                title={liveMode ? "Live Kommentator PÅ" : "Skru på Live Kommentator"}
                            >
                                {liveMode ? <Radio className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                <span className="hidden sm:inline">{liveMode ? "LIVE" : "AI Lyd"}</span>
                            </button>



                            <select
                                value={filterCriteria}
                                onChange={(e) => setFilterCriteria(e.target.value as FilterCriteria)}
                                className="bg-slate-800 border border-white/20 rounded-lg px-3 py-1 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                                <option value="all">Alle</option>
                                <option value="taste">Smak</option>
                                <option value="mouthfeel">Munnfølelse</option>
                                <option value="overall">Helhet</option>
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            {/* Talking Santa Avatar */}
            <TalkingSanta isPlaying={isPlaying} />



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
                                                    title={`${getDisplayName(rating.profiles?.full_name, rating.profiles?.email)}: ${totalStars}/${maxStars} stars`}
                                                >
                                                    <span className="text-white text-xs font-medium truncate max-w-[80px]">
                                                        {getDisplayName(rating.profiles?.full_name, rating.profiles?.email)}
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
                        {/* Fun Facts Column */}

                        {/* 1. Optimist & Pessimist */}
                        {mostOptimistic && <FunFactCard title="Mest optimistisk" icon={TrendingUp} color="text-green-500" name={mostOptimistic.name} value={`Snitt: ${mostOptimistic.avgRating.toFixed(1)}p`} />}
                        {mostCritical && voterStats.length > 1 && <FunFactCard title="Mest kritisk" icon={TrendingDown} color="text-red-500" name={mostCritical.name} value={`Snitt: ${mostCritical.avgRating.toFixed(1)}p`} />}

                        {/* 2. Fun Stats */}
                        {funStats.tasteMaster && <FunFactCard title="Smaksdommeren" icon={Star} color="text-amber-400" name={funStats.tasteMaster.name} value={`Snitt smak: ${funStats.tasteMaster.score.toFixed(1)}`} delay={0.1} />}
                        {funStats.mouthfeelMaster && <FunFactCard title="Munnfølelse-entusiast" icon={Target} color="text-blue-400" name={funStats.mouthfeelMaster.name} value={`Snitt munn.: ${funStats.mouthfeelMaster.score.toFixed(1)}`} delay={0.2} />}

                        {funStats.hater && <FunFactCard title="Hilsen fra Helvete" icon={TrendingDown} color="text-red-600" name={funStats.hater.name} value={`${funStats.hater.score}p til ${funStats.hater.beerName}`} delay={0.3} />}
                        {funStats.lover && <FunFactCard title="Halleluja-stemning" icon={TrendingUp} color="text-yellow-400" name={funStats.lover.name} value={`${funStats.lover.count} fullpottere!`} delay={0.4} />}

                        {funStats.maverick && <FunFactCard title="Berg-og-dal-bane" icon={TrendingUp} color="text-purple-400" name={funStats.maverick.name} value="Mest varierte karakterer" delay={0.5} />}
                        {funStats.hipster && <FunFactCard title="Hipsteren" icon={Target} color="text-pink-400" name={funStats.hipster.name} value="Mest uenig med røkla" delay={0.6} />}
                        {funStats.chatterbox && <FunFactCard title="Skrivekløe" icon={Star} color="text-cyan-400" name={funStats.chatterbox.name} value={`${funStats.chatterbox.count} kommentarer`} delay={0.7} />}

                        {/* Summary List */}
                        <div className="glass rounded-lg p-3 mt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Target className="w-4 h-4 text-amber-500" />
                                <h3 className="font-bold text-white text-sm">Alle deltakere</h3>
                            </div>
                            <div className="space-y-1">
                                {voterStats.map((voter) => (
                                    <div key={voter.userId} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-300 truncate">{voter.name}</span>
                                        <span className="text-amber-500 font-medium flex-shrink-0 ml-2">{voter.avgRating.toFixed(1)}p</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onClose={() => setIsApiKeyModalOpen(false)}
                onSave={() => {
                    // Optionally try to toggle live mode again immediately
                    toggleLiveMode();
                }}
            />
        </div>
    );
}

function FunFactCard({ title, icon: Icon, color, name, value, delay = 0 }: FunFactCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className="glass rounded-lg p-3 border-l-2 border-current"
            style={{ borderColor: 'currentColor' }} // This doesn't work with tailwind text colors directly on border
        >
            <div className={`flex items-center gap-2 mb-1 ${color}`}>
                <Icon className="w-4 h-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider">{title}</h3>
            </div>
            <div>
                <div className={`text-base font-bold text-white truncate`}>{name}</div>
                <div className="text-xs text-slate-400">{value}</div>
            </div>
        </motion.div>
    );
}
