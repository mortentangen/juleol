import { useEffect, useRef } from 'react';

interface Snowflake {
    x: number;
    y: number;
    radius: number;
    speed: number;
    wind: number;
}

export default function Snowfall() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let snowflakes: Snowflake[] = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Re-initialize snowflakes on resize to ensure density matches screen size
            initSnowflakes();
        };

        const initSnowflakes = () => {
            const count = Math.floor((window.innerWidth * window.innerHeight) / 10000); // Responsive count
            snowflakes = [];
            for (let i = 0; i < count; i++) {
                snowflakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 3 + 1,
                    speed: Math.random() * 1 + 0.5,
                    wind: Math.random() * 2 - 1,
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();

            snowflakes.forEach((flake) => {
                ctx.moveTo(flake.x, flake.y);
                ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
            });

            ctx.fill();
            update();
            animationFrameId = requestAnimationFrame(draw);
        };

        const update = () => {
            snowflakes.forEach((flake) => {
                flake.y += flake.speed;
                flake.x += flake.wind;

                if (flake.y > canvas.height) {
                    flake.y = -flake.radius;
                    flake.x = Math.random() * canvas.width;
                }

                if (flake.x > canvas.width) {
                    flake.x = 0;
                } else if (flake.x < 0) {
                    flake.x = canvas.width;
                }
            });
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}
        />
    );
}
