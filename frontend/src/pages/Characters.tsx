import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

interface Character {
    id: string;
    name: string;
    description: string;
    avatar?: string;
    isPublic: boolean;
    createdAt: string;
    chatCount?: number;
}

export default function Characters() {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPublicCharacters();
    }, []);

    const fetchPublicCharacters = async () => {
        try {
            const res = await fetch('/api/characters/public');
            if (res.ok) {
                const data = await res.json();
                setCharacters(data.characters || []);
            }
        } catch (error) {
            console.error('Failed to fetch characters:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClick = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (!res.ok) {
                setShowCreateModal(true);
                return;
            }
            navigate('/create');
        } catch {
            alert('오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    const handleStartChat = async (characterId: string) => {
        // 로그인 상태 확인
        try {
            const res = await fetch('/api/auth/me');
            if (!res.ok) {
                setShowLoginModal(true);
                return;
            }
            // 로그인 상태면 채팅 페이지로 이동
            navigate(`/characters/${characterId}/chat`);
        } catch (error) {
            alert('오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="py-8">
            <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent mb-2">
                    캐릭터 둘러보기
                </h1>
                <p className="text-gray-400">다양한 AI 캐릭터들과 대화를 나눠보세요</p>
            </div>

            {characters.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">아직 공개된 캐릭터가 없습니다.</p>
                    <button
                        onClick={handleCreateClick}
                        className="mt-4 inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                        첫 캐릭터 만들기
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {characters.map((character) => (
                        <div
                            key={character.id}
                            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-indigo-500/50 transition-all cursor-pointer group"
                        >
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-2xl shrink-0">
                                    {character.avatar ? (
                                        <img src={character.avatar} alt={character.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <span>🤖</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-bold text-white mb-1 truncate">{character.name}</h3>
                                    <p className="text-gray-400 text-sm line-clamp-2 mb-2">{character.description}</p>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-full flex items-center gap-1">
                                            💬 {character.chatCount || 0}회 대화
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleStartChat(character.id)}
                                    className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                                >
                                    대화 시작
                                </button>
                                <Link
                                    to={`/characters/${character.id}`}
                                    className="py-2 px-4 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors text-gray-300 hover:text-white"
                                >
                                    상세보기
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onConfirm={() => navigate('/login')}
                title="로그인 필요"
                message="대화를 시작하려면 로그인이 필요합니다.
로그인 페이지로 이동하시겠습니까?"
                confirmText="로그인하기"
                cancelText="취소"
            />

            <ConfirmModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onConfirm={() => navigate('/login')}
                title="로그인 필요"
                message="캐릭터를 만들려면 로그인이 필요합니다.
로그인 페이지로 이동하시겠습니까?"
                confirmText="로그인하기"
                cancelText="취소"
            />
        </div>
    );
}
