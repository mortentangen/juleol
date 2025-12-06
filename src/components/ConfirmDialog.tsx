import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Bekreft',
    cancelText = 'Avbryt',
    variant = 'warning'
}: ConfirmDialogProps) {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const variantStyles = {
        danger: 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500',
        warning: 'from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500',
        info: 'from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl max-w-md w-full overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/20 rounded-lg">
                                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">{title}</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-slate-200 mb-6 leading-relaxed">{message}</p>

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`flex-1 px-4 py-2 bg-gradient-to-r ${variantStyles[variant]} text-white rounded-lg font-medium shadow-lg transition-all`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
