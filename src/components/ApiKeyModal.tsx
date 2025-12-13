import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, X, Save } from 'lucide-react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export default function ApiKeyModal({ isOpen, onClose, onSave }: ApiKeyModalProps) {
    const [apiKey, setApiKey] = useState('');

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem('openai_api_key', apiKey.trim());
            onSave();
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg">
                                    <Key className="w-5 h-5 text-amber-500" />
                                </div>
                                <h2 className="text-lg font-bold text-white">OpenAI API Nøkkel</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-slate-300 text-sm">
                                For å bruke AI-kommentatoren må du legge inn en gyldig OpenAI API-nøkkel fra dere.
                                Nøkkelen lagres kun lokalt i nettleseren din.
                            </p>

                            <div className="space-y-2">
                                <label htmlFor="apiKey" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    API Nøkkel (start med sk-...)
                                </label>
                                <input
                                    id="apiKey"
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                                >
                                    Avbryt
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!apiKey.trim()}
                                    className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    Lagre nøkkel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
