import { useLocation } from 'react-router-dom';

const lights = [4, 9, 15, 20, 80, 85, 91, 96];

export default function ChristmasDecorations() {
    const location = useLocation();

    if (!location.pathname.includes('leaderboard')) return null;

    return (
        <div className="scoreboard-garland" aria-hidden="true">
            <img src="/scoreboard-garland-v2.png" alt="" />
            {lights.map((position, index) => (
                <span
                    key={position}
                    className="scoreboard-garland-light"
                    style={{ left: `${position}%`, top: `${index % 2 ? 31 : 17}%`, animationDelay: `${index * -0.6}s` }}
                />
            ))}
        </div>
    );
}
