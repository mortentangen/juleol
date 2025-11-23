// Beer search service using Sample APIs Beer Database
// Sample APIs is a free, open API with beers from multiple breweries
// No authentication required - completely free to use
// Documentation: https://sampleapis.com/api-list/beers

export interface BeerSearchResult {
    id: string;
    name: string;
    brewery: string;
    style: string;
    abv: number | null;
    description: string;
    imageUrl: string;
}

interface SampleAPIBeer {
    id: number;
    name: string;
    price?: string;
    rating?: {
        average: number;
        reviews: number;
    };
    image: string;
}

const SAMPLE_API_BASE = 'https://api.sampleapis.com/beers';
const BEER_CATEGORIES = ['ale', 'stouts', 'lagers'];

export async function searchBeers(query: string): Promise<BeerSearchResult[]> {
    if (!query || query.trim().length < 2) {
        return [];
    }

    try {
        const lowerQuery = query.toLowerCase().trim();
        const allResults: BeerSearchResult[] = [];

        // Search across all beer categories
        const promises = BEER_CATEGORIES.map(async (category) => {
            try {
                const response = await fetch(`${SAMPLE_API_BASE}/${category}`);
                if (!response.ok) return [];

                const data: SampleAPIBeer[] = await response.json();

                // Filter beers that match the query
                return data
                    .filter(beer =>
                        beer.name?.toLowerCase().includes(lowerQuery) ||
                        category.toLowerCase().includes(lowerQuery)
                    )
                    .map(beer => ({
                        id: `${category}-${beer.id}`,
                        name: beer.name || 'Unknown Beer',
                        brewery: 'Various', // Sample API doesn't include brewery info
                        style: category.charAt(0).toUpperCase() + category.slice(1), // Capitalize category
                        abv: null, // Sample API doesn't include ABV
                        description: beer.rating
                            ? `Rating: ${beer.rating.average.toFixed(1)}/5 (${beer.rating.reviews} reviews)`
                            : '',
                        imageUrl: beer.image || '',
                    }))
                    .slice(0, 10); // Limit per category
            } catch (error) {
                console.error(`Error fetching ${category}:`, error);
                return [];
            }
        });

        const results = await Promise.all(promises);
        results.forEach(categoryResults => allResults.push(...categoryResults));

        return allResults.slice(0, 25); // Return max 25 results
    } catch (error) {
        console.error('Error searching beers:', error);
        return [];
    }
}

// Import beer from Vinmonopolet URL
export async function importFromVinmonopolet(url: string): Promise<BeerSearchResult | null> {
    try {
        // Extract product ID from URL
        // Format: https://www.vinmonopolet.no/.../p/PRODUCTID
        const match = url.match(/\/p\/(\d+)/);
        if (!match) {
            throw new Error('Invalid Vinmonopolet URL format');
        }

        const productId = match[1];

        // Use CORS proxy to fetch the page
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch product page');
        }

        const html = await response.text();

        // Extract data using regex patterns
        const extractText = (pattern: RegExp): string => {
            const match = html.match(pattern);
            return match ? match[1].trim() : '';
        };

        // Extract product name from title or h1
        const nameMatch = html.match(/<title>([^<]+?)\s*-\s*Vinmonopolet<\/title>/) ||
            html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const name = nameMatch ? nameMatch[1].trim() : '';

        // Extract brewery/producer
        const brewery = extractText(/Produsent.*?<a[^>]*>([^<]+)<\/a>/) ||
            extractText(/brand:([^"]+)"/) ||
            'Unknown';

        // Extract style
        const style = extractText(/Varetype([^<]+)</) ||
            extractText(/Øl\s*-\s*([^<,]+)/) ||
            extractText(/"main_sub_category":\{"code":"[^"]+","name":"([^"]+)"/) ||
            'Beer';

        // Extract ABV - look for JSON structure or text
        let abv: number | null = null;

        // Try JSON structure first
        const abvJsonMatch = html.match(/"readableValue":"(\d+(?:[.,]\d+)?)\s*prosent"/);
        if (abvJsonMatch) {
            abv = parseFloat(abvJsonMatch[1].replace(',', '.'));
        }

        // Fallback to text patterns
        if (!abv) {
            const abvText = extractText(/Alkohol\s*(\d+(?:[.,]\d+)?)\s*%/) ||
                extractText(/(\d+(?:[.,]\d+)?)\s*%\s*vol/);
            abv = abvText ? parseFloat(abvText.replace(',', '.')) : null;
        }

        // Extract description - look for JSON "taste" field first
        let description = '';

        // Try JSON taste field
        const tasteJsonMatch = html.match(/"taste":"([^"]+)"/);
        if (tasteJsonMatch && tasteJsonMatch[1]) {
            description = tasteJsonMatch[1].trim();
        }

        // Fallback to smell if no taste
        if (!description) {
            const smellJsonMatch = html.match(/"smell":"([^"]+)"/);
            if (smellJsonMatch && smellJsonMatch[1]) {
                description = smellJsonMatch[1].trim();
            }
        }

        // Last resort: try HTML patterns
        if (!description) {
            const smakMatch = html.match(/Smak([^<]+?)(?:<|$)/i);
            if (smakMatch && smakMatch[1]) {
                description = smakMatch[1].trim();
            }
        }

        // Final fallback: meta description (cleaned)
        if (!description) {
            const metaMatch = html.match(/description"[^>]*content="([^"]+)"/);
            if (metaMatch && metaMatch[1]) {
                const fullDesc = metaMatch[1];
                const priceIndex = fullDesc.indexOf('Kr ');
                description = priceIndex > 0 ? fullDesc.substring(0, priceIndex).trim() : fullDesc;
            }
        }

        // Construct image URL
        const imageUrl = `https://bilder.vinmonopolet.no/cache/300x300-0/${productId}-1.jpg`;

        if (!name) {
            throw new Error('Could not extract beer name from page');
        }

        return {
            id: `vinmonopolet-${productId}`,
            name: name.replace(/\s*-\s*Vinmonopolet$/, ''), // Remove " - Vinmonopolet" suffix
            brewery: brewery.trim(),
            style: style.trim(),
            abv,
            description: description.trim(),
            imageUrl,
        };
    } catch (error) {
        console.error('Error importing from Vinmonopolet:', error);
        return null;
    }
}
