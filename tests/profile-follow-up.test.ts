import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { POST } from '../api/profile-follow-up.ts';

const sessionId = 'a8d3f1c0-5b44-4e7d-87ad-4d826a75471d';
const request = (authorization = 'Bearer test-user') => new Request('http://localhost/api/profile-follow-up', {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
});
const reservation = { token: 'test-reservation', answers: ['Jeg baker hver helg.', '', '', ''], followups: [] };
const modelAnswer = 'Hva bakte du sist helg?';

function testConfig(context: TestContext) {
    const config = {
        VITE_SUPABASE_URL: 'https://supabase.example',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
        OPENAI_API_KEY: 'test-model-key',
    };
    for (const [name, value] of Object.entries(config)) {
        const original = process.env[name];
        process.env[name] = value;
        context.after(() => {
            if (original === undefined) delete process.env[name];
            else process.env[name] = original;
        });
    }
}

test('generates from voluntary answers and stores the question as the signed-in user', async context => {
    testConfig(context);
    const calls: string[] = [];
    context.mock.method(globalThis, 'fetch', async (input: string | URL, options: RequestInit) => {
        const url = new URL(input);
        const body = JSON.parse(String(options.body));
        const headers = new Headers(options.headers);
        calls.push(url.pathname);
        if (url.hostname === 'api.openai.com') {
            assert.equal(headers.get('authorization'), 'Bearer test-model-key');
            assert.equal(body.store, false);
            const prompt = JSON.parse(body.input[1].content);
            assert.deepEqual(Object.keys(prompt).sort(), ['answers', 'previousFollowups']);
            assert.equal(prompt.answers[0].answer, reservation.answers[0]);
            assert.equal(prompt.answers.length, 1);
            return Response.json({
                output: [{ content: [{ type: 'output_text', text: modelAnswer }] }],
                usage: { input_tokens: 70, output_tokens: 9 },
            });
        }
        assert.equal(headers.get('authorization'), 'Bearer test-user');
        assert.equal(body.target, sessionId);
        if (url.pathname.endsWith('/begin_profile_followup')) {
            return Response.json({ ...reservation, boundaries: 'Hemmelig grense' });
        }
        assert.deepEqual(body, { target: sessionId, reservation: reservation.token, question: modelAnswer });
        return new Response(null, { status: 204 });
    });

    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { usage: { inputTokens: 70, outputTokens: 9 } });
    assert.deepEqual(calls, ['/rest/v1/rpc/begin_profile_followup', '/v1/responses', '/rest/v1/rpc/finish_profile_followup']);
});

test('cancels the reservation on a model failure so the saved profile can be retried', async context => {
    testConfig(context);
    const calls: string[] = [];
    context.mock.method(globalThis, 'fetch', async (input: string | URL, options: RequestInit) => {
        const { pathname } = new URL(input);
        calls.push(pathname);
        if (pathname.endsWith('/begin_profile_followup')) return Response.json(reservation);
        if (pathname === '/v1/responses') return new Response(null, { status: 502 });
        assert.deepEqual(JSON.parse(String(options.body)), { target: sessionId, reservation: reservation.token });
        return new Response(null, { status: 204 });
    });

    const response = await POST(request());
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Svarene dine er lagret/);
    assert.deepEqual(calls, ['/rest/v1/rpc/begin_profile_followup', '/v1/responses', '/rest/v1/rpc/cancel_profile_followup']);
});

test('rejects missing sign-in and does not call OpenAI when the database denies a reservation', async context => {
    testConfig(context);
    const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
        Response.json({ code: 'P0010', message: 'Ingen oppfølging tilgjengelig' }, { status: 400 }));

    assert.equal((await POST(request(''))).status, 401);
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.equal((await POST(request())).status, 409);
    assert.equal(fetchMock.mock.callCount(), 1);
});
