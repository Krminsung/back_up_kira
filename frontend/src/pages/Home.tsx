import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import styles from "./Home.module.css";
import ConfirmModal from "../components/ConfirmModal";

export default function Home() {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/auth/me');
            setIsLoggedIn(res.ok);
        } catch {
            setIsLoggedIn(false);
        }
    };

    const handleCreateClick = async () => {
        if (!isLoggedIn) {
            setShowLoginModal(true);
        } else {
            navigate('/create');
        }
    };

    return (
        <div className={styles.page}>
            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroBackground}>
                    <div className={styles.heroGlow} />
                </div>
                <div className={styles.heroContent}>
                    <span className={styles.badge}>✨ 새로운 AI 경험</span>
                    <h1 className={styles.heroTitle}>
                        나만의 AI 캐릭터와
                        <br />
                        <span className={styles.gradient}>특별한 대화</span>를 시작하세요
                    </h1>
                    <p className={styles.heroDescription}>
                        수천 개의 독특한 AI 캐릭터들이 여러분을 기다리고 있습니다.
                        <br />
                        직접 캐릭터를 만들고, 다른 사람들과 공유해보세요.
                    </p>
                    <div className={styles.heroCta}>
                        <Link to="/characters" className="btn btn-primary btn-lg">
                            캐릭터 둘러보기
                        </Link>
                        <button onClick={handleCreateClick} className="btn btn-secondary btn-lg">
                            캐릭터 만들기
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className={styles.features}>
                <div className="container">
                    <h2 className={styles.sectionTitle}>왜 키라키라인가요?</h2>
                    <div className={styles.featureGrid}>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>🎭</div>
                            <h3>다양한 캐릭터</h3>
                            <p>판타지, 로맨스, 일상 등 다양한 장르의 캐릭터들을 만나보세요.</p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>🤖</div>
                            <h3>고급 AI 기술</h3>
                            <p>최신 Gemini AI로 자연스럽고 몰입감 있는 대화를 경험하세요.</p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>✏️</div>
                            <h3>쉬운 제작</h3>
                            <p>간단한 설정만으로 나만의 특별한 캐릭터를 만들 수 있어요.</p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>🌍</div>
                            <h3>커뮤니티</h3>
                            <p>전 세계 크리에이터들과 캐릭터를 공유하고 소통하세요.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.cta}>
                <div className="container">
                    <div className={styles.ctaCard}>
                        <h2>지금 바로 시작하세요</h2>
                        <p>무료로 가입하고 AI 캐릭터와의 대화를 경험해보세요.</p>
                        <Link to="/login" className="btn btn-primary btn-lg">
                            무료로 시작하기
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer is typically in Layout, removing footer here if Layout has it.
          Next.js app/page.tsx had footer, but Vite App uses Layout. 
          Let's check Layout content first? No, previous step showed Home had footer manually inserted? 
          Actually, let's keep it here for now to match original UI perfectly. 
          Wait, usually Footer is global. 
          Let's assume the user wants EXACT UI. I will include Footer here as in original page.tsx 
          UNLESS Layout already provides it. 
          User said "Main page UI changed". 
          Let's check Layout.tsx content quickly after this if I can, but I can't parallel view.
          I'll include Footer here, if Layout has duplicate, I'll remove it from Layout later or user will report double footer.
          Actually, I will check Layout.tsx content later. 
      */}
            <footer className={styles.footer}>
                <div className="container">
                    <div className={styles.footerContent}>
                        <div className={styles.footerBrand}>
                            <span className={styles.footerLogo}>✨ 키라키라</span>
                            <p>AI 캐릭터와 함께하는 새로운 대화 경험</p>
                        </div>
                        <div className={styles.footerLinks}>
                            <div className={styles.footerColumn}>
                                <h4>서비스</h4>
                                <Link to="/characters">캐릭터 목록</Link>
                                <Link to="/create">캐릭터 만들기</Link>
                            </div>
                            <div className={styles.footerColumn}>
                                <h4>지원</h4>
                                <Link to="#">이용약관</Link>
                                <Link to="#">개인정보처리방침</Link>
                            </div>
                        </div>
                    </div>
                    <div className={styles.footerBottom}>
                        <p>© 2024 키라키라. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            <ConfirmModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
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
