import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./Create.module.css";
import ImageCropper from "../components/ImageCropper";

type Step = "basic" | "start" | "example" | "visibility";

export default function Create() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("id");
    // Session removed

    const [currentStep, setCurrentStep] = useState<Step>("basic");
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!editId);
    const [error, setError] = useState("");
    const [isEditMode, setIsEditMode] = useState(false);

    // Cropper state
    const [cropperOpen, setCropperOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState("");

    // Form data
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        personality: "",
        greeting: "",
        secret: "",
        exampleDialogs: [{ user: "", char: "" }],
        visibility: "PRIVATE",
        profileImage: "",
    });

    const steps: { key: Step; label: string }[] = [
        { key: "basic", label: "기본 정보" },
        { key: "start", label: "시작 설정" },
        { key: "example", label: "예시 대화" },
        { key: "visibility", label: "공개 설정" },
    ];

    // 로그인 체크
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (!res.ok) {
                    alert('로그인이 필요합니다.');
                    navigate('/login');
                }
            } catch {
                alert('로그인이 필요합니다.');
                navigate('/login');
            }
        };
        checkAuth();
    }, [navigate]);

    // 수정 모드일 때 기존 캐릭터 데이터 불러오기
    useEffect(() => {
        if (editId) {
            setIsEditMode(true);
            fetchCharacter();
        }
    }, [editId]);

    const fetchCharacter = async () => {
        try {
            const res = await fetch(`/api/characters/${editId}`);
            if (res.status === 401) { navigate('/login'); return; }
            const data = await res.json();

            if (res.ok && data.character) {
                const char = data.character;
                let parsedDialogs = [{ user: "", char: "" }];

                if (char.exampleDialogs) {
                    try {
                        parsedDialogs = JSON.parse(char.exampleDialogs);
                    } catch {
                        // ignore parse errors
                    }
                }

                setFormData({
                    name: char.name || "",
                    description: char.description || "",
                    personality: char.personality || "",
                    greeting: char.greeting || "",
                    secret: char.secret || "",
                    exampleDialogs: parsedDialogs.length > 0 ? parsedDialogs : [{ user: "", char: "" }],
                    visibility: char.visibility || "PRIVATE",
                    profileImage: char.profileImage || "",
                });
            }
        } catch (err) {
            console.error("Failed to fetch character:", err);
            setError("캐릭터 정보를 불러오지 못했습니다.");
        } finally {
            setInitialLoading(false);
        }
    };

    const updateForm = (field: string, value: string | object[]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const addExampleDialog = () => {
        setFormData((prev) => ({
            ...prev,
            exampleDialogs: [...prev.exampleDialogs, { user: "", char: "" }],
        }));
    };

    const updateExampleDialog = (index: number, field: "user" | "char", value: string) => {
        const newDialogs = [...formData.exampleDialogs];
        newDialogs[index][field] = value;
        setFormData((prev) => ({ ...prev, exampleDialogs: newDialogs }));
    };

    const removeExampleDialog = (index: number) => {
        if (formData.exampleDialogs.length > 1) {
            setFormData((prev) => ({
                ...prev,
                exampleDialogs: prev.exampleDialogs.filter((_, i) => i !== index),
            }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedImage(reader.result as string);
            setCropperOpen(true);
        };
        reader.readAsDataURL(file);
        e.target.value = ""; // Reset input to allow re-selecting same file
    };

    const handleCropComplete = async (croppedImage: string) => {
        setCropperOpen(false);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file: croppedImage,
                    type: "profile"
                }),
            });
            const data = await res.json();
            if (data.url) {
                updateForm("profileImage", data.url);
            }
        } catch (err) {
            console.error("Upload failed:", err);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.description || !formData.greeting) {
            setError("이름, 설명, 도입부는 필수 항목입니다.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const url = isEditMode ? `/api/characters/${editId}` : "/api/characters";
            const method = isEditMode ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    exampleDialogs: formData.exampleDialogs.filter(
                        (d) => d.user && d.char
                    ),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || `캐릭터 ${isEditMode ? "수정" : "생성"}에 실패했습니다.`);
                return;
            }

            navigate(`/characters/${data.character.id}`);
        } catch {
            setError(`캐릭터 ${isEditMode ? "수정" : "생성"} 중 오류가 발생했습니다.`);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className={styles.loading}>
                <div className="spinner" />
            </div>
        );
    }

    const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <h1 className={styles.title}>
                    {isEditMode ? "캐릭터 수정" : "새 캐릭터 만들기"}
                </h1>

                {/* Step indicators */}
                <div className={styles.steps}>
                    {steps.map((step, index) => (
                        <div
                            key={step.key}
                            className={`${styles.step} ${index <= currentStepIndex ? styles.active : ""
                                }`}
                            onClick={() => setCurrentStep(step.key)}
                        >
                            <span className={styles.stepNumber}>{index + 1}</span>
                            <span className={styles.stepLabel}>{step.label}</span>
                        </div>
                    ))}
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {/* Step content */}
                <div className={styles.stepContent}>
                    {currentStep === "basic" && (
                        <div className={styles.form}>
                            <div className={styles.imageUpload}>
                                <div className={styles.imagePreview}>
                                    {formData.profileImage ? (
                                        <img
                                            src={formData.profileImage}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span>+</span>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    id="profileImage"
                                    hidden
                                />
                                <label htmlFor="profileImage" className="btn btn-secondary">
                                    프로필 이미지 업로드
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label>캐릭터 이름 *</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="캐릭터의 이름을 입력하세요"
                                    value={formData.name}
                                    onChange={(e) => updateForm("name", e.target.value)}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>캐릭터 설명 *</label>
                                <p className={styles.fieldGuide}>
                                    캐릭터의 외모, 배경, 세계관, 직업 등을 상세히 작성하세요.
                                    AI가 캐릭터를 이해하는 핵심 정보입니다.
                                </p>
                                <div className={styles.exampleBox}>
                                    <strong>예시:</strong> 20대 초반의 마법 학교 교수. 은색 긴 머리와 보라색 눈이 특징이며,
                                    항상 고풍스러운 로브를 입고 다닌다. 300년을 살아온 엘프로, 인간 세계의
                                    작은 마법 학교에서 초급 마법을 가르치고 있다.
                                </div>
                                <label>
                                    설명 <span style={{ color: "red" }}>*</span>
                                    <span style={{ fontSize: '0.9em', color: '#666', marginLeft: '8px' }}>
                                        ({formData.description.length}/200자)
                                    </span>
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        updateForm("description", e.target.value)
                                    }
                                    placeholder="캐릭터 외모, 성격, 배경을 간략히 설명해주세요 (최대 200자)"
                                    rows={4}
                                    maxLength={200}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>성격</label>
                                <p className={styles.fieldGuide}>
                                    캐릭터의 말투, 성격 특성, 행동 패턴을 설명하세요.
                                    캐릭터가 어떻게 반응하고 대화하는지 AI에게 알려줍니다.
                                </p>
                                <div className={styles.exampleBox}>
                                    <strong>예시:</strong> 평소에는 차분하고 품위 있게 말하지만, 마법에 대한
                                    이야기가 나오면 눈을 반짝이며 열정적으로 설명한다. 학생들을 아끼며
                                    실수에도 부드럽게 가르치지만, 마법을 악용하려는 자에게는 단호하다.
                                </div>
                                <textarea
                                    className="input"
                                    placeholder="캐릭터의 성격, 말투, 행동 패턴 등을 설명하세요..."
                                    rows={3}
                                    value={formData.personality}
                                    onChange={(e) =>
                                        updateForm("personality", e.target.value)
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {currentStep === "start" && (
                        <div className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>도입부 (첫 인사) *</label>
                                <p className={styles.fieldGuide}>
                                    사용자와 대화를 시작할 때 캐릭터가 보낼 첫 메시지입니다.
                                    이 메시지가 대화의 분위기를 결정합니다. 상황 묘사를 포함하면 더 좋습니다.
                                </p>
                                <div className={styles.exampleBox}>
                                    <strong>예시:</strong> *오래된 책 냄새가 나는 연구실에서 고개를 들며*
                                    "아, 자네 왔군. 마침 흥미로운 마법 공식을 발견했는데 함께 보겠나, {"{{user}}"}?"
                                </div>
                                <textarea
                                    className="input"
                                    placeholder={"캐릭터가 대화를 시작할 때 보내는 첫 메시지입니다. {{user}} 를 사용하면 사용자 이름으로 대체됩니다."}
                                    rows={5}
                                    value={formData.greeting}
                                    onChange={(e) =>
                                        updateForm("greeting", e.target.value)
                                    }
                                />
                                <span className={styles.hint}>
                                    TIP: {"{{user}}"} = 사용자 이름, {"{{char}}"} = 캐릭터 이름
                                </span>
                            </div>

                            <div className={styles.formGroup}>
                                <label>비밀 설정 (선택)</label>
                                <p className={styles.fieldGuide}>
                                    캐릭터만 알고 있는 숨겨진 설정이나 비밀입니다.
                                    AI는 이 정보를 알고 행동하지만, 대놓고 말하지는 않습니다.
                                </p>
                                <div className={styles.exampleBox}>
                                    <strong>예시:</strong> 사실 인간계에 온 진짜 목적은 잃어버린 마왕의 심장을 찾는 것이다.
                                    겉으로는 친절한 교수님이지만 밤에는 탐색을 나간다.
                                </div>
                                <textarea
                                    className="input"
                                    placeholder="캐릭터만 알고 있는 비밀 정보입니다. AI가 대화에 반영하지만 직접 언급하지는 않습니다."
                                    rows={3}
                                    value={formData.secret}
                                    onChange={(e) => updateForm("secret", e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {currentStep === "example" && (
                        <div className={styles.form}>
                            <p className={styles.description}>
                                예시 대화를 추가하면 AI가 캐릭터의 말투와 성격을 더 잘 이해할 수 있습니다.
                                상황별로 어떻게 반응할지 알려주세요.
                            </p>

                            <div className={styles.exampleBox}>
                                <strong>예시:</strong><br />
                                <strong>User:</strong> 교수님, 이 마법 주문이 잘 안 돼요.<br />
                                <strong>Character:</strong> *지팡이를 가볍게 휘드르며* "어디 보자. 흐음, 손목의 스냅이 조금 약했구나. 이렇게 부드럽게 돌려야지."
                            </div>
                            <br />

                            {formData.exampleDialogs.map((dialog, index) => (
                                <div key={index} className={styles.dialogPair}>
                                    <div className={styles.formGroup}>
                                        <label>사용자 메시지</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="사용자가 보낼 메시지 예시"
                                            value={dialog.user}
                                            onChange={(e) =>
                                                updateExampleDialog(index, "user", e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>캐릭터 응답</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="캐릭터가 응답할 메시지 예시"
                                            value={dialog.char}
                                            onChange={(e) =>
                                                updateExampleDialog(index, "char", e.target.value)
                                            }
                                        />
                                    </div>
                                    {formData.exampleDialogs.length > 1 && (
                                        <button
                                            type="button"
                                            className={styles.removeBtn}
                                            onClick={() => removeExampleDialog(index)}
                                        >
                                            삭제
                                        </button>
                                    )}
                                </div>
                            ))}

                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={addExampleDialog}
                            >
                                + 예시 대화 추가
                            </button>
                        </div>
                    )}

                    {currentStep === "visibility" && (
                        <div className={styles.form}>
                            <div className={styles.visibilityOptions}>
                                <label
                                    className={`${styles.visibilityOption} ${formData.visibility === "PRIVATE" ? styles.selected : ""
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="visibility"
                                        value="PRIVATE"
                                        checked={formData.visibility === "PRIVATE"}
                                        onChange={(e) =>
                                            updateForm("visibility", e.target.value)
                                        }
                                    />
                                    <div className={styles.optionContent}>
                                        <span className={styles.optionIcon}>🔒</span>
                                        <div>
                                            <strong>비공개</strong>
                                            <p>나만 볼 수 있습니다</p>
                                        </div>
                                    </div>
                                </label>

                                <label
                                    className={`${styles.visibilityOption} ${formData.visibility === "LINK_ONLY" ? styles.selected : ""
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="visibility"
                                        value="LINK_ONLY"
                                        checked={formData.visibility === "LINK_ONLY"}
                                        onChange={(e) =>
                                            updateForm("visibility", e.target.value)
                                        }
                                    />
                                    <div className={styles.optionContent}>
                                        <span className={styles.optionIcon}>🔗</span>
                                        <div>
                                            <strong>링크 공유</strong>
                                            <p>링크를 아는 사람만 볼 수 있습니다</p>
                                        </div>
                                    </div>
                                </label>

                                <label
                                    className={`${styles.visibilityOption} ${formData.visibility === "PUBLIC" ? styles.selected : ""
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="visibility"
                                        value="PUBLIC"
                                        checked={formData.visibility === "PUBLIC"}
                                        onChange={(e) =>
                                            updateForm("visibility", e.target.value)
                                        }
                                    />
                                    <div className={styles.optionContent}>
                                        <span className={styles.optionIcon}>🌐</span>
                                        <div>
                                            <strong>공개</strong>
                                            <p>모든 사람이 검색하고 대화할 수 있습니다</p>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation buttons */}
                <div className={styles.navigation}>
                    {currentStepIndex > 0 && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setCurrentStep(steps[currentStepIndex - 1].key)}
                        >
                            이전
                        </button>
                    )}
                    <div className={styles.spacer} />
                    {currentStepIndex < steps.length - 1 ? (
                        <button
                            className="btn btn-primary"
                            onClick={() => setCurrentStep(steps[currentStepIndex + 1].key)}
                        >
                            다음
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? "처리 중..." : isEditMode ? "수정 완료" : "캐릭터 만들기"}
                        </button>
                    )}
                </div>
            </div>

            {cropperOpen && (
                <ImageCropper
                    imageSrc={selectedImage}
                    onCancel={() => setCropperOpen(false)}
                    onCropComplete={handleCropComplete}
                />
            )}
        </div>
    );
}


