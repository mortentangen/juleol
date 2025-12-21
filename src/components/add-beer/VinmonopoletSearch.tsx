import { useState } from 'react';
import { Loader2, Plus, Link as LinkIcon } from 'lucide-react';
import { importFromVinmonopolet } from '../../lib/vinmonopolet';
import type { BeerFormData } from '../AddBeerModal';

interface VinmonopoletSearchProps {
    onBeerFound: (beer: BeerFormData) => void;
}

export default function VinmonopoletSearch({ onBeerFound }: VinmonopoletSearchProps) {
    const [importUrl, setImportUrl] = useState('');
    const [importing, setImporting] = useState(false);

    const handleImportUrl = async () => {
        if (!importUrl.trim()) return;

        setImporting(true);
        try {
            const beer = await importFromVinmonopolet(importUrl);
            if (beer) {
                onBeerFound({
                    name: beer.name,
                    brewery: beer.brewery,
                    style: beer.style,
                    abv: beer.abv?.toString() || '',
                    description: beer.description || '',
                    imageUrl: beer.imageUrl || ''
                });
                setImportUrl('');
            } else {
                alert('Kunne ikke importere øl fra URL. Vennligst sjekk URLen og prøv igjen.');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Import feilet. Prøv igjen eller bruk manuell registrering.');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="text-center py-4">
                <LinkIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Importer fra Vinmonopolet</h3>
                <p className="text-slate-300 text-sm mb-4">Lim inn en Vinmonopolet produkt-URL for å fylle ut detaljer automatisk</p>
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
                            Importerer...
                        </>
                    ) : (
                        <>
                            <Plus className="w-5 h-5 mr-2" />
                            Importer
                        </>
                    )}
                </button>
            </div>

            <div className="bg-slate-800/30 border border-white/10 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-2">Hvordan bruke:</h4>
                <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                    <li>Gå til <a href="https://www.vinmonopolet.no" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">vinmonopolet.no</a></li>
                    <li>Finn ølen du vil legge til</li>
                    <li>Kopier URLen fra nettleseren</li>
                    <li>Lim den inn over og trykk Importer</li>
                </ol>
            </div>
        </div>
    );
}
