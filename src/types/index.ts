export interface Session {
    id: string;
    created_at: string;
    name: string;
    date: string;
    host_id: string;
    is_active: boolean;
    join_code: string;
}

export interface Beer {
    id: string;
    name: string;
    brewery: string;
    style: string;
    abv: number;
    description: string;
    image_url: string;
}

export interface Rating {
    id: string;
    user_id: string;
    beer_id: string;
    session_id: string;
    appearance: number;
    aroma: number;
    taste: number;
    mouthfeel: number;
    overall: number;
    comment: string;
}
