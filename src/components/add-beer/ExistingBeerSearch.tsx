import { useState, useEffect } from 'react';
import { Search, Loader2, Beer as BeerIcon, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Beer } from '../../types';

interface ExistingBeerSearchProps {
    sessionId: string;
    onBeerAdded: () => void;
}

export default function ExistingBeerSearch({ sessionId, onBeerAdded }: ExistingBeerSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [existingBeers, setExistingBeers] = useState<Beer[]>([]);
    const [addedBeerIds, setAddedBeerIds] = useState<Set<string>>(new Set());
    // Use an object to track loading state per beer to avoid UI flicker
    const [addingBeerId, setAddingBeerId] = useState<string | null>(null);

    useEffect(() => {
        fetchSessionBeerIds();
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchExistingBeers();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchSessionBeerIds = async () => {
        const { data } = await supabase
            .from('session_beers')
            .select('beer_id')
            .eq('session_id', sessionId);

        if (data) {
            setAddedBeerIds(new Set(data.map(item => item.beer_id)));
        }
    }

    const fetchExistingBeers = async () => {
        setSearching(true);
        try {
            let query = supabase
                .from('beers')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (searchQuery) {
                query = query.ilike('name', `%${searchQuery}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setExistingBeers(data || []);
        } catch (error) {
            // console.error('Error fetching beers:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleAddExistingBeer = async (beerId: string) => {
        if (addedBeerIds.has(beerId) || addingBeerId) return;

        setAddingBeerId(beerId);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('session_beers')
                .insert({
                    session_id: sessionId,
                    beer_id: beerId,
                    added_by: user?.id,
                });

            if (error) throw error;

            setAddedBeerIds(prev => new Set(prev).add(beerId));
            onBeerAdded();
        } catch (error) {
            console.error('Error adding existing beer:', error);
            alert('Kunne ikke legge til øl. Vennligst prøv igjen.');
        } finally {
            setAddingBeerId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Søk i eksisterende øl..."
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {searching ? (
                    <div className="text-center py-8 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Leter etter øl...
                    </div>
                ) : existingBeers.filter(beer => !addedBeerIds.has(beer.id)).length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        {existingBeers.length === 0 ? "Ingen øl funnet." : "Alle disse ølene er allerede lagt til."}
                    </div>
                ) : (
                    existingBeers
                        .filter(beer => !addedBeerIds.has(beer.id))
                        .map((beer) => (
                            <div
                                key={beer.id}
                                onClick={() => handleAddExistingBeer(beer.id)}
                                className="flex items-center p-3 bg-slate-800/30 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 rounded-lg cursor-pointer transition-all group"
                            >
                                <div className="w-10 h-10 bg-slate-700/50 rounded flex items-center justify-center mr-3 flex-shrink-0">
                                    {beer.image_url ? (
                                        <img src={beer.image_url} alt={beer.name} className="w-full h-full object-cover rounded" />
                                    ) : (
                                        <BeerIcon className="w-5 h-5 text-slate-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-medium truncate group-hover:text-amber-400 transition-colors">
                                        {beer.name}
                                    </h4>
                                    <p className="text-sm text-slate-400 truncate">{beer.brewery}</p>
                                </div>
                                <button className="p-2 text-slate-400 group-hover:text-amber-500 transition-colors">
                                    {addingBeerId === beer.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                </button>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
