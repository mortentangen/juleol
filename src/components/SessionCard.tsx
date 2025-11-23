import { Calendar, ChevronRight, Crown } from 'lucide-react';
import type { Session } from '../types';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

interface SessionCardProps {
    session: Session;
    index?: number;
}

export default function SessionCard({ session, index = 0 }: SessionCardProps) {
    const { user } = useAuth();
    const isHost = session.host_id === user?.id;

    return (
        <Link to={`/session/${session.id}`}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass rounded-xl p-6 hover:border-amber-500/50 transition-all duration-300 group cursor-pointer"
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                                {session.name}
                            </h3>
                            {isHost ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full border border-amber-500/30">
                                    <Crown className="w-3 h-3" />
                                    Host
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full border border-blue-500/30">
                                    Participant
                                </span>
                            )}
                        </div>
                        <p className="text-slate-300 text-sm mt-1">
                            Code: <span className="font-mono text-amber-500">{session.join_code}</span>
                        </p>
                    </div>
                    <div className="flex items-center">
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500" />
                    </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-slate-300">
                    <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-amber-500/70" />
                        {new Date(session.date).toLocaleDateString()}
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
