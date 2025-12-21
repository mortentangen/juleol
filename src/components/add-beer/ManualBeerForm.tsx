import type { FormEvent } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import type { BeerFormData } from '../AddBeerModal';

interface ManualBeerFormProps {
    formData: BeerFormData;
    onChange: (data: BeerFormData) => void;
    onSubmit: (e: FormEvent) => Promise<void>;
    loading: boolean;
    onCancel: () => void;
}

export default function ManualBeerForm({ formData, onChange, onSubmit, loading, onCancel }: ManualBeerFormProps) {
    const handleChange = (field: keyof BeerFormData, value: string) => {
        onChange({ ...formData, [field]: value });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Ølnavn</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                        placeholder="f.eks. Tuborg Julebryg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Bryggeri</label>
                    <input
                        type="text"
                        required
                        value={formData.brewery}
                        onChange={(e) => handleChange('brewery', e.target.value)}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                        placeholder="f.eks. Tuborg"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Stil</label>
                    <input
                        type="text"
                        value={formData.style}
                        onChange={(e) => handleChange('style', e.target.value)}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                        placeholder="f.eks. Pilsner"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">ABV (%)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={formData.abv}
                        onChange={(e) => handleChange('abv', e.target.value)}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                        placeholder="f.eks. 5.6"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Beskrivelse</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500 h-24"
                    placeholder="Smaksnotater..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Bilde URL (Valgfritt)</label>
                <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => handleChange('imageUrl', e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                    placeholder="https://..."
                />
            </div>

            <div className="pt-4 flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors font-medium"
                >
                    Avbryt
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg font-medium shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Legger til...
                        </>
                    ) : (
                        <>
                            <Plus className="w-5 h-5 mr-2" />
                            Legg til øl
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
