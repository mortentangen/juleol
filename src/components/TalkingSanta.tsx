import { motion, AnimatePresence } from 'framer-motion';
import santaImage from '../assets/santa.png'; // Assuming Vite handles asset import typically, or we use direct path if in public

// Note: In Vite with the setup we have, imports from /src/assets usually work.
// However, the previous implementation used `src="/src/assets/santa.png"` directly in the img tag.
// It's cleaner to import it if possible, but let's stick to the direct path if that's what's working,
// OR update to proper import. Since we moved the file to src/assets, let's try proper import.
// Actually, strict import is better.

interface TalkingSantaProps {
    isPlaying: boolean;
}

export default function TalkingSanta({ isPlaying }: TalkingSantaProps) {
    return (
        <AnimatePresence>
            {isPlaying && (
                <motion.div
                    initial={{ y: 200, opacity: 0, rotate: -10 }}
                    animate={{
                        y: 0,
                        opacity: 1,
                        rotate: 0,
                        transition: { type: "spring", stiffness: 200, damping: 20 }
                    }}
                    exit={{ y: 200, opacity: 0, rotate: 10 }}
                    className="fixed bottom-4 right-4 z-50 w-36 h-36 md:w-52 md:h-52 drop-shadow-2xl pointer-events-none"
                >
                    <motion.img
                        src="/src/assets/santa.png"
                        alt="Talking Santa"
                        className="w-full h-full object-contain rounded-full border-4 border-white shadow-lg"
                        animate={{
                            scale: [1, 1.05, 1],
                            rotate: [0, -2, 2, 0],
                        }}
                        transition={{
                            duration: 0.4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                    <div className="absolute -top-12 right-0 bg-white text-black p-3 rounded-2xl rounded-tr-none shadow-xl border-2 border-slate-200">
                        <p className="text-sm font-bold whitespace-nowrap">Ho ho ho! 🎅</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
