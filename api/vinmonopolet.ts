const catalogOrigin = 'https://www.vinmonopolet.no';
const productPath = '/vmpws/v3/vmp/products';
const productCode = /^[1-9]\d{0,11}$/;
const userAgent = 'Juleol/1.0 (morten.tangen@gmail.com)';

type Data = Record<string, unknown>;
const object = (value: unknown): Data => value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
const string = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

class CatalogError extends Error {
    constructor(publicStatus: number, message: string) {
        super(message);
        this.status = publicStatus;
    }
    status: number;
}

async function catalogJson(path: string): Promise<Data> {
    let response: Response;
    try {
        response = await fetch(new URL(path, catalogOrigin), {
            headers: { accept: 'application/json', 'user-agent': userAgent },
            redirect: 'error', signal: AbortSignal.timeout(6000),
        });
    } catch {
        throw new CatalogError(502, 'Vinmonopolet svarer ikke nå. Du kan registrere ølet manuelt.');
    }
    if (response.status === 404) throw new CatalogError(404, 'Fant ikke produktet hos Vinmonopolet.');
    if (!response.ok) throw new CatalogError(502, 'Kunne ikke hente fra Vinmonopolet. Du kan registrere ølet manuelt.');
    try {
        return object(await response.json());
    } catch {
        throw new CatalogError(502, 'Vinmonopolet sendte et ugyldig svar. Du kan registrere ølet manuelt.');
    }
}

function codeFromUrl(input: string): string {
    let url: URL;
    try { url = new URL(input); } catch { throw new CatalogError(400, 'Lim inn en produktlenke fra vinmonopolet.no.'); }
    const code = url.pathname.match(/\/p\/([1-9]\d{0,11})\/?$/)?.[1];
    if (url.protocol !== 'https:' || !['www.vinmonopolet.no', 'vinmonopolet.no'].includes(url.hostname) || url.port || url.username || url.password || !code) {
        throw new CatalogError(400, 'Lim inn en gyldig produktlenke fra vinmonopolet.no.');
    }
    return code;
}

async function search(term: string) {
    if (term.length < 2 || term.length > 80) throw new CatalogError(400, 'Søket må være mellom 2 og 80 tegn.');
    const data = await catalogJson(`${productPath}/suggestions?term=${encodeURIComponent(term)}`);
    const groups = Array.isArray(data.suggestionGroups) ? data.suggestionGroups : [];
    const seen = new Set<string>();
    const results: { code: string; name: string }[] = [];
    for (const group of groups) {
        const elements = object(group).elements;
        if (!Array.isArray(elements)) continue;
        for (const element of elements) {
            const product = object(object(element).product);
            const code = string(product.code);
            const name = string(product.name);
            if (!productCode.test(code) || !name || string(object(product.main_category).code) !== 'øl' || seen.has(code)) continue;
            seen.add(code);
            results.push({ code, name });
            if (results.length === 8) return results;
        }
    }
    return results;
}

async function draft(code: string) {
    if (!productCode.test(code)) throw new CatalogError(400, 'Ugyldig produktnummer.');
    const product = await catalogJson(`${productPath}/${code}?fields=FULL`);
    if (string(product.code) !== code || string(object(product.main_category).code) !== 'øl' || !string(product.name)) {
        throw new CatalogError(404, 'Fant ikke et øl med dette produktnummeret.');
    }
    const traits = object(product.content).traits;
    const alcoholTrait = Array.isArray(traits) ? traits.find(trait => object(trait).name === 'Alkohol') : undefined;
    const match = string(object(alcoholTrait).formattedValue).match(/^(\d{1,2}(?:[,.]\d{1,2})?)\s*%$/);
    const imageUrl = `https://bilder.vinmonopolet.no/cache/300x300-0/${code}-1.jpg`;
    const hasImage = Array.isArray(product.images) && product.images.some(image => object(image).format === 'product' && object(image).url === imageUrl);
    return {
        name: string(product.name).slice(0, 160),
        brewery: string(object(product.main_producer).name).slice(0, 160),
        style: string(object(product.main_sub_category).name).slice(0, 100),
        abv: match ? match[1].replace(',', '.') : '',
        description: (string(product.taste) || string(product.description) || string(product.summary)).slice(0, 2000),
        imageUrl: hasImage ? imageUrl : '',
    };
}

export async function GET(request: Request): Promise<Response> {
    try {
        const params = new URL(request.url).searchParams;
        const term = params.get('term');
        const code = params.get('code');
        const url = params.get('url');
        if ([term, code, url].filter(value => value !== null).length !== 1) throw new CatalogError(400, 'Velg søk, produktnummer eller produktlenke.');
        return Response.json(term !== null ? { results: await search(term.trim()) } : { draft: await draft(url !== null ? codeFromUrl(url) : code!) });
    } catch (error) {
        if (error instanceof CatalogError) return Response.json({ error: error.message }, { status: error.status });
        console.error('Vinmonopolet:', error);
        return Response.json({ error: 'Import feilet. Du kan registrere ølet manuelt.' }, { status: 500 });
    }
}
