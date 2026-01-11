"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import styles from "./Header.module.css";

export default function Header() {
    const { data: session, status } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>✨</span>
                    <span className={styles.logoText}>키라키라</span>
                </Link>

                <nav className={`${styles.nav} ${mobileMenuOpen ? styles.open : ""}`}>
                    <Link href="/characters" className={styles.navLink}>
                        캐릭터 둘러보기
                    </Link>
                    {session && (
                        <Link href="/create" className={styles.navLink}>
                            캐릭터 만들기
                        </Link>
                    )}
                </nav>

                <div className={styles.actions}>
                    {status === "loading" ? (
                        <div className="spinner" />
                    ) : session ? (
                        <div className={styles.userMenu}>
                            <Link href="/my" className={styles.userButton}>
                                <div className={styles.avatar}>
                                    {session.user?.name?.[0] || "U"}
                                </div>
                                <span className={styles.userName}>{session.user?.name}</span>
                            </Link>
                            <button
                                onClick={() => signOut()}
                                className={`btn btn-ghost ${styles.logoutBtn}`}
                            >
                                로그아웃
                            </button>
                        </div>
                    ) : (
                        <div className={styles.authButtons}>
                            <Link href="/login" className="btn btn-ghost">
                                로그인
                            </Link>
                            <Link href="/register" className="btn btn-primary">
                                시작하기
                            </Link>
                        </div>
                    )}

                    <button
                        className={styles.mobileToggle}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="메뉴 토글"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>
        </header>
    );
}
