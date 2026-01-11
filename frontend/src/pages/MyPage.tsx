import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';

interface UsageData {
    used: number;
    limit: number;
    remaining: number;
}

interface UserInfo {
    userId: string;
    email: string;
    name?: string;
    avatar?: string;
    nameChanged?: boolean;
}

interface Character {
    id: string;
    name: string;
    description: string;
    profileImage?: string;
    visibility: string;
    chatCount: number;
    likeCount: number;
    createdAt: string;
}

export default function MyPage() {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [usage, setUsage] = useState<Record<string, UsageData> | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [usageLoading, setUsageLoading] = useState(true);
    const [charactersLoading, setCharactersLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; type: 'success' | 'error' | 'warning'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: '',
    });
    const [showNameChangeWarning, setShowNameChangeWarning] = useState(false);
    const [showNameInput, setShowNameInput] = useState(false);
    const [newName, setNewName] = useState("");
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUserInfo();
        fetchUsage();
        fetchMyCharacters();
    }, []);

    const fetchUserInfo = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (!res.ok) {
                navigate('/login');
                return;
            }
            const data = await res.json();
            setUser(data.user);
        } catch (error) {
            console.error('Failed to fetch user info:', error);
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsage = async () => {
        try {
            const res = await fetch('/api/usage');
            if (res.ok) {
                const data = await res.json();
                setUsage(data.usage);
            }
        } catch (error) {
            console.error('Failed to fetch usage:', error);
        } finally {
            setUsageLoading(false);
        }
    };

    const fetchMyCharacters = async () => {
        try {
            const res = await fetch('/api/characters/my');
            if (res.ok) {
                const data = await res.json();
                setCharacters(data.characters || []);
            }
        } catch (error) {
            console.error('Failed to fetch my characters:', error);
        } finally {
            setCharactersLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const res = await fetch('/api/auth/account', { method: 'DELETE' });
            if (res.ok) {
                setAlertModal({
                    isOpen: true,
                    type: 'success',
                    title: '회원탈퇴 완료',
                    message: '회원탈퇴가 완료되었습니다.\n그동안 이용해 주셔서 감사합니다.',
                });
                // 모달 닫힌 후 홈으로 이동
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            } else {
                const data = await res.json();
                setAlertModal({
                    isOpen: true,
                    type: 'error',
                    title: '회원탈퇴 실패',
                    message: data.error || '회원탈퇴 중 오류가 발생했습니다.',
                });
            }
        } catch (error) {
            console.error('Account deletion failed:', error);
            setAlertModal({
                isOpen: true,
                type: 'error',
                title: '회원탈퇴 실패',
                message: '회원탈퇴 중 오류가 발생했습니다.',
            });
        }
    };

    const handleNameChangeClick = () => {
        setShowNameChangeWarning(true);
    };

    const handleNameChangeConfirm = () => {
        setShowNameChangeWarning(false);
        setShowNameInput(true);
    };

    const handleNameSubmit = async () => {
        if (!newName.trim()) {
            setAlertModal({
                isOpen: true,
                type: 'error',
                title: '입력 오류',
                message: '이름을 입력해주세요.',
            });
            return;
        }

        try {
            const res = await fetch('/api/auth/name', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() }),
            });

            const data = await res.json();

            if (res.ok) {
                // 사용자 정보 업데이트
                setUser(prev => prev ? { ...prev, name: data.user.name, nameChanged: true } : null);
                setShowNameInput(false);
                setNewName('');
                setAlertModal({
                    isOpen: true,
                    type: 'success',
                    title: '이름 변경 완료',
                    message: `이름이 "${data.user.name}"(으)로 변경되었습니다.`,
                });
            } else {
                setAlertModal({
                    isOpen: true,
                    type: 'error',
                    title: '이름 변경 실패',
                    message: data.error || '이름 변경 중 오류가 발생했습니다.',
                });
            }
        } catch (error) {
            console.error('Name change failed:', error);
            setAlertModal({
                isOpen: true,
                type: 'error',
                title: '이름 변경 실패',
                message: '이름 변경 중 오류가 발생했습니다.',
            });
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setAlertModal({
                isOpen: true,
                type: 'error',
                title: '파일 크기 초과',
                message: '파일 크기는 5MB 이하여야 합니다.',
            });
            return;
        }

        setUploadingAvatar(true);

        // Base64로 변환
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const res = await fetch('/api/auth/avatar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageData: reader.result }),
                });

                const data = await res.json();

                if (res.ok) {
                    setUser((prev: UserInfo | null) => prev ? { ...prev, avatar: data.avatar } : null);
                    setAlertModal({
                        isOpen: true,
                        type: 'success',
                        title: '프로필 사진 변경 완료',
                        message: '프로필 사진이 성공적으로 변경되었습니다.',
                    });
                } else {
                    setAlertModal({
                        isOpen: true,
                        type: 'error',
                        title: '업로드 실패',
                        message: data.error || '업로드 중 오류가 발생했습니다.',
                    });
                }
            } catch (error) {
                setAlertModal({
                    isOpen: true,
                    type: 'error',
                    title: '업로드 실패',
                    message: '업로드 중 오류가 발생했습니다.',
                });
            } finally {
                setUploadingAvatar(false);
                // input 초기화
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };

        reader.readAsDataURL(file);
    };

    const getUsagePercentage = (data: UsageData) => {
        return (data.used / data.limit) * 100;
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 90) return 'from-red-500 to-pink-500';
        if (percentage >= 70) return 'from-yellow-500 to-orange-500';
        return 'from-indigo-500 to-purple-500';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="py-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent mb-2">
                    마이페이지
                </h1>
                <p className="text-gray-400">계정 정보 및 API 사용량을 확인하세요</p>
            </div>

            {/* User Profile Card */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-xl border border-gray-700/50 mb-4 shadow-xl">
                <div className="flex items-center gap-4">
                    {/* 프로필 사진 */}
                    <div className="relative group">
                        {user?.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.name || user.email}
                                className="w-16 h-16 rounded-full border-2 border-indigo-500/30 object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-xl font-bold">
                                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                            </div>
                        )}

                        {/* 연필 아이콘 버튼 */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="absolute bottom-0 right-0 w-6 h-6 bg-gray-700/90 hover:bg-gray-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 border border-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="프로필 사진 변경"
                        >
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold text-white">
                                {user?.name || '사용자'}
                            </h2>
                            {user && !user.nameChanged && (
                                <button
                                    onClick={handleNameChangeClick}
                                    className="px-3 py-1 text-sm bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 rounded-md transition-all border border-indigo-500/30 hover:border-indigo-500/50"
                                >
                                    변경
                                </button>
                            )}
                        </div>
                        <p className="text-gray-400 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {user?.email}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-all font-medium border border-gray-600/30 hover:border-gray-600"
                        >
                            회원탈퇴
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-6 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-lg transition-all font-medium border border-red-500/30 hover:border-red-500/50"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </div>

            {/* API Usage Stats */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-xl border border-gray-700/50 mb-4 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    오늘의 API 사용량
                    <span className="text-xs font-normal text-gray-400 ml-auto">매일 자정(KST) 초기화</span>
                </h3>

                {usageLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-2 text-sm text-gray-400">로딩 중...</span>
                    </div>
                ) : usage ? (
                    <div className="space-y-3">
                        {Object.entries(usage).map(([model, data]) => {
                            const percentage = getUsagePercentage(data);
                            const progressColor = getProgressColor(percentage);

                            return (
                                <div key={model} className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h4 className="text-sm font-semibold text-white">{model}</h4>
                                            <p className="text-xs text-gray-400">
                                                {data.used.toLocaleString()} / {data.limit.toLocaleString()} 요청
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-lg font-bold bg-gradient-to-r ${progressColor} bg-clip-text text-transparent`}>
                                                {percentage.toFixed(0)}%
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                남은: {data.remaining.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative h-1.5 bg-gray-700/50 rounded-full overflow-hidden mb-2">
                                        <div
                                            className={`h-1.5 bg-gradient-to-r ${progressColor} transition-all duration-500 rounded-full`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        />
                                    </div>

                                    {percentage >= 90 && (
                                        <div className="flex items-center gap-1.5 text-red-400 text-xs">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            <span>한도의 90% 이상 사용</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-gray-500 mb-2">
                            <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-sm text-gray-400">사용량 정보를 불러올 수 없습니다</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 내 캐릭터 목록 */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-xl border border-gray-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        내가 만든 캐릭터
                        <span className="text-sm font-normal text-gray-400">({characters.length})</span>
                    </h3>
                    <button
                        onClick={() => navigate('/create')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        새 캐릭터 만들기
                    </button>
                </div>

                {charactersLoading ? (
                    <div className="text-center py-12">
                        <div className="text-gray-400">로딩 중...</div>
                    </div>
                ) : characters.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {characters.map((char) => (
                            <div
                                key={char.id}
                                className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:border-indigo-500/50 transition-all cursor-pointer group relative"
                                onClick={() => navigate(`/characters/${char.id}`)}
                            >
                                {/* Edit Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/create?id=${char.id}`);
                                    }}
                                    className="absolute top-2 right-10 p-1.5 bg-gray-700/80 hover:bg-indigo-600 rounded-md transition-all opacity-0 group-hover:opacity-100 z-10"
                                    title="캐릭터 수정"
                                >
                                    <svg className="w-3.5 h-3.5 text-gray-300 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>

                                {/* Delete Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmModal({
                                            isOpen: true,
                                            onConfirm: async () => {
                                                try {
                                                    const res = await fetch(`/api/characters/${char.id}`, {
                                                        method: 'DELETE',
                                                    });
                                                    const data = await res.json();

                                                    if (res.ok) {
                                                        setAlertModal({
                                                            isOpen: true,
                                                            type: 'success',
                                                            message: '캐릭터가 삭제되었습니다.',
                                                        });
                                                        fetchMyCharacters(); // Refresh list
                                                    } else {
                                                        setAlertModal({
                                                            isOpen: true,
                                                            type: 'error',
                                                            message: data.error || '캐릭터 삭제에 실패했습니다.',
                                                        });
                                                    }
                                                } catch (error) {
                                                    setAlertModal({
                                                        isOpen: true,
                                                        type: 'error',
                                                        message: '캐릭터 삭제 중 오류가 발생했습니다.',
                                                    });
                                                }
                                                setConfirmModal({ isOpen: false, onConfirm: () => { } });
                                            },
                                            title: '캐릭터 삭제',
                                            message: `"${char.name}" 캐릭터를 삭제하시겠습니까? 삭제된 캐릭터는 복구할 수 없습니다.`,
                                            confirmText: '삭제',
                                            cancelText: '취소',
                                        });
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-700 rounded-md transition-all opacity-0 group-hover:opacity-100 z-10"
                                    title="캐릭터 삭제"
                                >
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                                <div className="flex gap-2">
                                    {char.profileImage ? (
                                        <img
                                            src={char.profileImage}
                                            alt={char.name}
                                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-lg font-bold flex-shrink-0">
                                            {char.name[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                                            {char.name}
                                        </h4>
                                        <p className="text-xs text-gray-400 line-clamp-2 mb-1">
                                            {char.description}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-0.5">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                                {char.chatCount || 0}
                                            </span>
                                            <span className="flex items-center gap-0.5">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                                {char.likeCount || 0}
                                            </span>
                                            <span className={`ml-auto px-1.5 py-0.5 rounded text-xs ${char.visibility === 'PUBLIC'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-gray-600/20 text-gray-400'
                                                }`}>
                                                {char.visibility === 'PUBLIC' ? '공개' : '비공개'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-gray-500 mb-3">
                            <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="text-lg mb-2">아직 만든 캐릭터가 없습니다</p>
                            <p className="text-sm text-gray-600">첫 캐릭터를 만들어보세요!</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 회원탈퇴 확인 모달 */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteAccount}
                title="회원탈퇴"
                message="정말로 회원탈퇴를 하시겠습니까?
모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다."
                confirmText="탈퇴하기"
                cancelText="취소"
            />

            {/* 알림 모달 */}
            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
            />

            {/* 이름 변경 경고 모달 */}
            <ConfirmModal
                isOpen={showNameChangeWarning}
                onClose={() => setShowNameChangeWarning(false)}
                onConfirm={handleNameChangeConfirm}
                type="warning"
                title="이름 변경"
                message="이름 변경은 1회만 가능합니다.\n변경 후에는 다시 바꿀 수 없습니다.\n\n정말로 이름을 변경하시겠습니까?"
                confirmText="변경하기"
                cancelText="취소"
            />

            {/* 이름 입력 모달 */}
            <ConfirmModal
                isOpen={showNameInput}
                onClose={() => { setShowNameInput(false); setNewName(''); }}
                onConfirm={handleNameSubmit}
                title="이름 변경"
                message={
                    <div>
                        <p className="mb-4">새로운 이름을 입력하세요:</p>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                            placeholder="이름 입력"
                            maxLength={20}
                        />
                    </div>
                }
                confirmText="변경"
                cancelText="취소"
            />
        </div>
    );
}
