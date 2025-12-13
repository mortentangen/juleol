import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export default function ChristmasDecorations() {
    const location = useLocation();

    // Only show on leaderboard
    if (!location.pathname.includes('leaderboard')) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 w-full pointer-events-none z-50 overflow-hidden h-32">
            {/* Hanging lights/decorations */}
            <div className="flex justify-between w-full px-4 absolute -top-2">
                {[...Array(12)].map((_, i) => {
                    // Hide 2 outer items on each side (0, 1 and 10, 11)
                    // Keep indices 2 through 9
                    const isVisible = i >= 2 && i <= 9;
                    if (!isVisible) return <div key={i} className="w-6" />; // Spacer to maintain alignment

                    return (
                        <motion.div
                            key={i}
                            initial={{ rotate: -5 }}
                            animate={{ rotate: 5 }}
                            transition={{
                                duration: 2 + Math.random(),
                                repeat: Infinity,
                                repeatType: "reverse",
                                ease: "easeInOut",
                                delay: Math.random() * 2
                            }}
                            className="origin-top"
                        >
                            <div className="h-8 w-0.5 bg-slate-400 mx-auto" />
                            <div className={`w-6 h-6 rounded-full shadow-lg ${i % 3 === 0 ? 'bg-red-500 shadow-red-500/50' :
                                i % 3 === 1 ? 'bg-green-500 shadow-green-500/50' :
                                    'bg-yellow-400 shadow-yellow-400/50'
                                }`} />
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
