import { useState } from 'react';
import { X, GripVertical, User, Check } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Beer } from '../types';

interface ReorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    beers: Beer[];
    isHost: boolean;
    onReordered: () => void;
}

interface GroupedBeers {
    userId: string;
    userName: string;
    beers: Beer[];
}

export default function ReorderModal({ isOpen, onClose, sessionId, beers, isHost, onReordered }: ReorderModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState<GroupedBeers[]>(() => {

        // Group beers by addedByUserId
        const groupedMap = new Map<string, GroupedBeers>();

        beers.forEach(beer => {
            const userId = beer.addedByUserId || 'unknown';
            const userName = beer.addedBy?.full_name || 'Ukjent bidragsyter';

            if (!groupedMap.has(userId)) {
                groupedMap.set(userId, { userId, userName, beers: [] });
            }
            groupedMap.get(userId)!.beers.push(beer);
        });

        // Convert Map to array
        return Array.from(groupedMap.values());
    });

    const handleReorderBeers = (userId: string, reorderedBeers: Beer[]) => {
        setGroups(prev => prev.map(group =>
            group.userId === userId ? { ...group, beers: reorderedBeers } : group
        ));
    };

    const handleReorderGroups = (reorderedGroups: GroupedBeers[]) => {
        if (!isHost) return;
        setGroups(reorderedGroups);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Flatten the groups back into a list of updates
            const updates = [];
            let globalOrder = 1;

            for (const group of groups) {
                for (const beer of group.beers) {
                    updates.push({
                        session_id: sessionId,
                        beer_id: beer.id,
                        sorting_order: globalOrder++
                    });
                }
            }

            // Perform updates in Supabase
            // Note: Since we can't do bulk update with different values easily in a single request
            // without a RPC, we'll do it for each if the list is small, or use a better approach.
            // For now, let's just do it sequentially or with a small batch.
            // Actually, we can use the 'upsert' with the composite key if session_id and beer_id are unique.

            const { error } = await supabase
                .from('session_beers')
                .upsert(updates, { onConflict: 'session_id,beer_id' });

            if (error) throw error;

            onReordered();
            onClose();
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Kunne ikke lagre rekkefølge.');
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
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="glass w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-10"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div>
                                <h2 className="text-xl font-bold text-white">Endre rekkefølge</h2>
                                <p className="text-slate-400 text-sm mt-1">
                                    {isHost
                                        ? 'Dra grupper eller enkelte øl for å sette rekkefølgen.'
                                        : 'Dra dine øl for å endre rekkefølgen i din gruppe.'}
                                </p>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            {isHost ? (
                                <Reorder.Group axis="y" values={groups} onReorder={handleReorderGroups} className="space-y-6">
                                    {groups.map((group) => (
                                        <Reorder.Item key={group.userId} value={group} className="space-y-2">
                                            <div className="flex items-center gap-3 py-2 px-3 bg-slate-800/50 rounded-lg border border-white/5 cursor-grab active:cursor-grabbing group">
                                                <GripVertical className="w-5 h-5 text-slate-500 group-hover:text-amber-500" />
                                                <User className="w-4 h-4 text-amber-500/70" />
                                                <span className="font-bold text-slate-200">{group.userName}</span>
                                            </div>

                                            <div className="pl-8 space-y-2">
                                                <Reorder.Group axis="y" values={group.beers} onReorder={(newOrder) => handleReorderBeers(group.userId, newOrder)} className="space-y-2">
                                                    {group.beers.map((beer) => (
                                                        <Reorder.Item key={beer.id} value={beer} className="flex items-center gap-3 p-3 bg-slate-900/40 rounded-lg border border-white/5 cursor-grab active:cursor-grabbing group">
                                                            <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-amber-500" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-white truncate">{beer.name}</p>
                                                                <p className="text-xs text-slate-500 truncate">{beer.brewery}</p>
                                                            </div>
                                                        </Reorder.Item>
                                                    ))}
                                                </Reorder.Group>
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                </Reorder.Group>
                            ) : (
                                <div className="space-y-6">
                                    {groups.map((group) => {
                                        const isMyGroup = group.userId === user?.id;

                                        return (
                                            <div key={group.userId} className="space-y-2">
                                                <div className="flex items-center gap-3 py-2 px-3 bg-slate-800/20 rounded-lg border border-white/5 opacity-70">
                                                    <User className="w-4 h-4 text-slate-500" />
                                                    <span className="font-bold text-slate-400">{group.userName} {isMyGroup && '(Deg)'}</span>
                                                </div>

                                                <div className="pl-8 space-y-2">
                                                    {isMyGroup ? (
                                                        <Reorder.Group axis="y" values={group.beers} onReorder={(newOrder) => handleReorderBeers(group.userId, newOrder)} className="space-y-2">
                                                            {group.beers.map((beer) => (
                                                                <Reorder.Item key={beer.id} value={beer} className="flex items-center gap-3 p-3 bg-slate-900/40 rounded-lg border border-white/5 cursor-grab active:cursor-grabbing group">
                                                                    <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-amber-500" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-white truncate">{beer.name}</p>
                                                                        <p className="text-xs text-slate-500 truncate">{beer.brewery}</p>
                                                                    </div>
                                                                </Reorder.Item>
                                                            ))}
                                                        </Reorder.Group>
                                                    ) : (
                                                        <div className="space-y-2 opacity-50">
                                                            {group.beers.map((beer) => (
                                                                <div key={beer.id} className="flex items-center gap-3 p-3 bg-slate-900/20 rounded-lg border border-white/5">
                                                                    <div className="w-4" /> {/* Spacer for grip */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-slate-400 truncate">{beer.name}</p>
                                                                        <p className="text-xs text-slate-600 truncate">{beer.brewery}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-white/10 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-white/5"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Lagre rekkefølge
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
