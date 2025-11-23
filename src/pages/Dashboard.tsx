import { useEffect, useState } from 'react';
import { Plus, LogOut, Beer, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Session } from '../types';
import SessionCard from '../components/SessionCard';
import CreateSessionModal from '../components/CreateSessionModal';
import JoinSessionModal from '../components/JoinSessionModal';
import { motion } from 'framer-motion';

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchSessions = async () => {
        if (!user) return;
        try {
            // Fetch sessions where user is host OR participant
            const { data, error } = await supabase
                .from('sessions')
                .select(`
                    *,
                    session_participants!inner(user_id)
                `)
                .eq('session_participants.user_id', user.id)
                .order('date', { ascending: false });

            if (error) throw error;
            setSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [user]);

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="glass sticky top-0 z-40 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-lg shadow-lg shadow-amber-500/20">
                            <Beer className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Beer Tasting</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-slate-400 text-sm hidden sm:block">{user?.email}</span>
                        <button
                            onClick={() => signOut()}
                            className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
                            title="Sign Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-white tracking-tight">Your Sessions</h2>
                    <div className="flex gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsJoinModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium border border-white/10 transition-all"
                        >
                            <Users className="w-5 h-5 mr-2" />
                            Join Session
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg font-medium shadow-lg shadow-amber-500/20 transition-all"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            New Session
                        </motion.button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading sessions...</p>
                    </div>
                ) : sessions.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 glass rounded-2xl border-dashed border-2 border-slate-700"
                    >
                        <div className="bg-slate-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Beer className="w-10 h-10 text-slate-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No sessions yet</h3>
                        <p className="text-slate-400 mb-8 max-w-md mx-auto">Create your first tasting session to get started. Invite friends and rate beers together!</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-medium border border-white/10"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Create Session
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessions.map((session, index) => (
                            <SessionCard key={session.id} session={session} index={index} />
                        ))}
                    </div>
                )}
            </main>

            <CreateSessionModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSessionCreated={fetchSessions}
            />

            <JoinSessionModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
                onSessionJoined={fetchSessions}
            />
        </div>
    );
}
