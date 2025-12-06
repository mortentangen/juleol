import { useEffect, useState } from 'react';
import { X, Trophy, Medal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Beer, Rating } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    beers: Beer[];
}

interface BeerScore {
    beerId: string;
    average: number;
    count: number;
}

export default function LeaderboardModal({ isOpen, onClose, sessionId, beers }: LeaderboardModalProps) {
    const [scores, setScores] = useState<BeerScore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            calculateScores();
        }
    }, [isOpen]);

    const calculateScores = async () => {
        setLoading(true);
        try {
            const { data: ratings, error } = await supabase
                .from('ratings')
                .select('*')
                .eq('session_id', sessionId);

            if (error) throw error;

            // Group ratings by beer
            const beerRatings: Record<string, number[]> = {};
            ratings?.forEach((rating: Rating) => {
                if (!beerRatings[rating.beer_id]) {
                    beerRatings[rating.beer_id] = [];
                }
                beerRatings[rating.beer_id].push(rating.overall);
            });

            // Calculate averages
            const calculatedScores: BeerScore[] = Object.keys(beerRatings).map((beerId) => {
                const scores = beerRatings[beerId];
                const sum = scores.reduce((a, b) => a + b, 0);
                const average = sum / scores.length;
                return {
                    beerId,
                    average,
                    count: scores.length,
                };
            });

            // Sort by average (descending)
            calculatedScores.sort((a, b) => b.average - a.average);
            setScores(calculatedScores);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getBeerDetails = (beerId: string) => beers.find((b) => b.id === beerId);

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0:
                return <Trophy className="w-6 h-6 text-yellow-400" />;
            case 1:
                return <Medal className="w-6 h-6 text-slate-300" />;
            case 2:
                return <Medal className="w-6 h-6 text-amber-700" />;
            default:
                return <span className="w-6 h-6 flex items-center justify-center font-bold text-slate-500">{index + 1}</span>;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="glass w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/20">
                            <div className="flex items-center space-x-3">
                                <div className="bg-amber-500/20 p-2 rounded-lg">
                                    <Trophy className="w-6 h-6 text-amber-500" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Resultatliste</h2>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                                </div>
                            ) : scores.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    Ingen vurderinger ennå. Begynn smakingen!
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {scores.map((score, index) => {
                                        const beer = getBeerDetails(score.beerId);
                                        if (!beer) return null;

                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                key={score.beerId}
                                                className={`flex items-center p-4 rounded-xl border transition-colors ${index === 0
                                                    ? 'bg-amber-500/10 border-amber-500/50'
                                                    : 'bg-slate-800/50 border-white/5 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="mr-4 flex-shrink-0">
                                                    {getRankIcon(index)}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-bold text-white truncate">{beer.name}</h3>
                                                    <p className="text-slate-300 text-sm truncate">{beer.brewery}</p>
                                                </div>

                                                <div className="ml-4 text-right">
                                                    <div className="text-2xl font-bold text-amber-500">
                                                        {score.average.toFixed(1)}
                                                        <span className="text-sm text-slate-500 ml-1">/ 5</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {score.count} {score.count === 1 ? 'vurdering' : 'vurderinger'}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
