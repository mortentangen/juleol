import { useEffect, useRef } from 'react';

interface Snowflake {
    x: number;
    y: number;
    radius: number;
    speed: number;
    drift: number;
    phase: number;
}

export default function Snowfall() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const columnWidth = 4;
        let width = 0;
        let height = 0;
        let snow: number[] = [];
        let flakes: Snowflake[] = [];
        let frame = 0;
        let previousTime = 0;
        let animationFrameId = 0;

        const makeFlake = (initial = false): Snowflake => ({
            x: Math.random() * width,
            y: initial ? Math.random() * height : -5,
            radius: 0.7 + Math.random() * 2.2,
            speed: 22 + Math.random() * 32,
            drift: 5 + Math.random() * 12,
            phase: Math.random() * Math.PI * 2,
        });

        const resize = () => {
            const oldSnow = snow;
            width = window.innerWidth;
            height = window.innerHeight;
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * pixelRatio;
            canvas.height = height * pixelRatio;
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            const columns = Math.ceil(width / columnWidth) + 1;
            snow = Array.from({ length: columns }, (_, i) => oldSnow.length
                ? Math.min(oldSnow[Math.min(oldSnow.length - 1, Math.floor(i * oldSnow.length / columns))], height * 0.08)
                : 0);
            flakes = Array.from({ length: Math.min(180, Math.max(25, Math.floor(width * height / 11000))) }, () => makeFlake(true));
        };

        const draw = (time: number) => {
            const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
            previousTime = time;
            frame += elapsed;
            ctx.clearRect(0, 0, width, height);

            for (const flake of flakes) {
                flake.y += flake.speed * elapsed;
                flake.x += Math.sin(frame * 0.8 + flake.phase) * flake.drift * elapsed;
                if (flake.x < 0) flake.x += width;
                if (flake.x >= width) flake.x -= width;
                const column = Math.min(snow.length - 1, Math.floor(flake.x / columnWidth));
                if (flake.y + flake.radius >= height - snow[column]) {
                    // Spread each landing over neighboring columns so the bank remains soft.
                    const maxDepth = Math.min(38, height * 0.08);
                    for (let offset = -3; offset <= 3; offset++) {
                        const index = column + offset;
                        if (index >= 0 && index < snow.length) {
                            snow[index] = Math.min(maxDepth, snow[index] + (1 - Math.abs(offset) / 4) * flake.radius * 0.13);
                        }
                    }
                    Object.assign(flake, makeFlake());
                }
                ctx.beginPath();
                ctx.fillStyle = `rgba(255, 255, 255, ${0.45 + flake.radius * 0.14})`;
                ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.beginPath();
            ctx.moveTo(0, height);
            ctx.lineTo(0, height - snow[0]);
            for (let i = 1; i < snow.length; i++) {
                ctx.lineTo(Math.min(i * columnWidth, width), height - snow[i]);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            const gradient = ctx.createLinearGradient(0, height - 38, 0, height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            gradient.addColorStop(1, 'rgba(199, 219, 232, 0.85)');
            ctx.fillStyle = gradient;
            ctx.fill();

            if (!reducedMotion.matches) animationFrameId = requestAnimationFrame(draw);
        };

        const start = () => {
            cancelAnimationFrame(animationFrameId);
            previousTime = 0;
            draw(0);
        };
        const handleResize = () => { resize(); start(); };
        window.addEventListener('resize', handleResize);
        reducedMotion.addEventListener('change', start);
        resize();
        start();
        return () => {
            window.removeEventListener('resize', handleResize);
            reducedMotion.removeEventListener('change', start);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 pointer-events-none z-0" style={{ width: '100%', height: '100%' }} />;
}
