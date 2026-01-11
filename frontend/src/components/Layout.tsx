import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // 간단한 쿠키 체크 또는 API 호출로 로그인 상태 확인
        // 여기서는 실제 API를 호출하여 세션 유효성을 검증하는 것이 좋습니다.
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    setIsLoggedIn(true);
                } else {
                    setIsLoggedIn(false);
                }
            } catch (error) {
                setIsLoggedIn(false);
            }
        };
        checkAuth();
    }, [location.pathname]); // 경로 변경 시마다 체크 (로그인/로그아웃 직후 반영 위해)

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <header className="border-b border-gray-800 p-4 sticky top-0 bg-background/80 backdrop-blur-md z-50">
                <div className="container mx-auto flex justify-between items-center">
                    <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent">
                        키라키라
                    </Link>
                    <nav className="flex gap-4">
                        {isLoggedIn ? (
                            <>
                                <Link to="/create" className="hover:text-primary transition-colors">캐릭터 생성</Link>
                                <Link to="/my" className="hover:text-primary transition-colors">마이페이지</Link>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="hover:text-primary transition-colors">로그인</Link>
                                <Link to="/register" className="hover:text-primary transition-colors">회원가입</Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>
            <main className="flex-1 container mx-auto p-4">
                {children}
            </main>
        </div>
    );
};

export default Layout;
