import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { getBeerDraft, searchBeers, type BeerSuggestion } from '../../lib/vinmonopolet';
import type { BeerFormData } from '../AddBeerModal';

interface VinmonopoletSearchProps {
    onBeerFound: (beer: BeerFormData) => void;
}

export default function VinmonopoletSearch({ onBeerFound }: VinmonopoletSearchProps) {
    const [query, setQuery] = useState('');
    const [url, setUrl] = useState('');
    const [results, setResults] = useState<BeerSuggestion[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const search = async () => {
        setLoading(true);
        setError('');
        setResults(null);
        try {
            setResults(await searchBeers(query.trim()));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Søket feilet. Du kan registrere ølet manuelt.');
        } finally {
            setLoading(false);
        }
    };

    const importBeer = async (kind: 'url' | 'code', value: string) => {
        setLoading(true);
        setError('');
        try {
            onBeerFound(await getBeerDraft(kind, value.trim()));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import feilet. Du kan registrere ølet manuelt.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = 'min-w-0 flex-1 bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500';
    const buttonClass = 'px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium disabled:opacity-50';

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-medium text-white">Hent opplysninger fra Vinmonopolet</h3>
                <p className="text-slate-300 text-sm mt-1">Søk etter øl eller lim inn en produktlenke. Du kan kontrollere og endre opplysningene før du lagrer.</p>
            </div>
            <form onSubmit={event => { event.preventDefault(); void search(); }} className="space-y-2">
                <label htmlFor="vinmonopolet-query" className="block text-sm font-medium text-slate-300">Søk etter øl</label>
                <div className="flex gap-2">
                    <input id="vinmonopolet-query" value={query} onChange={event => setQuery(event.target.value)} maxLength={80} placeholder="For eksempel juleøl" className={inputClass} />
                    <button type="submit" disabled={loading || query.trim().length < 2} className={buttonClass}><Search className="w-4 h-4 inline mr-1" />Søk</button>
                </div>
            </form>
            {results && (results.length ? (
                <ul aria-label="Øltreff" className="space-y-2">
                    {results.map(result => <li key={result.code}><button type="button" disabled={loading} onClick={() => void importBeer('code', result.code)} className="w-full text-left rounded-lg bg-slate-800/50 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50">{result.name}</button></li>)}
                </ul>
            ) : <p className="text-sm text-slate-300">Ingen øl funnet. Prøv et annet søk eller registrer ølet manuelt.</p>)}
            <form onSubmit={event => { event.preventDefault(); void importBeer('url', url); }} className="space-y-2">
                <label htmlFor="vinmonopolet-url" className="block text-sm font-medium text-slate-300">Produktlenke fra Vinmonopolet</label>
                <div className="flex gap-2">
                    <input id="vinmonopolet-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://www.vinmonopolet.no/.../p/12345678" className={inputClass} />
                    <button type="submit" disabled={loading || !url.trim()} className={buttonClass}>Hent</button>
                </div>
            </form>
            {loading && <p role="status" className="text-sm text-slate-300"><Loader2 className="inline w-4 h-4 mr-2 animate-spin" />Henter fra Vinmonopolet …</p>}
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        </div>
    );
}
