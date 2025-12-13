import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';

interface Decoration {
    id: number;
    visible: boolean;
    duration?: number;
    delay?: number;
    colorClass?: string;
}

export default function ChristmasDecorations() {
    const location = useLocation();

    const [decorations] = useState<Decoration[]>(() => {
        return [...Array(12)].map((_, i) => {
            const isVisible = i >= 2 && i <= 9;
            if (!isVisible) return { id: i, visible: false };

            return {
                id: i,
                visible: true,
                duration: 2 + Math.random(),
                delay: Math.random() * 2,
                colorClass: i % 3 === 0 ? 'bg-red-500 shadow-red-500/50' :
                    i % 3 === 1 ? 'bg-green-500 shadow-green-500/50' :
                        'bg-yellow-400 shadow-yellow-400/50'
            };
        });
    });

    // Only show on leaderboard
    if (!location.pathname.includes('leaderboard')) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 w-full pointer-events-none z-50 overflow-hidden h-32">
            {/* Hanging lights/decorations */}
            <div className="flex justify-between w-full px-4 absolute -top-2">
                {decorations.map((deco) => {
                    if (!deco.visible) return <div key={deco.id} className="w-6" />; // Spacer

                    return (
                        <motion.div
                            key={deco.id}
                            initial={{ rotate: -5 }}
                            animate={{ rotate: 5 }}
                            transition={{
                                duration: deco.duration,
                                repeat: Infinity,
                                repeatType: "reverse",
                                ease: "easeInOut",
                                delay: deco.delay
                            }}
                            className="origin-top"
                        >
                            <div className="h-8 w-0.5 bg-slate-400 mx-auto" />
                            <div className={`w-6 h-6 rounded-full shadow-lg ${deco.colorClass}`} />
                        </motion.div>
                    );
                })}
            </div>

            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-32 h-32 opacity-20 bg-gradient-to-br from-red-600/30 to-transparent rounded-br-full blur-2xl" />
            <div className="absolute top-0 right-0 w-32 h-32 opacity-20 bg-gradient-to-bl from-green-600/30 to-transparent rounded-bl-full blur-2xl" />
        </div>
    );
}
