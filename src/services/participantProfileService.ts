import { supabase } from '../lib/supabase';

export type ParticipantProfile = {
    answers: string[];
    boundaries: string;
    followups: { question: string; answer: string }[];
    ready: boolean;
};

export function emptyProfile(): ParticipantProfile {
    return { answers: ['', '', '', ''], boundaries: '', followups: [], ready: false };
}

type ProfileState = { profile: ParticipantProfile | null; previousAvailable: boolean };
type LocalEntry = { sessionCreatedAt: string; profile: ParticipantProfile };

export function participantProfiles(sessionId: string, userId: string, sessionCreatedAt: string) {
    const localKey = `juleol.local.participantProfiles.v1.${userId}`;
    const readLocal = (): Record<string, LocalEntry> => JSON.parse(localStorage.getItem(localKey) ?? '{}');
    const previousLocal = (entries: Record<string, LocalEntry>) => Object.values(entries)
        .filter(entry => entry.profile.ready && entry.sessionCreatedAt < sessionCreatedAt)
        .sort((a, b) => b.sessionCreatedAt.localeCompare(a.sessionCreatedAt))[0];
    function storeLocal(profile: ParticipantProfile) {
        localStorage.setItem(localKey, JSON.stringify({ ...readLocal(), [sessionId]: { sessionCreatedAt, profile } }));
        return profile;
    }

    async function rpc(name: string, args = {}) {
        const { data, error } = await supabase.rpc(name, { target: sessionId, ...args });
        if (error) {
            if (error.code === '42501') throw new Error('Du må delta i smakingen for å bruke deltakerprofilen.');
            if (error.code === 'P0010') throw new Error(error.message);
            throw new Error('Kunne ikke oppdatere deltakerprofilen. Prøv igjen.');
        }
        return data;
    }

    async function load(): Promise<ProfileState> {
        if (import.meta.env.DEV) {
            const { data: member, error } = await supabase.from('session_participants').select('user_id')
                .eq('session_id', sessionId).eq('user_id', userId).maybeSingle();
            if (error || !member) throw new Error('Du må delta i smakingen for å bruke deltakerprofilen.');
            const entries = readLocal();
            return { profile: entries[sessionId]?.profile ?? null, previousAvailable: Boolean(previousLocal(entries)) };
        }
        return rpc('get_participant_profile');
    }

    return {
        load,
        async save(profile: ParticipantProfile, ready: boolean) {
            if (import.meta.env.DEV) return storeLocal({ ...profile, ready });
            await rpc('save_participant_profile', {
                new_answers: profile.answers,
                new_boundaries: profile.boundaries,
                new_followup_answers: profile.followups.map(item => item.answer),
                new_ready: ready,
            });
            return (await load()).profile ?? { ...profile, ready };
        },
        async reuse() {
            if (import.meta.env.DEV) {
                const entries = readLocal();
                const previous = previousLocal(entries);
                if (entries[sessionId] || !previous) throw new Error('Ingen tidligere profil kan kopieres.');
                return storeLocal({ ...previous.profile, ready: false });
            }
            await rpc('reuse_participant_profile');
            return (await load()).profile ?? emptyProfile();
        },
        async followUp() {
            if (import.meta.env.DEV) {
                const profile = readLocal()[sessionId]?.profile;
                const question = [
                    'Kan du fortelle om en gang dette skjedde?',
                    'Hvordan reagerte de andre da det skjedde?',
                ][profile?.followups.length ?? 2];
                if (!profile || !question || !profile.answers.some(answer => answer.trim())) {
                    throw new Error('Ingen oppfølging tilgjengelig.');
                }
                return storeLocal({ ...profile, ready: false, followups: [...profile.followups, { question, answer: '' }] });
            }
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Logg inn på nytt for å be om et oppfølgingsspørsmål.');
            const response = await fetch('/api/profile-follow-up', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.error ?? 'Kunne ikke lage oppfølgingsspørsmål. Svarene dine er lagret.');
            }
            const state = await load();
            if (!state.profile) throw new Error('Kunne ikke hente oppfølgingsspørsmålet. Åpne profilen igjen.');
            return state.profile;
        },
    };
}
