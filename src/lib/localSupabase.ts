import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

// This adapter is used only by the Vite development server. Nothing is sent to Supabase.
const USER_KEY = 'juleol.local.user';
const DATA_KEY = 'juleol.local.data';
const names = ['Anna', 'Bjørn', 'Camilla', 'David'];
export const localUsers: User[] = names.map((name, index) => ({
    id: `00000000-0000-4000-8000-00000000000${index + 1}`,
    email: `test${index + 1}@juleol.local`,
    app_metadata: {},
    user_metadata: { full_name: name },
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00.000Z',
}));

type Row = Record<string, unknown>;
type Database = Record<string, Row[]>;
const emptyDatabase = (): Database => ({
    profiles: localUsers.map(user => ({ id: user.id, full_name: user.user_metadata.full_name, avatar_url: null })),
    sessions: [], session_participants: [], beers: [], session_beers: [], ratings: [],
});
const readDatabase = (): Database => {
    let db: Database;
    try { db = JSON.parse(localStorage.getItem(DATA_KEY) || 'null') || emptyDatabase(); }
    catch { db = emptyDatabase(); }
    const seedKey = 'juleol.local.scoreboard-demo-created';
    if (!localStorage.getItem(seedKey)) {
        const sessionId = '655ee20c-fa56-4ded-a656-f0fb10112a9b';
        const now = new Date().toISOString();
        db.sessions.push({ id: sessionId, name: 'Testsmaking – tilfeldig scoreboard', host_id: localUsers[0].id, join_code: 'DEMO26', date: now.slice(0, 10), created_at: now, is_active: true });
        localUsers.forEach(user => db.session_participants.push({ session_id: sessionId, user_id: user.id, joined_at: now }));
        const beers = Array.from({ length: 20 }, (_, i) => ({ id: crypto.randomUUID(), name: `Testjuleøl ${String(i + 1).padStart(2, '0')}`, brewery: 'Testbryggeri', style: 'Juleøl', created_at: now }));
        db.beers.push(...beers);
        beers.forEach((beer, i) => db.session_beers.push({ session_id: sessionId, beer_id: beer.id, sorting_order: i, added_by: localUsers[0].id, created_at: now }));
        localUsers.forEach((user, i) => {
            for (let j = 0; j < 10; j++) {
                db.ratings.push({ id: crypto.randomUUID(), session_id: sessionId, user_id: user.id, beer_id: beers[(j + i * 3) % 20].id, taste: Math.floor(Math.random() * 6), mouthfeel: Math.floor(Math.random() * 6), overall: Math.floor(Math.random() * 6), comment: '', created_at: now });
            }
        });
        localStorage.setItem(DATA_KEY, JSON.stringify(db));
        localStorage.setItem(seedKey, '1');
    }
    return db;
};
const currentUser = () => localUsers.find(user => user.id === localStorage.getItem(USER_KEY)) ?? null;
const currentSession = (): Session | null => {
    const user = currentUser();
    return user ? { user, access_token: 'local', refresh_token: 'local', token_type: 'bearer', expires_in: 3600 } : null;
};
const authListeners = new Set<(event: 'SIGNED_IN' | 'SIGNED_OUT', session: Session | null) => void>();
const changeListeners = new Set<() => void>();

export function signInLocal(userId: string) {
    if (!localUsers.some(user => user.id === userId)) throw new Error('Ukjent testbruker');
    localStorage.setItem(USER_KEY, userId);
    authListeners.forEach(listener => listener('SIGNED_IN', currentSession()));
}

class LocalQuery implements PromiseLike<{ data: unknown; error: Error | null }> {
    private table: string;
    private filters: ((row: Row, db: Database) => boolean)[] = [];
    private operation: 'select' | 'insert' | 'upsert' | 'delete' = 'select';
    private values: Row[] = [];
    private conflict: string[] = [];
    private selection = '';
    private singleMode: 'single' | 'maybe' | null = null;
    private sortColumn = '';
    private ascending = true;
    private maxRows: number | null = null;

    constructor(table: string) { this.table = table; }
    select(selection = '*') { this.selection = selection; return this; }
    insert(values: Row | Row[]) { this.operation = 'insert'; this.values = Array.isArray(values) ? values : [values]; return this; }
    upsert(values: Row | Row[], options?: { onConflict?: string }) {
        this.operation = 'upsert'; this.values = Array.isArray(values) ? values : [values];
        this.conflict = options?.onConflict?.split(',') ?? ['id']; return this;
    }
    delete() { this.operation = 'delete'; return this; }
    eq(column: string, value: unknown) {
        this.filters.push((row, db) => column === 'session_participants.user_id'
            ? db.session_participants.some(participant => participant.session_id === row.id && participant.user_id === value)
            : row[column] === value);
        return this;
    }
    ilike(column: string, value: string) {
        const pattern = new RegExp(`^${value.split('%').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i');
        this.filters.push(row => pattern.test(String(row[column] ?? ''))); return this;
    }
    order(column: string, options?: { ascending?: boolean }) { this.sortColumn = column; this.ascending = options?.ascending ?? true; return this; }
    limit(count: number) { this.maxRows = count; return this; }
    single() { this.singleMode = 'single'; return this; }
    maybeSingle() { this.singleMode = 'maybe'; return this; }
    then<TResult1 = { data: unknown; error: Error | null }, TResult2 = never>(
        onfulfilled?: ((value: { data: unknown; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> { return Promise.resolve().then(() => this.execute()).then(onfulfilled, onrejected); }

    private execute(): { data: unknown; error: Error | null } {
        const db = readDatabase();
        const table = db[this.table];
        if (!table) return { data: null, error: new Error(`Ukjent tabell: ${this.table}`) };
        const matches = (row: Row) => this.filters.every(filter => filter(row, db));
        let rows: Row[];
        if (this.operation === 'insert' || this.operation === 'upsert') {
            rows = this.values.map(value => {
                const existing = this.operation === 'upsert' ? table.find(row => this.conflict.every(key => row[key] === value[key])) : undefined;
                if (existing) { Object.assign(existing, value); return existing; }
                const row: Row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...value };
                if (this.table === 'sessions') {
                    row.is_active = true;
                    db.session_participants.push({ session_id: row.id, user_id: row.host_id });
                }
                if (this.table === 'session_beers') row.sorting_order ??= 0;
                table.push(row); return row;
            });
        } else if (this.operation === 'delete') {
            rows = table.filter(matches);
            db[this.table] = table.filter(row => !matches(row));
        } else {
            rows = table.filter(matches);
        }
        if (this.operation !== 'select') {
            localStorage.setItem(DATA_KEY, JSON.stringify(db));
            changeListeners.forEach(listener => listener());
        }
        if (this.sortColumn) {
            const column = this.sortColumn;
            rows.sort((a, b) => String(a[column] ?? '').localeCompare(String(b[column] ?? ''), undefined, { numeric: true }) * (this.ascending ? 1 : -1));
        }
        if (this.maxRows !== null) rows = rows.slice(0, this.maxRows);
        rows = rows.map(row => ({
            ...row,
            ...(this.table === 'session_beers' && this.selection.includes('beers (') ? { beers: db.beers.find(beer => beer.id === row.beer_id) ?? null } : {}),
            ...(this.table === 'session_beers' && this.selection.includes('profiles:added_by') ? { profiles: db.profiles.find(profile => profile.id === row.added_by) ?? null } : {}),
            ...(this.table === 'ratings' && this.selection.includes('beers (') ? { beers: db.beers.find(beer => beer.id === row.beer_id) ?? null } : {}),
            ...(this.table === 'ratings' && this.selection.includes('profiles (') ? { profiles: db.profiles.find(profile => profile.id === row.user_id) ?? null } : {}),
        }));
        if (this.singleMode) {
            if (rows.length > 1 || (rows.length === 0 && this.singleMode === 'single')) return { data: null, error: new Error('Fant ikke nøyaktig én rad') };
            return { data: rows[0] ?? null, error: null };
        }
        return { data: rows, error: null };
    }
}

const localClient = {
    auth: {
        getSession: async () => ({ data: { session: currentSession() }, error: null }),
        getUser: async () => ({ data: { user: currentUser() }, error: null }),
        onAuthStateChange: (listener: (event: 'SIGNED_IN' | 'SIGNED_OUT', session: Session | null) => void) => {
            authListeners.add(listener);
            return { data: { subscription: { unsubscribe: () => authListeners.delete(listener) } } };
        },
        signOut: async () => {
            localStorage.removeItem(USER_KEY);
            authListeners.forEach(listener => listener('SIGNED_OUT', null));
            return { error: null };
        },
    },
    from: (table: string) => new LocalQuery(table),
    channel: () => {
        let callback: (() => void) | undefined;
        const channel = {
            on: (_event: string, _filter: unknown, listener: () => void) => { callback = listener; return channel; },
            subscribe: () => { if (callback) changeListeners.add(callback); return channel; },
            unsubscribe: () => { if (callback) changeListeners.delete(callback); },
        };
        return channel;
    },
    removeChannel: (channel: { unsubscribe: () => void }) => channel.unsubscribe(),
};

export const localSupabase = localClient as unknown as SupabaseClient;
