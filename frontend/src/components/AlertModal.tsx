import { useEffect } from 'react';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    confirmText?: string;
}

export default function AlertModal({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    confirmText = '확인',
}: AlertModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // 타입별 아이콘과 색상
    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return {
                    iconBg: 'from-green-500 to-emerald-500',
                    buttonBg: 'from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500',
                    icon: (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ),
                };
            case 'error':
                return {
                    iconBg: 'from-red-500 to-pink-500',
                    buttonBg: 'from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500',
                    icon: (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ),
                };
            case 'warning':
                return {
                    iconBg: 'from-yellow-500 to-orange-500',
                    buttonBg: 'from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500',
                    icon: (
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    ),
                };
            default: // info
                return {
                    iconBg: 'from-indigo-500 to-purple-500',
                    buttonBg: 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500',
                    icon: (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700/50 max-w-md w-full p-6 animate-scaleIn">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${styles.iconBg} flex items-center justify-center`}>
                        {styles.icon}
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent">
                    {title}
                </h2>

                {/* Message */}
                <p className="text-gray-300 text-center mb-6 leading-relaxed whitespace-pre-line">
                    {message}
                </p>

                {/* Button */}
                <button
                    onClick={onClose}
                    className={`w-full px-4 py-3 bg-gradient-to-r ${styles.buttonBg} text-white rounded-lg transition-all transform hover:scale-105 active:scale-95 font-medium shadow-lg`}
                >
                    {confirmText}
                </button>
            </div>
        </div>
    );
}
