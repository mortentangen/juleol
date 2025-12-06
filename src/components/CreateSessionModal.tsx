import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSessionCreated: () => void;
}

export default function CreateSessionModal({ isOpen, onClose, onSessionCreated }: CreateSessionModalProps) {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            // Generate a random 6-character code
            const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            const { error } = await supabase
                .from('sessions')
                .insert({
                    name,
                    date,
                    host_id: user.id,
                    join_code: joinCode,
                });

            if (error) throw error;

            onSessionCreated();
            onClose();
            setName('');
            setDate(new Date().toISOString().split('T')[0]);
        } catch (error) {
            console.error('Error creating session:', error);
            alert('Kunne ikke opprette samlingen');
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
                        className="glass w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/20">
                            <h2 className="text-xl font-bold text-white">Opprett ny ølsmaking</h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                                    Navn
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-slate-500"
                                    placeholder="f.eks. Juleølsmaking 2025"
                                />
                            </div>

                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-1">
                                    Dato
                                </label>
                                <input
                                    id="date"
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                                        'Oppretter...'
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5 mr-2" />
                                            Opprett ølsmaking
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
