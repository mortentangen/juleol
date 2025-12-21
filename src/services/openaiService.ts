import { SCORING, AI_SENTIMENT_THRESHOLDS, ROAST_THRESHOLDS } from '../constants';
import type { BeerScore } from '../types';

/**
 * Generates beer commentary audio directly (text + audio in one call).
 * Focus: clear Norwegian + short, funny roasting that participants can handle.
 */
export const generateBeerCommentaryAudio = async (
    apiKey: string,
    beerScore: BeerScore,
    allBeerScores: BeerScore[] = []
): Promise<ArrayBuffer> => {
    const getName = (profile: { full_name: string | null; email: string | null } | null): string => {
        if (!profile) return "Anonym";

        if (profile.full_name && profile.full_name.trim().length > 0) {
            return profile.full_name.trim().split(" ")[0]!;
        }
        if (profile.email && profile.email.includes("@")) {
            const localPart = profile.email.split("@")[0] ?? "anonym";
            const firstName = (localPart.split(".")[0] ?? "anonym").trim();
            return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        }
        return "Anonym";
    };

    const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

    const sanitizeShort = (s: unknown, maxLen: number): string => {
        if (typeof s !== "string") return "";
        // Remove newlines and quotes that can confuse the model; keep it readable.
        const cleaned = s
            .replace(/\s+/g, " ")
            .replace(/["“”]/g, "'")
            .trim();
        return cleaned.slice(0, maxLen);
    };

    // --- Extract data for current beer ---
    const beerNameRaw = String(beerScore?.beer?.name ?? "Ukjent øl");
    const beerName = sanitizeShort(beerNameRaw, 80);
    const avgScore = Number(beerScore?.avgScore ?? 0);

    const ratings = Array.isArray(beerScore?.ratings) ? beerScore.ratings : [];
    const totalScores: Array<{ name: string; total: number; comment: string }> = ratings.map((r) => {
        const taste = Number(r?.taste ?? 0);
        const mouthfeel = Number(r?.mouthfeel ?? 0);
        const overall = Number(r?.overall ?? 0);
        const total = clamp(taste + mouthfeel + overall, 0, 15);
        const name = getName(r.profiles);
        const comment = sanitizeShort(r?.comment, 40);
        return { name, total, comment };
    });

    const ratingCount = totalScores.length;

    const minScore = ratingCount ? Math.min(...totalScores.map(r => r.total)) : 0;
    const maxScore = ratingCount ? Math.max(...totalScores.map(r => r.total)) : 0;
    const spread = maxScore - minScore;

    const topRater = ratingCount
        ? totalScores.reduce((a, b) => (b.total > a.total ? b : a), totalScores[0]!)
        : null;

    const bottomRater = ratingCount
        ? totalScores.reduce((a, b) => (b.total < a.total ? b : a), totalScores[0]!)
        : null;

    const sentiment =
        avgScore >= AI_SENTIMENT_THRESHOLDS.EXCELLENT ? "svært godt" : avgScore <= AI_SENTIMENT_THRESHOLDS.POOR ? "svært dårlig" : avgScore >= AI_SENTIMENT_THRESHOLDS.GOOD ? "helt greit" : "midt på treet";

    // --- History (keep short; it’s just fuel for jokes) ---
    const previousBeers = allBeerScores
        .filter(b => b?.beer?.id !== beerScore?.beer?.id && Number(b?.ratingCount ?? 0) > 0)
        .slice(-5)
        .map(b => {
            const name = sanitizeShort(String(b?.beer?.name ?? "Ukjent"), 40);
            const score = Number(b?.avgScore ?? 0);
            // Avoid too many decimals; decimals can sound weird in TTS.
            const rounded = Math.round(score * 10) / 10;
            return `${name} (${rounded} av ${SCORING.MAX_SCORE})`;
        })
        .join(", ");

    // --- Choose roast target (critical for consistency) ---
    // Rule of thumb:
    // - Very low avg -> roast the beer.
    // - Very high avg -> roast the top rater (they’re hyping).
    // - High spread -> roast the group / disagreement.
    // - Otherwise roast the beer unless there is a clear “character” comment.
    let roastTarget: "beer" | "topRater" | "bottomRater" | "group" = "beer";
    if (spread >= ROAST_THRESHOLDS.SPREAD_HIGH && ratingCount >= ROAST_THRESHOLDS.MIN_RATING_COUNT_FOR_GROUP_ROAST) {
        roastTarget = "group";
    } else if (avgScore >= AI_SENTIMENT_THRESHOLDS.EXCELLENT && topRater) {
        roastTarget = "topRater";
    } else if (avgScore <= AI_SENTIMENT_THRESHOLDS.POOR) {
        roastTarget = "beer";
    } else if (bottomRater && avgScore >= AI_SENTIMENT_THRESHOLDS.GOOD) {
        // If it's decent but someone tanks it, poke the critic a bit.
        roastTarget = "bottomRater";
    }

    // --- Build structured context (easier to roast than prose) ---
    // Keep numbers simple. Avoid “7.2%” etc. Your scores are /15 anyway.
    const ratingsLine = totalScores
        .slice(0, 8)
        .map(r => (r.comment ? `${r.name}: ${r.total} ("${r.comment}")` : `${r.name}: ${r.total}`))
        .join(" | ");

    const roastHint =
        roastTarget === "beer"
            ? "ROAST_MÅL: ØLET (ikke deltakerne)."
            : roastTarget === "group"
                ? "ROAST_MÅL: GRUPPA (uenighet / smaksdommeri)."
                : roastTarget === "topRater"
                    ? `ROAST_MÅL: ${topRater?.name} (ga høy score).`
                    : `ROAST_MÅL: ${bottomRater?.name} (ga lav score).`;

    const contextDescription = [
        `SCENE: Juleølsmaking. Du er en spydig kommentator.`,
        `ØL: "${beerName}".`,
        `SNITT: ${Math.round(avgScore * 10) / 10} av 15 (${sentiment}).`,
        `SPREDNING: ${spread} (min ${minScore}, maks ${maxScore}).`,
        roastHint,
        ratingCount ? `VURDERINGER: ${ratingsLine}.` : "VURDERINGER: ingen.",
        previousBeers ? `TIDLIGERE I KVELD (kort): ${previousBeers}.` : "TIDLIGERE I KVELD: første øl.",
    ].join("\n");

    // --- System prompt: short, strict output contract + a couple examples ---
    // Important: we keep max_tokens high to avoid audio truncation, but we force short output via contract.
    const systemPrompt = [
        "Du snakker tydelig norsk bokmål. Unngå engelske ord og uttrykk.",
        "Du er en skitten, frekk og litt brisen julebords-kommentator.",
        "Bruk MANGE seksuelle antydninger, dobbelttydigheter og griseprat-metaforer (munnfølelse, svelging, lengde, tilfredsstillelse, stiv/slapp).",
        "Vær direkte, litt vulgær (men ikke eksplisitt pornografisk), og spel på at ølsmaking minner om sex.",
        "",
        "KONTRAKT (må følges):",
        "- Svar med NØYAKTIG 2 setninger.",
        "- Maks 25 ord totalt.",
        "- Inkluder alltid minst én seksuell dobbelttydighet relatert til smaking.",
        "- Roastekun: følg ROAST_MÅL, men gjør det skittent.",
        "",
        "Eksempler (tone og lengde):",
        "Input: ROAST_MÅL: ØLET. Smak: tynn.",
        "Output: Denne var skuffende slapp og altfor fort ferdig i munnen. Jeg håper den presterer bedre neste gang.",
        "",
        "Input: ROAST_MÅL: GRUPPA. Spredning høy.",
        "Output: Noen liker det hardt, andre vil ha det mykt, og dere klarer ikke bestemme dere. Typisk gruppesex-problem.",
        "",
        "Input: ROAST_MÅL: TOPPRATER (ga høy score).",
        "Output: Du er tydeligvis lett å tilfredsstille og svelger hva som helst. Ring meg senere.",
    ].join("\n");

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-audio-preview",
                modalities: ["text", "audio"],
                audio: { voice: "onyx", format: "mp3" },
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: contextDescription },
                ],
                // Keep high to avoid audio truncation; shortness is enforced by the contract above.
                max_tokens: 900,
                temperature: 1.0,
                presence_penalty: 0.6,
                frequency_penalty: 0.3,
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.error?.message ?? "Failed to generate commentary audio");
        }

        const json = await response.json();
        const audioData = json.choices[0]?.message?.audio?.data;

        if (!audioData) {
            throw new Error("No audio data received from OpenAI");
        }

        // Convert Base64 to ArrayBuffer
        const binaryString = atob(audioData as string);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (e) {
        console.error("Audio generation failed", e);
        throw e;
    }
};

/**
 * Generates audio explanation for a specific Fun Fact title.
 */
export const generateFunFactCommentaryAudio = async (
    apiKey: string,
    title: string,
    winnerName: string,
    statValue: string
): Promise<ArrayBuffer> => {
    const contextDescription = [
        `SCENE: Juleølsmaking. Du er en skitten og frekk kommentator.`,
        `TITTEL: "${title}".`,
        `VINNER: ${winnerName}.`,
        `BEGRUNNELSE: ${statValue}.`,
        "OPPGAVE: Forklar hvorfor denne personen fikk denne tittelen med en grisete vri."
    ].join("\n");

    const systemPrompt = [
        "Du snakker tydelig norsk bokmål. Unngå engelske ord.",
        "Du er en skitten, frekk og kåt julebords-kommentator.",
        "Bruk seksuelle antydninger og metaforer.",
        "",
        "KONTRAKT:",
        "- Svar med NØYAKTIG 2 setninger.",
        "- Maks 25 ord.",
        "- Vær direkte knyttet til tittelen (Mest Bøg, Munnfølelse, etc).",
        "- Gjør det personlig og flørtende/frekt mot vinneren.",
        "",
        "Eksempler:",
        "Input: TITTEL: Munnfølelse-entusiast. VINNER: Lars.",
        "Output: Lars vet nøyaktig hvordan han vil ha det i munnen. Han svelger ikke før konsistensen er helt perfekt.",
        "",
        "Input: TITTEL: Mest Bøg. VINNER: Per.",
        "Output: Per liker å spille det trygt og kjedelig. Ingen overraskelser i senga med den karen, for å si det sånn.",
    ].join("\n");

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-audio-preview",
                modalities: ["text", "audio"],
                audio: { voice: "onyx", format: "mp3" },
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: contextDescription },
                ],
                max_tokens: 500, // Short output enforced by prompt
                temperature: 1.0,
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.error?.message ?? "Failed to generate fun fact audio");
        }

        const json = await response.json();
        const audioData = json.choices[0]?.message?.audio?.data;

        if (!audioData) throw new Error("No audio data received");

        const binaryString = atob(audioData as string);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (e) {
        console.error("Fun fact audio failed", e);
        throw e;
    }
};
