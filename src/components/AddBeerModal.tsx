import React, { useState } from 'react';
import { X, Plus, Loader2, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { importFromVinmonopolet } from '../lib/vinmonopolet';
import { useAuth } from '../context/AuthContext';

interface AddBeerModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    onBeerAdded?: () => void;
}

export default function AddBeerModal({ isOpen, onClose, sessionId, onBeerAdded }: AddBeerModalProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'manual' | 'url'>('manual');
    const [loading, setLoading] = useState(false);

    // Manual Entry State
    const [name, setName] = useState('');
    const [brewery, setBrewery] = useState('');
    const [style, setStyle] = useState('');
    const [abv, setAbv] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    // URL Import State
    const [importUrl, setImportUrl] = useState('');
    const [importing, setImporting] = useState(false);

    const handleImportUrl = async () => {
        if (!importUrl.trim()) return;

        setImporting(true);
        try {
            const beer = await importFromVinmonopolet(importUrl);
            if (beer) {
                // Auto-fill the manual entry form
                setName(beer.name);
                setBrewery(beer.brewery);
                setStyle(beer.style);
                setAbv(beer.abv?.toString() || '');
                setDescription(beer.description);
                setImageUrl(beer.imageUrl);

                // Switch to manual entry tab
                setActiveTab('manual');
                setImportUrl(''); // Clear the URL input
            } else {
                alert('Could not import beer from URL. Please check the URL and try again.');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import beer. Please try again or use manual entry.');
        } finally {
            setImporting(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Insert into beers table
            const { data: beerData, error: beerError } = await supabase
                .from('beers')
                .insert({
                    name,
                    brewery,
                    style,
                    abv: parseFloat(abv),
                    description,
                    image_url: imageUrl,
                })
                .select()
                .single();

            if (beerError) throw beerError;

            // 2. Link to session
            const { error: linkError } = await supabase
                .from('session_beers')
                .insert({
                    session_id: sessionId,
                    beer_id: beerData.id,
                    added_by: user?.id,
                });

            if (linkError) throw linkError;

            onBeerAdded?.();
            onClose();
            // Reset form
            setName('');
            setBrewery('');
            setStyle('');
            setAbv('');
            setDescription('');
            setImageUrl('');

            onBeerAdded?.();
            onClose();
        } catch (error) {
            console.error('Error adding beer:', error);
            alert('Failed to add beer. Please try again.');
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
                        className="glass w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">Add Beer to Session</h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10">
                            <button
                                onClick={() => setActiveTab('manual')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'manual'
                                    ? 'text-amber-500 border-b-2 border-amber-500 bg-white/5'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                Manual Entry
                            </button>
                            <button
                                onClick={() => setActiveTab('url')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'url'
                                    ? 'text-amber-500 border-b-2 border-amber-500 bg-white/5'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                Import URL
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {activeTab === 'manual' ? (
                                <form onSubmit={handleManualSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Beer Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                                                placeholder="e.g. Tuborg Julebryg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Brewery</label>
                                            <input
                                                type="text"
                                                required
                                                value={brewery}
                                                onChange={(e) => setBrewery(e.target.value)}
                                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                                                placeholder="e.g. Tuborg"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Style</label>
                                            <input
                                                type="text"
                                                value={style}
                                                onChange={(e) => setStyle(e.target.value)}
                                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                                                placeholder="e.g. Pilsner"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">ABV (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={abv}
                                                onChange={(e) => setAbv(e.target.value)}
                                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                                                placeholder="e.g. 5.6"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500 h-24"
                                            placeholder="Tasting notes..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Image URL (Optional)</label>
                                        <input
                                            type="url"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="pt-4 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-slate-300 hover:text-white transition-colors font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg font-medium shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center"
                                        >
                                            {loading ? (
                                                'Adding...'
                                            ) : (
                                                <>
                                                    <Plus className="w-5 h-5 mr-2" />
                                                    Add Beer
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            ) : activeTab === 'url' ? (
                                <div className="space-y-4">
                                    <div className="text-center py-4">
                                        <LinkIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-white mb-2">Import from Vinmonopolet</h3>
                                        <p className="text-slate-300 text-sm mb-4">Paste a Vinmonopolet product URL to auto-fill beer details</p>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="url"
                                            value={importUrl}
                                            onChange={(e) => setImportUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleImportUrl()}
                                            placeholder="https://www.vinmonopolet.no/.../p/12345678"
                                            className="flex-1 bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                                        />
                                        <button
                                            onClick={handleImportUrl}
                                            disabled={importing || !importUrl.trim()}
                                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg font-medium shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center"
                                        >
                                            {importing ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                    Importing...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-5 h-5 mr-2" />
                                                    Import
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="bg-slate-800/30 border border-white/10 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-white mb-2">How to use:</h4>
                                        <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                                            <li>Go to <a href="https://www.vinmonopolet.no" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">vinmonopolet.no</a></li>
                                            <li>Find the beer you want to add</li>
                                            <li>Copy the URL from your browser</li>
                                            <li>Paste it above and click Import</li>
                                        </ol>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
