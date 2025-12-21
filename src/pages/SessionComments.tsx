import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Quote } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { getDisplayName } from '../utils/displayName';
import type { RatingWithRelations } from '../types';

interface BeerComments {
    beerId: string;
    beerName: string;
    brewery: string;
    comments: {
        id: string;
        text: string;
        userName: string;
        score: number;
    }[];
}

export default function SessionComments() {
    const { id } = useParams<{ id: string }>();
    const [sessionName, setSessionName] = useState('');
    const [beerComments, setBeerComments] = useState<BeerComments[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            try {
                // Fetch session info
                const { data: session } = await supabase
                    .from('sessions')
                    .select('name')
                    .eq('id', id)
                    .single();

                if (session) setSessionName(session.name);

                // Fetch ratings with comments
                const { data: ratings } = await supabase
                    .from('ratings')
                    .select(`
                        *,
                        beers (*),
                        profiles (full_name, email)
                    `)
                    .eq('session_id', id)
                    .neq('comment', '') // Only fetch where comment is not empty string
                    .not('comment', 'is', null); // And not null

                if (ratings) {
                    const typedRatings = ratings as unknown as RatingWithRelations[];

                    // Group by beer
                    const groupedMap = new Map<string, BeerComments>();

                    // Initialize map and process ratings
                    typedRatings.forEach(rating => {
                        // Skip if comment is purely whitespace (double check)
                        if (!rating.comment?.trim()) return;

                        if (!groupedMap.has(rating.beer_id)) {
                            groupedMap.set(rating.beer_id, {
                                beerId: rating.beer_id,
                                beerName: rating.beers.name || 'Ukjent øl',
                                brewery: rating.beers.brewery || 'Ukjent bryggeri',
                                comments: []
                            });
                        }

                        groupedMap.get(rating.beer_id)?.comments.push({
                            id: rating.id,
                            text: rating.comment,
                            userName: getDisplayName(rating.profiles?.full_name, rating.profiles?.email),
                            score: rating.taste + rating.mouthfeel + rating.overall
                        });
                    });

                    // Convert to array and sort (maybe by beer name or number of comments)
                    // Let's sort by beer name for stability
                    const sorted = Array.from(groupedMap.values()).sort((a, b) =>
                        a.beerName.localeCompare(b.beerName)
                    );

                    setBeerComments(sorted);
                }

            } catch (error) {
                console.error('Error fetching comments:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12">
            <header className="glass sticky top-0 z-40 border-b border-white/5">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link to={`/session/${id}`} className="text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-amber-500" />
                                Kommentarer
                            </h1>
                            <p className="text-xs text-slate-400">{sessionName}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {beerComments.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white">Ingen kommentarer ennå</h3>
                        <p className="text-slate-400">Vær den første til å mene noe!</p>
                    </div>
                ) : (
                    beerComments.map((item, index) => (
                        <motion.div
                            key={item.beerId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-slate-800/50 rounded-2xl p-6 border border-white/5 shadow-xl backdrop-blur-sm"
                        >
                            <div className="mb-6 pb-4 border-b border-white/5">
                                <h2 className="text-2xl font-bold text-white mb-1">{item.beerName}</h2>
                                <p className="text-amber-500 font-medium text-sm">{item.brewery}</p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {item.comments.map(comment => (
                                    <div key={comment.id} className="bg-black/30 rounded-xl p-4 relative group hover:bg-black/40 transition-colors">
                                        <Quote className="absolute top-4 right-4 w-8 h-8 text-white/5 group-hover:text-white/10 transition-colors" />

                                        <p className="text-slate-200 mb-4 relative z-10 leading-relaxed italic">
                                            "{comment.text}"
                                        </p>

                                        <div className="flex items-end justify-between border-t border-white/5 pt-3 mt-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                    {comment.userName.charAt(0)}
                                                </div>
                                                <span className="text-xs font-medium text-slate-400">
                                                    {comment.userName}
                                                </span>
                                            </div>
                                            <div className="bg-slate-800 rounded px-1.5 py-0.5 text-xs text-amber-500 font-mono">
                                                {comment.score}p
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))
                )}
            </main>
        </div>
    );
}
