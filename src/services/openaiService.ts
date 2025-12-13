/**
 * Generates beer commentary audio directly (text + audio in one call).
 * Focus: clear Norwegian + short, funny roasting that participants can handle.
 */
export const generateBeerCommentaryAudio = async (
    apiKey: string,
    beerScore: any,
    allBeerScores: any[] = []
): Promise<ArrayBuffer> => {
    const getName = (profile: any): string => {
        if (profile?.full_name && profile.full_name.trim().length > 0) {
            return profile.full_name.trim().split(" ")[0]!;
        }
        if (profile?.email && profile.email.includes("@")) {
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
    const totalScores: Array<{ name: string; total: number; comment: string }> = ratings.map((r: any) => {
        const taste = Number(r?.taste ?? 0);
        const mouthfeel = Number(r?.mouthfeel ?? 0);
        const overall = Number(r?.overall ?? 0);
        const total = clamp(taste + mouthfeel + overall, 0, 15);
        const name = getName(r?.profiles);
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
        avgScore >= 12 ? "svært godt" : avgScore <= 6 ? "svært dårlig" : avgScore >= 9 ? "helt greit" : "midt på treet";

    // --- History (keep short; it’s just fuel for jokes) ---
    const previousBeers = allBeerScores
        .filter(b => b?.beer?.id !== beerScore?.beer?.id && Number(b?.ratingCount ?? 0) > 0)
        .slice(-5)
        .map(b => {
            const name = sanitizeShort(String(b?.beer?.name ?? "Ukjent"), 40);
            const score = Number(b?.avgScore ?? 0);
            // Avoid too many decimals; decimals can sound weird in TTS.
            const rounded = Math.round(score * 10) / 10;
            return `${name} (${rounded} av 15)`;
        })
        .join(", ");

    // --- Choose roast target (critical for consistency) ---
    // Rule of thumb:
    // - Very low avg -> roast the beer.
    // - Very high avg -> roast the top rater (they’re hyping).
    // - High spread -> roast the group / disagreement.
    // - Otherwise roast the beer unless there is a clear “character” comment.
    let roastTarget: "beer" | "topRater" | "bottomRater" | "group" = "beer";
    if (spread >= 6 && ratingCount >= 3) {
        roastTarget = "group";
    } else if (avgScore >= 12 && topRater) {
        roastTarget = "topRater";
    } else if (avgScore <= 6) {
        roastTarget = "beer";
    } else if (bottomRater && avgScore >= 9) {
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
        "Du er en spydig, kjølig og overlegen juleølsmakings-kommentator (tørr, bitende humor).",
        "subtil, men merkbar roast; ikke hyggelig",
        "",
        "KONTRAKT (må følges):",
        "- Svar med NØYAKTIG 2 setninger.",
        "- Maks 22 ord totalt.",
        "- Roastekun: følg ROAST_MÅL. Ikke roaste noe annet.",
        "- Ikke forklar, ikke oppsummer, ikke ramse opp tall. Ett stikk, ferdig.",
        "",
        "Eksempler (tone og lengde):",
        "Input: ROAST_MÅL: ØLET. Lukt: våt papp.",
        "Output: Dette lukter som et vått pappkrus med ambisjoner. Smaken gjør ikke jobben lettere.",
        "",
        "Input: ROAST_MÅL: GRUPPA. Spredning høy.",
        "Output: Dere er enige om én ting: å være uenige. Det er nesten imponerende, om det ikke var så forutsigbart.",
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
