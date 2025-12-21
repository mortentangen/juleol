import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ManualBeerForm from './add-beer/ManualBeerForm';
import VinmonopoletSearch from './add-beer/VinmonopoletSearch';
import ExistingBeerSearch from './add-beer/ExistingBeerSearch';

interface AddBeerModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    onBeerAdded?: () => void;
}

export interface BeerFormData {
    name: string;
    brewery: string;
    style: string;
    abv: string;
    description: string;
    imageUrl: string;
}

const INITIAL_FORM_DATA: BeerFormData = {
    name: '',
    brewery: '',
    style: '',
    abv: '',
    description: '',
    imageUrl: ''
};

export default function AddBeerModal({ isOpen, onClose, sessionId, onBeerAdded }: AddBeerModalProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'manual' | 'url' | 'existing'>('manual');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<BeerFormData>(INITIAL_FORM_DATA);

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let beerId: string;

            // Check if a beer with the same name and brewery already exists
            const { data: existingBeer, error: searchError } = await supabase
                .from('beers')
                .select('id')
                .ilike('name', formData.name.trim())
                .ilike('brewery', formData.brewery.trim())
                .maybeSingle();

            if (searchError) throw searchError;

            if (existingBeer) {
                // Reuse existing beer
                beerId = existingBeer.id;
            } else {
                // Insert new beer
                const { data: beerData, error: beerError } = await supabase
                    .from('beers')
                    .insert({
                        name: formData.name.trim(),
                        brewery: formData.brewery.trim(),
                        style: formData.style,
                        abv: parseFloat(formData.abv),
                        description: formData.description,
                        image_url: formData.imageUrl,
                    })
                    .select()
                    .single();

                if (beerError) throw beerError;
                beerId = beerData.id;
            }

            // Check if this beer is already in this session
            const { data: existingLink } = await supabase
                .from('session_beers')
                .select('id')
                .eq('session_id', sessionId)
                .eq('beer_id', beerId)
                .maybeSingle();

            if (existingLink) {
                alert('Denne ølen er allerede lagt til i denne sesjonen!');
                setLoading(false);
                return;
            }

            // Link to session
            const { error: linkError } = await supabase
                .from('session_beers')
                .insert({
                    session_id: sessionId,
                    beer_id: beerId,
                    added_by: user?.id,
                });

            if (linkError) throw linkError;

            onBeerAdded?.();
            onClose();
            setFormData(INITIAL_FORM_DATA);
        } catch (error) {
            console.error('Error adding beer:', error);
            alert('Kunne ikke legge til øl. Vennligst prøv igjen.');
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
                            <h2 className="text-xl font-bold text-white">Legg til øl</h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('manual')}
                                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'manual'
                                    ? 'text-amber-500 border-b-2 border-amber-500 bg-white/5'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                Manuell registrering
                            </button>
                            <button
                                onClick={() => setActiveTab('existing')}
                                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'existing'
                                    ? 'text-amber-500 border-b-2 border-amber-500 bg-white/5'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                Eksisterende øl
                            </button>
                            <button
                                onClick={() => setActiveTab('url')}
                                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'url'
                                    ? 'text-amber-500 border-b-2 border-amber-500 bg-white/5'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                Importer URL
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {activeTab === 'manual' ? (
                                <ManualBeerForm
                                    formData={formData}
                                    onChange={setFormData}
                                    onSubmit={handleManualSubmit}
                                    loading={loading}
                                    onCancel={onClose}
                                />
                            ) : activeTab === 'existing' ? (
                                <ExistingBeerSearch
                                    sessionId={sessionId}
                                    onBeerAdded={onBeerAdded || (() => { })}
                                />
                            ) : (
                                <VinmonopoletSearch
                                    onBeerFound={(beer) => {
                                        setFormData(beer);
                                        setActiveTab('manual');
                                    }}
                                />
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
