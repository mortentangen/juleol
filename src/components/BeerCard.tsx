import { Droplet, Star, Trash2, Beer as BeerIcon } from 'lucide-react';
import type { Beer } from '../types';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

interface BeerCardProps {
    beer: Beer;
    onRate: () => void;
    onDelete?: () => void;
    index?: number;
    refreshTrigger?: number;
}

interface UserRating {
    taste: number;
    mouthfeel: number;
    overall: number;
}

export default function BeerCard({ beer, onRate, onDelete, index = 0, refreshTrigger = 0 }: BeerCardProps) {
    const { user } = useAuth();
    const [userRating, setUserRating] = useState<UserRating | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserRating = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const { data } = await supabase
                    .from('ratings')
                    .select('taste, mouthfeel, overall')
                    .eq('beer_id', beer.id)
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (data) {
                    setUserRating(data);
                }
            } catch {
                // No rating yet, that's fine
            } finally {
                setLoading(false);
            }
        };

        fetchUserRating();
    }, [beer.id, user, refreshTrigger]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={onRate}
            className="glass rounded-xl overflow-hidden hover:border-amber-500/50 transition-all duration-300 group cursor-pointer"
        >
            <div className="flex gap-3 p-3">
                {/* Image on the left */}
                <div className="w-20 sm:w-24 h-28 sm:h-32 flex-shrink-0 bg-slate-800/30 rounded-lg p-2 relative flex items-center justify-center">
                    {beer.image_url ? (
                        <img
                            src={beer.image_url}
                            alt={beer.name}
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        <div className="flex items-center justify-center text-slate-600">
                            <BeerIcon className="w-8 h-8" />
                        </div>
                    )}
                    {beer.abv && (
                        <div className="absolute -top-1 -right-1 flex items-center text-slate-300 text-xs bg-slate-800/90 px-1.5 py-0.5 rounded-full border border-white/10">
                            <Droplet className="w-2.5 h-2.5 mr-0.5" />
                            {beer.abv}%
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                                {beer.name}
                            </h3>
                            <p className="text-amber-500 text-xs sm:text-sm truncate">{beer.brewery}</p>
                        </div>
                        {onDelete && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors flex-shrink-0"
                                title="Slett øl"
                            >
                                <Trash2 className="w-4 h-4" />
                            </motion.button>
                        )}
                    </div>

                    <div className="flex items-center justify-between mb-2">
                        <span className="inline-block px-2 py-0.5 bg-slate-800/50 rounded text-xs border border-white/5 text-slate-300 w-fit">
                            {beer.style}
                        </span>
                        {beer.addedBy && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                Lagt til av <span className="text-slate-400 font-medium">
                                    {beer.addedBy.full_name ? beer.addedBy.full_name.split(' ')[0] : 'Ukjent'}
                                </span>
                            </span>
                        )}
                    </div>

                    {/* User Rating Display - All Categories */}
                    <div className="mt-auto space-y-1">
                        {loading ? (
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                Laster...
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-xs">Smak:</span>
                                    <div className="flex items-center gap-0.5">
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-2.5 h-2.5 ${userRating && i < userRating.taste
                                                    ? 'fill-amber-500 text-amber-500'
                                                    : 'fill-slate-700 text-slate-700'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-xs">Munnfølelse:</span>
                                    <div className="flex items-center gap-0.5">
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-2.5 h-2.5 ${userRating && i < userRating.mouthfeel
                                                    ? 'fill-amber-500 text-amber-500'
                                                    : 'fill-slate-700 text-slate-700'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-xs">Helhet:</span>
                                    <div className="flex items-center gap-0.5">
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-2.5 h-2.5 ${userRating && i < userRating.overall
                                                    ? 'fill-amber-500 text-amber-500'
                                                    : 'fill-slate-700 text-slate-700'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
