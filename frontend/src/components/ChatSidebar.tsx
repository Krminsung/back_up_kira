import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';

interface Conversation {
    id: string;
    title: string;
    character: {
        id: string;
        name: string;
        profileImage: string | null;
    };
    messageCount: number;
    createdAt: string;
    updatedAt: string;
    remainingTime: {
        hours: number;
        minutes: number;
        expired: boolean;
    };
}

interface ChatSidebarProps {
    conversations: Conversation[];
    activeConversationId?: string;
    onConversationSelect: (id: string) => void;
    onConversationDelete: (id: string) => void;
    onRefresh: () => void;
}

export default function ChatSidebar({
    conversations,
    activeConversationId,
    onConversationSelect,
    onConversationDelete,
    onRefresh,
}: ChatSidebarProps) {
    const navigate = useNavigate();
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; conversationId?: string }>({ open: false });
    const [alertModal, setAlertModal] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({
        open: false,
        type: 'success',
        message: '',
    });

    const handleDelete = async () => {
        if (!deleteModal.conversationId) return;

        try {
            const res = await fetch(`/api/conversations/${deleteModal.conversationId}`, {
                method: 'DELETE',
            });

            const data = await res.json();

            if (res.ok) {
                setAlertModal({
                    open: true,
                    type: 'success',
                    message: '대화가 삭제되었습니다.',
                });
                onConversationDelete(deleteModal.conversationId);
                onRefresh();
            } else {
                setAlertModal({
                    open: true,
                    type: 'error',
                    message: data.error || '대화 삭제에 실패했습니다.',
                });
            }
        } catch (error) {
            setAlertModal({
                open: true,
                type: 'error',
                message: '대화 삭제 중 오류가 발생했습니다.',
            });
        }

        setDeleteModal({ open: false });
    };

    return (
        <div className="w-64 bg-gray-900/50 border-r border-gray-700/50 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white mb-2">대화 목록</h2>
                <button
                    onClick={() => navigate('/')}
                    className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm font-medium text-white flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    새 대화
                </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        <p>대화가 없습니다</p>
                        <p className="text-xs mt-1">캐릭터를 선택하여 대화를 시작하세요</p>
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <div
                            key={conv.id}
                            className={`p-3 border-b border-gray-700/30 cursor-pointer transition-colors hover:bg-gray-800/50 relative group ${activeConversationId === conv.id ? 'bg-gray-800/70' : ''
                                }`}
                            onClick={() => onConversationSelect(conv.id)}
                        >
                            {/* Delete Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteModal({ open: true, conversationId: conv.id });
                                }}
                                className="absolute top-3 right-3 p-1 bg-red-600/80 hover:bg-red-700 rounded-md transition-all opacity-0 group-hover:opacity-100 z-10"
                                title="대화 삭제"
                            >
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            </button>

                            {/* Character Info */}
                            <div className="flex items-center gap-2 mb-2 pr-8">
                                {conv.character.profileImage ? (
                                    <img
                                        src={conv.character.profileImage}
                                        alt={conv.character.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                                        {conv.character.name[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-white truncate">{conv.title}</h3>
                                    <p className="text-xs text-gray-400 truncate">{conv.character.name}</p>
                                </div>
                            </div>

                            {/* Remaining Time */}
                            <div className="text-xs">
                                {conv.remainingTime.expired ? (
                                    <span className="text-red-400">곧 삭제됩니다</span>
                                ) : (
                                    <span className="text-gray-500">
                                        {conv.remainingTime.hours}시간 {conv.remainingTime.minutes}분 후 삭제
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-700/50 text-xs text-gray-500 text-center">
                {conversations.length} / 10 대화
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false })}
                onConfirm={handleDelete}
                title="대화 삭제"
                message="이 대화를 삭제하시겠습니까? 삭제된 대화는 복구할 수 없습니다."
                confirmText="삭제"
                cancelText="취소"
            />

            {/* Alert Modal */}
            <AlertModal
                isOpen={alertModal.open}
                onClose={() => setAlertModal({ ...alertModal, open: false })}
                type={alertModal.type}
                message={alertModal.message}
            />
        </div>
    );
}
