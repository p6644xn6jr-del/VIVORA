import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Post.css";
import {
  createPost,
  getContests,
  getCurrentUser,
  joinTournament,
  uploadPostMedia,
} from "../services/api";

const MAX_BODY_LENGTH = 200;
const MAX_MEDIA_COUNT = 5;
const MAX_VIDEO_SECONDS = 60;
const MAX_TAGS = 5;

function Post() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contestIdFromUrl = searchParams.get("contestId");
  const tagFromUrl = searchParams.get("tag");
  const initialTagFromUrl = tagFromUrl
    ? `#${decodeURIComponent(tagFromUrl).replace(/^#/, "")}`
    : null;
  const fileInputRef = useRef(null);
  const previewUrlsRef = useRef([]);

  const [body, setBody] = useState("");
  const [postType, setPostType] = useState("こだわり");
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState(() =>
    initialTagFromUrl ? [initialTagFromUrl] : []
  );
  const [media, setMedia] = useState([]);
  const [selectedContest, setSelectedContest] = useState(null);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibility, setVisibility] = useState("みんなに公開");
  const [submitted, setSubmitted] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [contests, setContests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    getCurrentUser()
      .then((userData) => {
        setCurrentUser(userData);
      })
      .catch((error) => {
        console.error("現在のユーザー取得に失敗しました:", error);
      });
  }, []);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (initialTagFromUrl) {
      setTags([initialTagFromUrl]);
    }
  }, [initialTagFromUrl]);

  useEffect(() => {
    getContests()
      .then((data) => {
        const activeContests = Array.isArray(data) ? data : [];

        setContests(activeContests);

        if (contestIdFromUrl) {
          const contest = activeContests.find(
            (item) => Number(item.id) === Number(contestIdFromUrl)
          );

          if (contest) {
            setPostType("大会");
            setSelectedContest(contest);
            setTags([]);
            setNewTag("");
          }
        }
      })
      .catch((error) => {
        console.error("大会データの取得に失敗しました:", error);
      });
  }, [contestIdFromUrl]);

  const getPreviewUrl = (file) => {
    const existing = previewUrlsRef.current.find((item) => item.file === file);
    if (existing) return existing.url;

    const url = URL.createObjectURL(file);
    previewUrlsRef.current.push({ file, url });
    return url;
  };

  const validateVideo = (file) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");

      const cleanup = () => {
        video.remove();
        URL.revokeObjectURL(url);
      };

      video.preload = "metadata";

      video.onloadedmetadata = () => {
        const duration = Number(video.duration);
        cleanup();

        if (!Number.isFinite(duration)) {
          reject(new Error("動画の長さを確認できませんでした。"));
          return;
        }

        if (duration > MAX_VIDEO_SECONDS) {
          reject(new Error("動画は60秒以内にしてください。"));
          return;
        }

        resolve(true);
      };

      video.onerror = () => {
        cleanup();
        reject(new Error("動画を読み込めませんでした。"));
      };

      video.src = url;
    });

  const addMedia = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    const remaining = MAX_MEDIA_COUNT - media.length;

    if (remaining <= 0) {
      setMediaError(
        `写真・動画は最大${MAX_MEDIA_COUNT}件まで追加できます。`
      );
      return;
    }

    const accepted = [];
    const errors = [];

    for (const file of files.slice(0, remaining)) {
      if (
        !file.type.startsWith("image/") &&
        !file.type.startsWith("video/")
      ) {
        errors.push(`${file.name}: 画像または動画を選択してください。`);
        continue;
      }

      if (file.type.startsWith("video/")) {
        try {
          await validateVideo(file);
        } catch (error) {
          errors.push(`${file.name}: ${error.message}`);
          continue;
        }
      }

      accepted.push(file);
    }

    if (accepted.length) {
      setMedia((current) => [...current, ...accepted]);
    }

    setMediaError(
      errors.length
        ? errors.join(" ")
        : files.length > remaining
          ? `最大${MAX_MEDIA_COUNT}件までなので一部だけ追加しました。`
          : ""
    );
  };

  const removeMedia = (index) => {
    setMedia((current) => current.filter((_, i) => i !== index));
    setMediaError("");
  };

  const addTag = (event) => {
    event.preventDefault();

    const value = newTag.trim().replace(/^#\s*/, "");

    if (!value || tags.length >= MAX_TAGS) return;

    const tag = `#${value}`;

    if (!tags.includes(tag)) {
      setTags((current) => [...current, tag]);
    }

    setNewTag("");
  };

  const removeTag = (tag) => {
    setTags((current) => current.filter((item) => item !== tag));
  };

  const selectPostType = (type) => {
    setPostType(type);

    if (type === "大会") {
      setTags([]);
      setNewTag("");
    } else {
      setSelectedContest(null);
    }
  };

  const submitPost = () => {
    if (!currentUser?.id) {
      window.alert(
        "ユーザー情報を読み込んでいます。少し待ってから投稿してください。"
      );
      return;
    }

    if (!body.trim() && media.length === 0) {
      window.alert("写真・動画か、本文を1つ以上追加してください。");
      return;
    }

    if (postType === "大会" && !selectedContest) {
      window.alert("投稿する大会を1つ選択してください。");
      return;
    }

    const postDraft = {
      userId: currentUser.id,

      content: body.trim(),

      imageUrl: "",
      media: [],

      tags: postType === "大会" ? ["大会"] : tags,

      type:
        postType === "大会"
          ? "tournament"
          : "commitment",

      tournamentId:
        postType === "大会"
          ? selectedContest?.id ?? null
          : null,

      record:
        postType === "大会"
          ? 0
          : null,

      postType,
      visibility,
    };

    (async () => {
      try {
        const uploadedMedia = [];

        for (const file of media) {
          const uploaded = await uploadPostMedia(file);
          uploadedMedia.push(uploaded);
        }

        await createPost({
          ...postDraft,
          imageUrl: uploadedMedia[0]?.mediaUrl || "",
          media: uploadedMedia,
        });

        if (
          postType === "大会" &&
          selectedContest?.id != null
        ) {
          await joinTournament(
            selectedContest.id,
            currentUser.id
          );
        }

        setSubmitted(true);
      } catch (error) {
        console.error(
          "メディアアップロード、投稿、または大会参加登録に失敗しました:",
          error
        );

        window.alert(
          error?.message ||
            "画像・動画のアップロードまたは投稿に失敗しました。"
        );
      }
    })();
  };

  const resetDraft = () => {
    setSubmitted(false);
    setBody("");
    setMedia([]);
    setTags(initialTagFromUrl ? [initialTagFromUrl] : []);
    setNewTag("");

    if (contestIdFromUrl) {
      const contest = contests.find(
        (item) => item.id === Number(contestIdFromUrl)
      );

      if (contest) {
        setPostType("大会");
        setSelectedContest(contest);
        setTags([]);
      } else {
        setPostType("こだわり");
        setSelectedContest(null);
      }
    } else {
      setPostType("こだわり");
      setSelectedContest(null);
    }

    setVisibilityOpen(false);
    setMediaError("");
  };

  if (submitted) {
    return (
      <main className="post-page post-page--submitted">
        <div className="post-success">
          <div className="post-success__icon">✓</div>

          <h1>投稿しました！</h1>
          <p>投稿を保存しました。</p>

          <div className="post-success__actions">
            <button
              type="button"
              className="post-primary-button"
              onClick={() => navigate("/")}
            >
              ホームへ
            </button>

            <button
              type="button"
              className="post-secondary-button"
              onClick={resetDraft}
            >
              もう一度投稿する
            </button>
          </div>
        </div>
      </main>
    );
  }

  const hasMedia = media.length > 0;
  const mainMedia = media[0];
  const extraMedia = media.slice(1);

  return (
    <main className={`post-page ${hasMedia ? "has-media" : ""}`}>
      <header className="post-page__header">
        <button
          type="button"
          className="post-icon-button"
          onClick={() => navigate(-1)}
          aria-label="戻る"
        >
          ×
        </button>

        <div className="post-page__title-group">
          <h1>新しい投稿</h1>
          <p>あなたの「こだわり」を、カタチにしよう。</p>
        </div>

        <button
          type="button"
          className={`post-header-submit ${
            hasMedia ? "is-secondary" : ""
          }`}
          onClick={submitPost}
        >
          {hasMedia ? "下書き保存" : "投稿する"}
        </button>
      </header>

      <section className="post-user">
        <div className="post-user__avatar">
          {currentUser?.icon ? (
            <img src={currentUser.icon} alt="" />
          ) : (
            "●"
          )}
        </div>

        <div className="post-user__info">
          <strong>
            {currentUser?.name ?? "読み込み中..."}
          </strong>
          <span>{currentUser?.area ?? ""}</span>
        </div>
      </section>

      {!hasMedia && (
        <section className="post-composer">
          <textarea
            value={body}
            onChange={(event) =>
              setBody(
                event.target.value.slice(
                  0,
                  MAX_BODY_LENGTH
                )
              )
            }
            placeholder="いま、何にこだわってる？"
            maxLength={MAX_BODY_LENGTH}
            className="post-main-input"
          />
        </section>
      )}

      {hasMedia ? (
        <section className="post-media-editor">
          <div className="post-media-featured">
            <div className="post-media-featured__preview">
              {mainMedia.type.startsWith("video/") ? (
                <video
                  src={getPreviewUrl(mainMedia)}
                  muted
                  playsInline
                  controls
                />
              ) : (
                <img
                  src={getPreviewUrl(mainMedia)}
                  alt="選択したメディア"
                />
              )}

              <span className="post-media-count">
                1/{media.length}
              </span>

              <button
                type="button"
                className="post-media-edit"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                ✎ 編集
              </button>

              <button
                type="button"
                className="post-media-delete"
                onClick={() => removeMedia(0)}
                aria-label="メディアを削除"
              >
                ×
              </button>
            </div>

            {extraMedia.length > 0 && (
              <div className="post-media-thumbs">
                {extraMedia.map((file, index) => {
                  const originalIndex = index + 1;

                  return (
                    <button
                      type="button"
                      className="post-media-thumb"
                      key={`${file.name}-${file.lastModified}-${originalIndex}`}
                      onClick={() => {
                        setMedia((current) => {
                          const next = [...current];
                          const [picked] =
                            next.splice(originalIndex, 1);

                          next.unshift(picked);

                          return next;
                        });
                      }}
                      aria-label={`${
                        originalIndex + 1
                      }番目のメディアを先頭にする`}
                    >
                      {file.type.startsWith("video/") ? (
                        <video
                          src={getPreviewUrl(file)}
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={getPreviewUrl(file)}
                          alt=""
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            className="post-media-upload post-media-upload--side"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            <span className="post-media-upload__plus">
              ＋
            </span>
            <strong>写真・動画を追加</strong>
            <small>
              最大10件・動画は60秒まで
            </small>
          </button>
        </section>
      ) : (
        <button
          type="button"
          className="post-media-upload"
          onClick={() =>
            fileInputRef.current?.click()
          }
        >
          <span className="post-media-upload__plus">
            ＋
          </span>
          <strong>写真・動画を追加</strong>
          <small>
            最大10件・動画は60秒まで
          </small>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={addMedia}
      />

      {mediaError && (
        <p className="post-media-error">
          {mediaError}
        </p>
      )}

      {hasMedia && (
        <section className="post-body-card">
          <textarea
            value={body}
            onChange={(event) =>
              setBody(
                event.target.value.slice(
                  0,
                  MAX_BODY_LENGTH
                )
              )
            }
            placeholder="ひとことを書いてみよう"
            maxLength={MAX_BODY_LENGTH}
            className="post-body-input"
          />

          <span className="post-body-count">
            {body.length}/{MAX_BODY_LENGTH}
          </span>
        </section>
      )}

      {/* 大会投稿ではタグを表示しない */}
      {postType !== "大会" && (
        <section className="post-option-section">
          <div className="post-section-heading">
            <h2>こだわりを追加</h2>
            <span>（任意・最大5個）</span>
          </div>

          <div className="post-tags">
            {tags.map((tag) => (
              <button
                type="button"
                className="post-tag"
                key={tag}
                onClick={() => removeTag(tag)}
                aria-label={`${tag}を削除`}
              >
                {tag} ×
              </button>
            ))}
          </div>

          {tags.length < MAX_TAGS && (
            <form
              className="post-tag-form"
              onSubmit={addTag}
            >
              <input
                value={newTag}
                onChange={(event) =>
                  setNewTag(event.target.value)
                }
                placeholder="#タグを入力"
                aria-label="タグを入力"
                maxLength={30}
              />

              <button type="submit">
                追加
              </button>
            </form>
          )}
        </section>
      )}

      <section className="post-option-section">
        <div className="post-section-heading">
          <h2>この投稿は？</h2>
          <span>（ひとつ選択）</span>
        </div>

        <div className="post-type-grid">
          {[
            {
              type: "こだわり",
              icon: "#",
              color: "purple",
              description: "好き・こだわりを残す",
            },
            {
              type: "挑戦",
              icon: "!",
              color: "blue",
              description: "記録やチャレンジ",
            },
            {
              type: "大会",
              icon: "🏆",
              color: "orange",
              description: "大会にエントリー",
            },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              className={`post-type-card post-type-card--${item.color} ${
                postType === item.type ? "active" : ""
              }`}
              onClick={() => selectPostType(item.type)}
              aria-pressed={postType === item.type}
            >
              <span className="post-type-card__icon">
                {item.icon}
              </span>

              <strong>{item.type}</strong>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
      </section>

      {postType === "大会" && (
        <section className="post-option-section post-contest-section">
          <div className="post-section-heading">
            <h2>大会を選択</h2>
            <span>（参加する大会）</span>
          </div>

          <div className="post-contest-list">
            {contests.map((contest) => (
              <button
                type="button"
                key={contest.id}
                className={`post-contest-card ${
                  selectedContest?.id === contest.id
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setSelectedContest(contest)
                }
                aria-pressed={
                  selectedContest?.id === contest.id
                }
              >
                <div>
                  <strong>
                    🏆 {contest.title}
                  </strong>

                  <span>
                    開催中 ・ {contest.participants}人参加 ・
                    締切 {contest.deadline}
                  </span>
                </div>

                <span className="post-contest-card__arrow">
                  ›
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="post-setting-list">
        <button
          type="button"
          className="post-setting-row"
          onClick={() =>
            setVisibilityOpen((current) => !current)
          }
          aria-expanded={visibilityOpen}
        >
          <span className="post-setting-row__left">
            <span className="post-setting-icon">◎</span>
            公開範囲
          </span>

          <span className="post-setting-row__right">
            {visibility}⌄
          </span>
        </button>

        {visibilityOpen && (
          <div className="post-visibility-options">
            {[
              "みんなに公開",
              "フォロワーのみ",
              "自分のみ",
            ].map((item) => (
              <button
                type="button"
                key={item}
                className={
                  visibility === item ? "selected" : ""
                }
                onClick={() => {
                  setVisibility(item);
                  setVisibilityOpen(false);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="post-setting-row"
        >
          <span className="post-setting-row__left">
            <span className="post-setting-icon">⌚</span>
            ウェアラブル連携
          </span>

          <span className="post-setting-row__right">
            Apple Watch{" "}
            <b className="post-connected">✓</b> ›
          </span>
        </button>

        {!hasMedia && (
          <button
            type="button"
            className="post-setting-row"
          >
            <span className="post-setting-row__left">
              <span className="post-setting-icon">⌖</span>
              位置情報を追加
            </span>

            <span className="post-setting-row__right">
              ›
            </span>
          </button>
        )}
      </section>

      <div className="post-submit-area">
        <button
          type="button"
          className="post-primary-button"
          onClick={submitPost}
        >
          ⟶ 投稿する
        </button>

        <p>🔒 投稿内容はあとから編集できます</p>
      </div>
    </main>
  );
}

export default Post;