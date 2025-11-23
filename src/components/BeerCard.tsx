import { Beer as BeerIcon, Droplet, Star, Trash2 } from 'lucide-react';
import type { Beer } from '../types';
import { motion } from 'framer-motion';

interface BeerCardProps {
    beer: Beer;
    onRate: () => void;
    onDelete?: () => void;
    index?: number;
}

export default function BeerCard({ beer, onRate, onDelete, index = 0 }: BeerCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="glass rounded-xl overflow-hidden hover:border-amber-500/50 transition-all duration-300 flex flex-col h-full group"
        >
            <div className="flex flex-1">
                <div className="w-24 sm:w-32 bg-slate-800/50 flex-shrink-0 relative p-2">
                    {beer.image_url ? (
                        <motion.img
                            whileHover={{ scale: 1.05 }}
                            src={beer.image_url}
                            alt={beer.name}
                            className="w-full h-full object-contain drop-shadow-lg"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <BeerIcon className="w-8 h-8" />
                        </div>
                    )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1 leading-tight">{beer.name}</h3>
                            <p className="text-amber-500 text-sm font-medium mb-2">{beer.brewery}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {beer.abv && (
                                <div className="flex items-center text-slate-300 text-xs bg-slate-800/80 px-2 py-1 rounded-full border border-white/5">
                                    <Droplet className="w-3 h-3 mr-1" />
                                    {beer.abv}%
                                </div>
                            )}
                            {onDelete && (
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onDelete}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete beer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </motion.button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-300 mb-2">
                        <span className="px-2 py-0.5 bg-slate-800/50 rounded text-xs border border-white/5">{beer.style}</span>
                    </div>
                    {beer.description && (
                        <p className="text-slate-300 text-sm line-clamp-2 mb-4 flex-1 leading-relaxed">{beer.description}</p>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onRate}
                        className="w-full mt-auto flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 rounded-lg transition-colors text-sm font-medium group border border-white/5 hover:border-amber-500/50"
                    >
                        <Star className="w-4 h-4 mr-2 group-hover:fill-current transition-colors" />
                        Rate Beer
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
