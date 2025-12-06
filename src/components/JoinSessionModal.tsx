import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface JoinSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSessionJoined: () => void;
}

export default function JoinSessionModal({ isOpen, onClose, onSessionJoined }: JoinSessionModalProps) {
    const { user } = useAuth();
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError('');

        try {
            const code = joinCode.trim().toUpperCase();

            // Find session by join code
            const { data: session, error: sessionError } = await supabase
                .from('sessions')
                .select('id, host_id, name')
                .eq('join_code', code)
                .single();

            if (sessionError || !session) {
                setError('Ugyldig kode. Vennligst sjekk og prøv igjen.');
                setLoading(false);
                return;
            }

            // Check if user is already the host
            if (session.host_id === user.id) {
                setError('Du er allerede vert for denne smakingen.');
                setLoading(false);
                return;
            }

            // Check if user has already joined
            const { data: existing } = await supabase
                .from('session_participants')
                .select('*')
                .eq('session_id', session.id)
                .eq('user_id', user.id)
                .single();

            if (existing) {
                setError('Du har allerede blitt med i denne smakingen.');
                setLoading(false);
                return;
            }

            // Join the session
            const { error: joinError } = await supabase
                .from('session_participants')
                .insert({
                    session_id: session.id,
                    user_id: user.id,
                });

            if (joinError) throw joinError;

            // Success!
            onSessionJoined();
            onClose();
            setJoinCode('');
            setError('');
        } catch (error) {
            console.error('Error joining session:', error);
            setError('Kunne ikke bli med i ølsmakingen. Vennligst prøv igjen.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase().slice(0, 6);
        setJoinCode(value);
        setError('');
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
                        className="bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl max-w-md w-full overflow-hidden relative z-10"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg">
                                    <Users className="w-6 h-6 text-amber-500" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Finn ølsmaking</h2>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="joinCode" className="block text-sm font-medium text-slate-300 mb-2">
                                    Skriv inn kode
                                </label>
                                <input
                                    id="joinCode"
                                    type="text"
                                    required
                                    value={joinCode}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-800/50 border border-white/20 rounded-lg px-4 py-3 text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-slate-500 uppercase"
                                    placeholder="A3X9K2"
                                    maxLength={6}
                                />
                                <p className="text-slate-400 text-sm mt-2">
                                    Be verten for ølsmakingen om koden på 6 tegn
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || joinCode.length !== 6}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg font-medium shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Leter...' : 'Join'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
