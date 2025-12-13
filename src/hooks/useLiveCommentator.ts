import { useState, useEffect, useRef, RefObject } from 'react';
import { generateBeerCommentaryAudio } from '../services/openaiService';
import type { BeerScore, VoterStats } from '../services/leaderboardService';

interface UseLiveCommentatorProps {
    beerScores: BeerScore[];
    voterStats: VoterStats[];
    onApiKeyMissing: () => void;
}

interface UseLiveCommentatorReturn {
    liveMode: boolean;
    toggleLiveMode: () => void;
    isPlaying: boolean;
    audioRef: RefObject<HTMLAudioElement>;
}

export const useLiveCommentator = ({
    beerScores,
    voterStats,
    onApiKeyMissing
}: UseLiveCommentatorProps): UseLiveCommentatorReturn => {
    const [liveMode, setLiveMode] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const commentedBeersRef = useRef<Set<string>>(new Set());
    const isProcessingRef = useRef(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const toggleLiveMode = () => {
        const apiKey = localStorage.getItem('openai_api_key');
        if (!apiKey) {
            onApiKeyMissing();
            return;
        }
        setLiveMode(!liveMode);
    };

    // Helper to play a realistic "sleigh bell" sound using Jingle Bell synthesis
    const playChime = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();

            // Function to create a single "shake" of a bell cluster
            const playShake = (startTime: number) => {
                // A sleigh bell sound is a cluster of high frequencies
                // We use multiple oscillators with different high frequencies to simulate the pellets
                const frequencies = [2000, 2450, 2900, 3200, 4100]; // Dissonant cluster high up

                frequencies.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'sine'; // Sine or triangle works best for metal
                    // Add slight detuning randomness
                    osc.frequency.value = freq + (Math.random() * 50 - 25);

                    // Envelope: fast attack, very fast initial decay, then short tail
                    // Jingle bells are short sounds
                    const duration = 0.15 + (Math.random() * 0.05); // ~150-200ms

                    gain.gain.setValueAtTime(0, startTime);
                    gain.gain.linearRampToValueAtTime(0.08 / frequencies.length, startTime + 0.01); // Quick attack
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Quick decay

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(startTime);
                    osc.stop(startTime + duration + 0.1);
                });
            };

            // Play a "Jingle-Jingle" pattern (two shakes)
            const now = ctx.currentTime;
            playShake(now);
            playShake(now + 0.18); // Second shake shortly after

            // Maybe a third faint one for "settling"
            setTimeout(() => playShake(now + 0.4), 400);

        } catch (e) {
            console.error("Failed to play chime", e);
        }
    };

    useEffect(() => {
        // Prevent multiple concurrent processes
        if (!liveMode || isPlaying || isProcessingRef.current) return;

        const totalVoters = voterStats.length;
        if (totalVoters < 2) return;

        beerScores.forEach(async (score) => {
            if (
                score.ratingCount >= totalVoters &&
                !commentedBeersRef.current.has(score.beer.id) &&
                totalVoters > 0
            ) {
                // Lock process
                isProcessingRef.current = true;
                console.log(`Live Commentator: Beer "${score.beer.name}" is complete! Generating commentary...`);

                // Mark as handled immediately to prevent double-trigger
                commentedBeersRef.current.add(score.beer.id);

                // Play attention-grabbing chime immediately when processing starts
                // playChime(); // Actually maybe wait until audio is ready? No, let's wait until ready.

                try {
                    const apiKey = localStorage.getItem('openai_api_key');
                    if (!apiKey) {
                        console.warn("Live Commentator: No API key found.");
                        isProcessingRef.current = false;
                        return;
                    }

                    // Single API call: context + audio generation in one
                    const audioBuffer = await generateBeerCommentaryAudio(apiKey, score, beerScores);

                    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
                    const url = URL.createObjectURL(blob);

                    if (audioRef.current) {
                        audioRef.current.src = url;

                        // NOW we show the avatar and play
                        // Play chime FIRST, then start audio after a longer delay (2.5s)
                        playChime();

                        setTimeout(() => {
                            setIsPlaying(true);
                            audioRef.current?.play();
                        }, 2500); // Increased delay to 2.5 seconds

                        audioRef.current.onended = () => {
                            setIsPlaying(false);
                            isProcessingRef.current = false; // Release lock when done speaking
                            URL.revokeObjectURL(url);
                        };
                    } else {
                        isProcessingRef.current = false;
                    }

                } catch (err) {
                    console.error("Live Commentator Error:", err);
                    setIsPlaying(false);
                    isProcessingRef.current = false;
                }
            }
        });
    }, [beerScores, voterStats, liveMode, isPlaying]);

    return {
        liveMode,
        toggleLiveMode,
        isPlaying,
        audioRef
    };
};
