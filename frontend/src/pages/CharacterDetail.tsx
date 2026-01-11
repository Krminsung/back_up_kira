import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import styles from "./CharacterDetail.module.css";

interface Character {
    id: string;
    name: string;
    description: string;
    personality: string | null;
    greeting: string;
    profileImage: string | null;
    chatCount: number;
    likeCount: number;
    visibility: string;
    creator: {
        id: string;
        name: string;
        avatar: string | null;
    };
}

export default function CharacterDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [character, setCharacter] = useState<Character | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.ok ? res.json() : null)
            .then(data => data && setUser(data.user))
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (!id) return;
        async function fetchCharacter() {
            try {
                const res = await fetch(`/api/characters/${id}`);
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || "캐릭터를 불러올 수 없습니다.");
                    return;
                }

                setCharacter(data.character);
            } catch {
                setError("캐릭터를 불러오는 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchCharacter();
    }, [id]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner" />
            </div>
        );
    }

    if (error || !character) {
        return (
            <div className={styles.error}>
                <h2>😢 {error || "캐릭터를 찾을 수 없습니다"}</h2>
                <Link to="/characters" className="btn btn-primary">
                    캐릭터 목록으로
                </Link>
            </div>
        );
    }

    const isOwner = user?.id === character.creator.id;

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.profile}>
                    <div className={styles.imageWrapper}>
                        {character.profileImage ? (
                            <img
                                src={character.profileImage}
                                alt={character.name}
                                className={`${styles.image} w-full h-full object-cover`}
                            />
                        ) : (
                            <div className={styles.placeholder}>{character.name[0]}</div>
                        )}
                    </div>

                    <div className={styles.info}>
                        <h1 className={styles.name}>{character.name}</h1>
                        <div className={styles.meta}>
                            <span className={styles.creator}>
                                by {character.creator.name}
                            </span>
                            <span className={styles.stats}>💬 {character.chatCount}</span>
                            <span className={styles.stats}>❤️ {character.likeCount}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <h2>소개</h2>
                        <p className={styles.description}>{character.description}</p>
                    </div>

                    {character.personality && (
                        <div className={styles.section}>
                            <h2>성격</h2>
                            <p className={styles.description}>{character.personality}</p>
                        </div>
                    )}

                    <div className={styles.section}>
                        <h2>첫 인사</h2>
                        <div className={styles.greeting}>
                            <div className={styles.greetingAvatar}>
                                {character.profileImage ? (
                                    <img
                                        src={character.profileImage}
                                        alt={character.name}
                                        width={40}
                                        height={40}
                                        style={{ objectFit: "cover", borderRadius: "50%" }}
                                    />
                                ) : (
                                    character.name[0]
                                )}
                            </div>
                            <div className={styles.greetingContent}>
                                <strong>{character.name}</strong>
                                <p>{character.greeting}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.actions}>
                    <Link
                        to={`/characters/${id}/chat`}
                        className="btn btn-primary btn-lg"
                    >
                        💬 대화 시작하기
                    </Link>
                    {isOwner && (
                        <div className={styles.ownerActions}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate(`/create?id=${id}`)}
                            >
                                ✏️ 수정
                            </button>
                            <button
                                className={`btn btn-danger ${styles.deleteBtn}`}
                                onClick={async () => {
                                    if (!confirm("정말로 이 캐릭터를 삭제하시겠습니까? 삭제된 캐릭터는 복구할 수 없습니다.")) {
                                        return;
                                    }
                                    try {
                                        const res = await fetch(`/api/characters/${id}`, {
                                            method: "DELETE",
                                        });
                                        if (res.ok) {
                                            alert("캐릭터가 삭제되었습니다.");
                                            alert("캐릭터가 삭제되었습니다.");
                                            navigate("/my");
                                        } else {
                                            const data = await res.json();
                                            alert(data.error || "삭제 실패");
                                        }
                                    } catch (err) {
                                        alert("오류가 발생했습니다.");
                                    }
                                }}
                            >
                                🗑️ 삭제
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
