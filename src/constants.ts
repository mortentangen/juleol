export const SCORING = {
    MAX_SCORE: 15,
    MIN_SCORE: 0,
    STARS_PER_CRITERIA: 5,
};

export const AI_SENTIMENT_THRESHOLDS = {
    EXCELLENT: 12, // >= 12
    GOOD: 9,      // >= 9
    POOR: 6,      // <= 6
};

export const ROAST_THRESHOLDS = {
    SPREAD_HIGH: 6,
    MIN_RATING_COUNT_FOR_GROUP_ROAST: 3,
};

export const FUN_FACT_THRESHOLDS = {
    MIN_VOTES_FOR_MAVERICK: 2,
    LOW_SCORE_HATER: 3, // <= 3 total score
    PERFECT_SCORE: 15,
};

// Vinmonopolet API or generic defaults
export const DEFAULTS = {
    BEER_IMAGE_PLACEHOLDER: 'https://bilder.vinmonopolet.no/cache/300x300-0/10539202-1.jpg',
};
