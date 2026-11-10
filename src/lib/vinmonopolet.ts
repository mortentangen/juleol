import type { BeerFormData } from '../components/AddBeerModal';

export interface BeerSuggestion {
    code: string;
    name: string;
}

async function catalogRequest<T>(params: URLSearchParams): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`/api/vinmonopolet?${params}`);
    } catch {
        throw new Error('Vinmonopolet svarer ikke nå. Du kan registrere ølet manuelt.');
    }
    let data: T & { error?: string };
    try {
        data = await response.json();
    } catch {
        throw new Error('Kunne ikke hente fra Vinmonopolet. Du kan registrere ølet manuelt.');
    }
    if (!response.ok) throw new Error(data.error || 'Kunne ikke hente fra Vinmonopolet. Du kan registrere ølet manuelt.');
    return data;
}

export async function searchBeers(term: string): Promise<BeerSuggestion[]> {
    const data = await catalogRequest<{ results: BeerSuggestion[] }>(new URLSearchParams({ term }));
    return data.results;
}

export async function getBeerDraft(kind: 'url' | 'code', value: string): Promise<BeerFormData> {
    const data = await catalogRequest<{ draft: BeerFormData }>(new URLSearchParams({ [kind]: value }));
    return data.draft;
}
