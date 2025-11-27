import { Star } from 'lucide-react';

interface StarRatingProps {
    value: number;
    onChange: (value: number) => void;
    label?: string;
    readOnly?: boolean;
    maxStars?: number;
}

export default function StarRating({ value, onChange, label, readOnly = false, maxStars = 5 }: StarRatingProps) {
    return (
        <div className="flex flex-col space-y-1">
            {label && <span className="text-sm font-medium text-gray-300">{label}</span>}
            <div className="flex space-x-1">
                {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
                    <button
                        key={star}
                        type="button"
                        disabled={readOnly}
                        onClick={() => onChange(star)}
                        className={`p-1 transition-colors ${readOnly ? 'cursor-default' : 'hover:scale-110'
                            }`}
                    >
                        <Star
                            className={`w-6 h-6 ${star <= value
                                ? 'fill-amber-500 text-amber-500'
                                : 'fill-gray-700 text-gray-700'
                                }`}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
