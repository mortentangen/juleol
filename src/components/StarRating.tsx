import { Star } from 'lucide-react';

interface StarRatingProps {
    value: number;
    onChange: (value: number) => void;
    label?: string;
    readOnly?: boolean;
}

export default function StarRating({ value, onChange, label, readOnly = false }: StarRatingProps) {
    return (
        <div className="flex flex-col space-y-1">
            {label && <span className="text-sm font-medium text-gray-300">{label}</span>}
            <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
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
