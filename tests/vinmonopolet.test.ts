import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../api/vinmonopolet.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const product = {
    code: '20008602', name: 'Aass Juleøl Premium', main_category: { code: 'øl' },
    main_producer: { name: 'Aass Bryggeri' }, main_sub_category: { name: 'Mørk lager' },
    content: { traits: [{ name: 'Alkohol', formattedValue: '6,5%' }] }, taste: 'Maltpreget.',
    images: [{ format: 'product', url: 'https://bilder.vinmonopolet.no/cache/300x300-0/20008602-1.jpg' }],
};
const request = (query: string) => GET(new Request(`http://localhost/api/vinmonopolet?${query}`));

test('search filters non-beers, duplicates and invalid entries', async () => {
    globalThis.fetch = async () => Response.json({ suggestionGroups: [{ elements: [
        { product }, { product }, { product: { ...product, code: '123', main_category: { code: 'vin' } } }, {},
    ] }] });
    const response = await request('term=jule%C3%B8l');
    assert.deepEqual(await response.json(), { results: [{ code: '20008602', name: 'Aass Juleøl Premium' }] });
});

test('URL imports the verified product fields and does not invent missing values', async () => {
    globalThis.fetch = async input => {
        assert.equal(String(input), 'https://www.vinmonopolet.no/vmpws/v3/vmp/products/20008602?fields=FULL');
        return Response.json(product);
    };
    const response = await request(`url=${encodeURIComponent('https://www.vinmonopolet.no/Land/Norge/p/20008602')}`);
    assert.deepEqual(await response.json(), { draft: {
        name: 'Aass Juleøl Premium', brewery: 'Aass Bryggeri', style: 'Mørk lager',
        abv: '6.5', description: 'Maltpreget.', imageUrl: product.images[0].url,
    } });
    globalThis.fetch = async () => Response.json({ code: '20008602', name: 'Øl', main_category: { code: 'øl' } });
    const missing = await (await request('code=20008602')).json();
    assert.deepEqual(missing.draft, { name: 'Øl', brewery: '', style: '', abv: '', description: '', imageUrl: '' });
});

test('invalid URLs, non-beer products and upstream failures return useful errors', async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ ...product, main_category: { code: 'vin' } }); };
    assert.equal((await request(`url=${encodeURIComponent('https://evil.test/p/20008602')}`)).status, 400);
    assert.equal(calls, 0);
    assert.equal((await request('code=20008602')).status, 404);
    globalThis.fetch = async () => { throw new Error('network'); };
    const response = await request('term=juleol');
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /registrere ølet manuelt/);
});
