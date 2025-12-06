import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Beer } from '../types';
import StarRating from './StarRating';
import { motion, AnimatePresence } from 'framer-motion';

interface RateBeerModalProps {
    isOpen: boolean;
    onClose: () => void;
    beer: Beer;
    sessionId: string;
    onRatingSubmitted: () => void;
}

export default function RateBeerModal({
    isOpen,
    onClose,
    beer,
    sessionId,
    onRatingSubmitted,
}: RateBeerModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [taste, setTaste] = useState(0);
    const [mouthfeel, setMouthfeel] = useState(0);
    const [overall, setOverall] = useState(0);
    const [comment, setComment] = useState('');

    // Fetch existing rating when modal opens
    useEffect(() => {
        const fetchExistingRating = async () => {
            if (!isOpen || !user || !beer.id) return;

            try {
                const { data } = await supabase
                    .from('ratings')
                    .select('*')
                    .eq('beer_id', beer.id)
                    .eq('user_id', user.id)
                    .eq('session_id', sessionId)
                    .single();

                if (data) {
                    setTaste(data.taste || 0);
                    setMouthfeel(data.mouthfeel || 0);
                    setOverall(data.overall || 0);
                    setComment(data.comment || '');
                }
            } catch (error) {
                // No existing rating, keep defaults at 0
            }
        };

        if (isOpen) {
            fetchExistingRating();
        } else {
            // Reset when modal closes
            setTaste(0);
            setMouthfeel(0);
            setOverall(0);
            setComment('');
        }
    }, [isOpen, beer.id, user, sessionId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('ratings')
                .upsert({
                    user_id: user.id,
                    beer_id: beer.id,
                    session_id: sessionId,
                    taste,
                    mouthfeel,
                    overall,
                    comment,
                }, {
                    onConflict: 'user_id,beer_id,session_id'
                });

            if (error) throw error;

            onRatingSubmitted();
            onClose();
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert('Kunne ikke lagre vurdering');
        } finally {
            setLoading(false);
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
                        className="glass w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/20">
                            <div>
                                <h2 className="text-xl font-bold text-white">Vurder øl</h2>
                                <p className="text-amber-500 text-sm">{beer.name}</p>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <StarRating label="Smak (av 5)" value={taste} onChange={setTaste} maxStars={5} />
                                <StarRating label="Munnfølelse (av 5)" value={mouthfeel} onChange={setMouthfeel} maxStars={5} />
                            </div>

                            <div className="border-t border-white/20 pt-6">
                                <StarRating label="Helhetsinntrykk (av 5)" value={overall} onChange={setOverall} maxStars={5} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Kommentarer</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 h-24 placeholder-slate-500"
                                    placeholder="Hva syntes du?"
                                />
                            </div>

                            <div className="pt-4 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors font-medium"
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg font-medium shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center"
                                >
                                    {loading ? (
                                        'Lagrer...'
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5 mr-2" />
                                            Lagre vurdering
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
