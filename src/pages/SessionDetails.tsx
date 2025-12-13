import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, Plus, Trophy, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Session, Beer } from '../types';
import BeerCard from '../components/BeerCard';
import AddBeerModal from '../components/AddBeerModal';
import RateBeerModal from '../components/RateBeerModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { motion } from 'framer-motion';

export default function SessionDetails() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [session, setSession] = useState<Session | null>(null);
    const [beers, setBeers] = useState<Beer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddBeerModalOpen, setIsAddBeerModalOpen] = useState(false);
    const [isHost, setIsHost] = useState(false);

    // Rating Modal State
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [selectedBeer, setSelectedBeer] = useState<Beer | null>(null);
    const [ratingUpdateTrigger, setRatingUpdateTrigger] = useState(0);

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [beerToDelete, setBeerToDelete] = useState<string | null>(null);

    const fetchSessionData = async () => {
        if (!id) return;
        try {
            // Fetch session details
            const { data: sessionData, error: sessionError } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (sessionError) throw sessionError;
            setSession(sessionData);
            setIsHost(sessionData.host_id === user?.id);

            // Fetch beers in this session
            const { data: beersData, error: beersError } = await supabase
                .from('session_beers')
                .select(`
          beer_id,
          added_by,
          beers (*),
          profiles:added_by (
            full_name,
            avatar_url
          )
        `)
                .eq('session_id', id)
                .order('sorting_order', { ascending: true });

            if (beersError) throw beersError;

            // Transform data to match Beer interface
            // @ts-expect-error - Supabase types are a bit tricky with joins
            const formattedBeers = beersData.map((item) => ({
                ...item.beers,
                addedBy: item.profiles
            })) as Beer[];
            setBeers(formattedBeers);

        } catch (error) {
            console.error('Error fetching session data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessionData();
    }, [id]);

    const handleRateClick = (beer: Beer) => {
        setSelectedBeer(beer);
        setIsRateModalOpen(true);
    };

    const handleDeleteBeer = (beerId: string) => {
        setBeerToDelete(beerId);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteBeer = async () => {
        if (!beerToDelete) return;

        try {
            // Delete from session_beers
            const { error } = await supabase
                .from('session_beers')
                .delete()
                .eq('session_id', id)
                .eq('beer_id', beerToDelete);

            if (error) throw error;

            // Refresh the beer list
            fetchSessionData();
        } catch (error) {
            console.error('Error deleting beer:', error);
            alert('Kunne ikke slette øl. Vennligst prøv igjen.');
        } finally {
            setBeerToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white">
                <h2 className="text-2xl font-bold mb-4">Ølsmaking ikke funnet</h2>
                <Link to="/" className="text-amber-500 hover:text-amber-400 flex items-center">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Tilbake til oversikten
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <header className="glass sticky top-0 z-40 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Link to="/" className="text-slate-300 hover:text-white flex items-center mb-4 transition-colors w-fit">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Tilbake til oversikten
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{session.name}</h1>
                            <div className="flex items-center space-x-6 text-slate-300">
                                <div className="flex items-center">
                                    <Calendar className="w-5 h-5 mr-2 text-amber-500/70" />
                                    {new Date(session.date).toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                    <Users className="w-5 h-5 mr-2 text-amber-500/70" />
                                    Kode: <span className="font-mono ml-2 text-amber-500 bg-amber-500/10 px-2 py-1 rounded">{session.join_code}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(`/session/${id}/leaderboard`)}
                                className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-white/10 shadow-lg"
                            >
                                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                                Resultatliste
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(`/session/${id}/comments`)}
                                className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-white/10 shadow-lg"
                            >
                                <MessageSquare className="w-5 h-5 mr-2 text-blue-400" />
                                Kommentarer
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsAddBeerModalOpen(true)}
                                className="flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg font-medium shadow-lg shadow-amber-500/20 transition-all"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Legg til øl
                            </motion.button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {beers.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 glass rounded-2xl border-dashed border-2 border-slate-700"
                    >
                        <div className="bg-slate-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Plus className="w-10 h-10 text-slate-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Ingen øl lagt til ennå</h3>
                        <p className="text-slate-300 mb-8">Legg til noen øl for å starte smakingen!</p>
                        <button
                            onClick={() => setIsAddBeerModalOpen(true)}
                            className="inline-flex items-center px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-medium border border-white/10"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Legg til øl
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {beers.map((beer, index) => (
                            <BeerCard
                                key={beer.id}
                                beer={beer}
                                index={index}
                                refreshTrigger={ratingUpdateTrigger}
                                onRate={() => handleRateClick(beer)}
                                onDelete={isHost ? () => handleDeleteBeer(beer.id) : undefined}
                            />
                        ))}
                    </div>
                )}
            </main>

            <AddBeerModal
                isOpen={isAddBeerModalOpen}
                onClose={() => setIsAddBeerModalOpen(false)}
                sessionId={session.id}
                onBeerAdded={fetchSessionData}
            />

            {selectedBeer && (
                <RateBeerModal
                    isOpen={isRateModalOpen}
                    onClose={() => setIsRateModalOpen(false)}
                    beer={selectedBeer}
                    sessionId={session.id}
                    onRatingSubmitted={() => {
                        setRatingUpdateTrigger(prev => prev + 1);
                    }}
                />
            )}

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDeleteBeer}
                title="Slett øl"
                message="Er du sikker på at du vil fjerne denne fra ølsmakingen? Denne handlingen kan ikke angres."
                confirmText="Slett"
                cancelText="Avbryt"
                variant="danger"
            />
        </div>
    );
}
