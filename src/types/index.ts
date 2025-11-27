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
    image_url?: string;
    addedBy?: {
        full_name: string | null;
        avatar_url?: string | null;
    };
}

export interface Rating {
    id: string;
    created_at: string;
    user_id: string;
    beer_id: string;
    session_id: string;
    taste: number;
    mouthfeel: number;
    overall: number;
    comment?: string;
}
