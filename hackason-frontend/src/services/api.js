import { createClient } from "@supabase/supabase-js";

const API_BASE_URL = "http://localhost:3000";

function getContestStatus(contest) {
  const start = contest?.startAt ?? contest?.start_at;
  const end = contest?.endAt ?? contest?.end_at;

  if (start || end) {
    const now = Date.now();
    const startTime = start ? new Date(start).getTime() : Number.NEGATIVE_INFINITY;
    const endTime = end ? new Date(end).getTime() : Number.POSITIVE_INFINITY;

    if (!Number.isNaN(startTime) && now < startTime) return "upcoming";
    if (!Number.isNaN(endTime) && now > endTime) return "finished";
    if (!Number.isNaN(startTime) || !Number.isNaN(endTime)) return "active";
  }

  return contest?.status ?? "active";
}

function normalizeContest(contest) {
  const startAt = contest?.startAt ?? contest?.start_at ?? null;
  const endAt = contest?.endAt ?? contest?.end_at ?? null;

  return {
    ...contest,
    number: contest?.number ?? contest?.id,
    description: contest?.description ?? `${contest?.category ?? "大会"}の大会です。`,
    status: getContestStatus(contest),
    type: contest?.type ?? "score",
    official: contest?.official ?? false,
    participants: Number(contest?.participantsCount ?? contest?.participants ?? 0),
    remainingText: contest?.remainingText ?? "",
    image: contest?.image ?? contest?.image_url ?? "",
    startAt,
    endAt,
    media: Array.isArray(contest?.media) ? contest.media : [],
    target: contest?.target ?? null,
    unit: contest?.unit ?? "",
    direction: contest?.direction ?? "highest",
    decimalPlaces: Number(contest?.decimalPlaces ?? contest?.decimal_places ?? 0),
    titleAward: contest?.titleAward ?? contest?.title_award ?? null,
    joinedByMe: contest?.joinedByMe ?? contest?.joined_by_me ?? false,
    resultFinalizedAt:
      contest?.resultFinalizedAt ?? contest?.result_finalized_at ?? null,
  };
}

export function formatScore(score, decimalPlaces = 0, unit = "") {
  const numericScore = Number(score);
  const places = Number(decimalPlaces);
  const safePlaces =
    Number.isInteger(places) && places >= 0 && places <= 6 ? places : 0;

  if (!Number.isFinite(numericScore)) {
    return `—${unit ?? ""}`;
  }

  return `${numericScore.toFixed(safePlaces)}${unit ?? ""}`;
}

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");

  return accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
}

function normalizePost(post) {
  const uid = post?.userId ?? post?.user_id;
  const isTestUser = Number(uid) === 1;
  const recordUnit = post?.unit ?? post?.tournaments?.unit ?? "";
  const recordDecimalPlaces = Number(
    post?.decimalPlaces ?? post?.decimal_places ?? post?.tournaments?.decimal_places ?? 0
  );

  return {
    ...post,
    id: post?.id,
    userId: uid,
    userName: post?.userName ?? post?.displayName ?? post?.username ?? (isTestUser ? "テスト太郎" : `ユーザー${uid ?? ""}`),
    userIcon: post?.userIcon ?? post?.icon ?? "🙂",
    text: post?.text ?? post?.content ?? "",
    body: post?.body ?? post?.content ?? "",
    image:
      post?.image ??
      post?.image_url ??
      post?.imageUrl ??
      (Array.isArray(post?.media) && post.media[0]?.mediaType === "image"
        ? post.media[0]?.mediaUrl
        : ""),
    tags: Array.isArray(post?.tags) ? post.tags : [],
    likes: Number(post?.likes ?? 0),
    comments: Number(post?.comments ?? 0),
    postType: post?.postType ?? post?.type ?? "commitment",
    contestId: post?.tournament_id ?? post?.tournamentId ?? null,
    record: post?.record ?? null,
    recordUnit,
    recordDecimalPlaces,
    recordText:
      post?.record != null
        ? formatScore(post.record, recordDecimalPlaces, recordUnit)
        : null,
    media: Array.isArray(post?.media) ? post.media : [],
    createdAt: post?.createdAt ?? post?.created_at ?? null,
    createdAtText: post?.createdAtText ?? (post?.created_at ? new Date(post.created_at).toLocaleString("ja-JP") : "日時不明"),
  };
}

function normalizeTitle(title) {
  if (!title) return null;

  return {
    ...title,
    id: title.id,
    titleId: title.titleId ?? title.title_id ?? title.id,
    userId: title.userId ?? title.user_id ?? null,
    tournamentId: title.tournamentId ?? title.tournament_id ?? null,
    tournamentTitle: title.tournamentTitle ?? title.tournament_title ?? "",
    name: title.name ?? "称号",
    description: title.description ?? "",
    imageUrl: title.imageUrl ?? title.image_url ?? "",
    rarity: title.rarity ?? "winner",
    rank: Number(title.rank ?? 1),
    score: title.score ?? null,
    unit: title.unit ?? "",
    awardedAt: title.awardedAt ?? title.awarded_at ?? null,
  };
}

function normalizeRecord(record) {
  const decimalPlaces = Number(
    record?.decimalPlaces ?? record?.decimal_places ?? record?.tournaments?.decimal_places ?? 0
  );
  const unit = record?.unit ?? record?.tournaments?.unit ?? "";

  return {
    ...record,
    id: record?.id,
    userId: record?.userId ?? record?.user_id,
    tournamentId: record?.tournamentId ?? record?.tournament_id,
    postId: record?.postId ?? record?.post_id,
    score: Number(record?.score ?? 0),
    unit,
    decimalPlaces,
    scoreText: record?.scoreText ?? formatScore(record?.score ?? 0, decimalPlaces, unit),
    tournamentTitle: record?.tournamentTitle ?? record?.tournaments?.title ?? "",
    createdAt: record?.createdAt ?? record?.created_at ?? null,
  };
}

function normalizeComment(comment) {
  return {
    ...comment,
    id: comment?.id,
    postId: comment?.postId ?? comment?.post_id,
    userId: comment?.userId ?? comment?.user_id,
    userName:
      comment?.userName ??
      comment?.users?.display_name ??
      `ユーザー${comment?.user_id ?? ""}`,
    userIcon:
      comment?.userIcon ??
      comment?.users?.icon_url ??
      "🙂",
    content: comment?.content ?? "",
    createdAt: comment?.createdAt ?? comment?.created_at ?? null,
    createdAtText:
      comment?.createdAtText ??
      (comment?.created_at
        ? new Date(comment.created_at).toLocaleString("ja-JP")
        : "日時不明"),
  };
}

export function getStoredSession() {
  const accessToken =
    localStorage.getItem("accessToken") ??
    localStorage.getItem("access_token");

  return accessToken
    ? { access_token: accessToken }
    : null;
}

export function getStoredUser() {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return null;

    const user = JSON.parse(stored);
    if (!user) return null;

    return {
      ...user,
      id: user.user_id ?? user.userId ?? user.id,
      userId: user.user_id ?? user.userId ?? user.id,
      user_id: user.user_id ?? user.userId ?? user.id,
      name: user.name ?? user.display_name ?? "",
      displayName:
        user.displayName ?? user.display_name ?? user.name ?? "",
      icon: user.icon ?? user.icon_url ?? "🙂",
      area: user.area ?? null,
      birthday: user.birthday ?? null,
    };
  } catch (error) {
    console.error("保存ユーザーの取得に失敗しました:", error);
    return null;
  }
}

async function readJson(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? `APIリクエストに失敗しました。(${response.status})`);
  return data;
}

export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  localStorage.removeItem("access_token");
  localStorage.removeItem("current_user");
}

export async function getCurrentUser() {
  return getStoredUser();
}

export async function getUserById(id) {
  const res = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  return readJson(res);
}

export async function getContests() {
  const res = await fetch(`${API_BASE_URL}/tournaments`);
  const data = await readJson(res);
  const list = Array.isArray(data) ? data : (Array.isArray(data?.tournaments) ? data.tournaments : []);
  return list.map(normalizeContest);
}

// 人気の大会を取得
export async function getPopularContests() {
  const res = await fetch(`${API_BASE_URL}/tournaments/popular`);
  const data = await readJson(res);
  const list = Array.isArray(data)
    ? data
    : (Array.isArray(data?.tournaments) ? data.tournaments : []);

  return list.map(normalizeContest);
}

export async function getContestById(id) {
  const res = await fetch(`${API_BASE_URL}/tournaments/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 404) return null;
  return normalizeContest(await readJson(res));
}

export async function getTournamentRanking(tournamentId) {
  const res = await fetch(
    `${API_BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/ranking`
  );

  return readJson(res);
}

export async function getTournamentTitle(tournamentId) {
  const res = await fetch(
    `${API_BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/title`
  );
  if (res.status === 404) return null;
  return normalizeTitle(await readJson(res));
}

export async function getJoinedContests() {
  const currentUser = getStoredUser();

  if (!currentUser?.id) {
    return [];
  }

  const res = await fetch(
    `${API_BASE_URL}/users/${encodeURIComponent(currentUser.id)}/tournaments`
  );
  const data = await readJson(res);
  return (Array.isArray(data) ? data : []).map(normalizeContest);
}

export async function joinContest(id) {
  const res = await fetch(
    `${API_BASE_URL}/tournaments/${encodeURIComponent(id)}/participants`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    }
  );
  return readJson(res);
}

export async function cancelTournamentParticipation(tournamentId) {
  const res = await fetch(
    `${API_BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/participants`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    }
  );

  return readJson(res);
}


export async function getTournamentParticipants(tournamentId) {
  const res = await fetch(
    `${API_BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/participants`
  );
  return readJson(res);
}

export async function joinTournament(tournamentId) {
  const res = await fetch(
    `${API_BASE_URL}/tournaments/${encodeURIComponent(
      tournamentId
    )}/participants`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    }
  );

  return readJson(res);
}

export async function getPosts({ tag, userId, sortMode, type, tournamentId } = {}) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (tag) params.set("tag", String(tag).replace(/^#/, ""));
  if (tournamentId != null) params.set("tournamentId", String(tournamentId));

  const qs = params.toString();

  const accessToken = localStorage.getItem("accessToken");
  const authHeaders = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  // 投稿にはユーザー名が含まれていないため、
  // usersテーブルの実データと user_id で照合して表示名を付ける。
  const [postsRes, usersRes] = await Promise.all([
    fetch(`${API_BASE_URL}/posts${qs ? `?${qs}` : ""}`, {
      headers: authHeaders,
    }),
    fetch(`${API_BASE_URL}/users`),
  ]);

  const [postData, users] = await Promise.all([
    readJson(postsRes),
    readJson(usersRes),
  ]);

  const userMap = new Map(
    (Array.isArray(users) ? users : []).map((user) => [
      Number(user.id ?? user.userId ?? user.user_id),
      user,
    ])
  );

  let posts = (Array.isArray(postData) ? postData : []).map((post) => {
    const normalized = normalizePost(post);
    const user = userMap.get(Number(normalized.userId));

    return {
      ...normalized,
      userName:
        user?.name ??
        user?.display_name ??
        normalized.userName,
      userIcon:
        user?.icon ??
        user?.icon_url ??
        normalized.userIcon,
    };
  });

  if (userId != null) {
    const target = Number(userId);
    posts = posts.filter(post => Number(post.userId) === target);
  }

  if (sortMode === "new" || userId != null) {
    posts.sort((a,b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }

  return posts;
}

export async function getPostById(id) {
  const res = await fetch(`${API_BASE_URL}/posts/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 404) return null;

  const post = normalizePost(await readJson(res));

  try {
    const user = await getUserById(post.userId);

    return {
      ...post,
      userName: user?.name ?? user?.display_name ?? post.userName,
      userIcon: user?.icon ?? user?.icon_url ?? post.userIcon,
    };
  } catch (error) {
    console.error("投稿者情報の取得に失敗しました:", error);
    return post;
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const createSupabaseClient = (accessToken) => {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {},
  });
};

export async function uploadPostMedia(file) {
  if (!(file instanceof File)) {
    throw new Error("アップロードするファイルが正しくありません。");
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabaseの設定がありません。フロントの.envにVITE_SUPABASE_URLとVITE_SUPABASE_ANON_KEYを設定してください。"
    );
  }

  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    throw new Error("ログインが必要です");
  }

  const supabase = createSupabaseClient(accessToken);
  if (!supabase) {
    throw new Error("Supabaseクライアントを作成できませんでした。");
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : "bin";
  const path = `${crypto.randomUUID()}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("post-media")
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`メディアのアップロードに失敗しました: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from("post-media")
    .getPublicUrl(path);

  const mediaUrl = publicUrlData?.publicUrl;
  if (!mediaUrl) {
    throw new Error("StorageのPublic URLを取得できませんでした。");
  }

  return {
    mediaType: file.type.startsWith("video/") ? "video" : "image",
    mediaUrl,
  };
}

export async function createPost(postDraft) {
  const type = postDraft.postType === "大会" ? "tournament" : "commitment";
  const tags = Array.isArray(postDraft.tags)
    ? postDraft.tags.map(x => String(x).replace(/^#/, "")).filter(Boolean)
    : [];

  const payload = {
    content: postDraft.content ?? "",
    // 画像がないテキスト投稿ではダミー画像を付けない。
    imageUrl: postDraft.imageUrl || null,
    tags: tags.length ? tags : ["こだわり"],
    type,
    tournamentId:
      type === "tournament"
        ? (postDraft.tournamentId ?? postDraft.contestId ?? null)
        : null,
    record: type === "tournament" ? (postDraft.record ?? null) : null,
    media: Array.isArray(postDraft.media) ? postDraft.media : [],
  };
  const accessToken = localStorage.getItem("accessToken");

  const res = await fetch(`${API_BASE_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });
  return normalizePost((await readJson(res)).post);
}

export async function createRecord(recordDraft) {
  const res = await fetch(`${API_BASE_URL}/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      tournamentId: recordDraft.tournamentId,
      postId: recordDraft.postId,
      score: recordDraft.score,
      unit: recordDraft.unit ?? null,
    }),
  });

  const data = await readJson(res);
  return normalizeRecord(data.record ?? data);
}

export async function getUserTitles(userId) {
  const res = await fetch(
    `${API_BASE_URL}/users/${encodeURIComponent(userId)}/titles`
  );
  const data = await readJson(res);
  return (Array.isArray(data) ? data : []).map(normalizeTitle);
}

export async function getUserRecords(userId) {
  const res = await fetch(
    `${API_BASE_URL}/users/${encodeURIComponent(userId)}/records`
  );
  const data = await readJson(res);
  return (Array.isArray(data) ? data : []).map(normalizeRecord);
}

export async function finalizeTournament(tournamentId) {
  const res = await fetch(
    `${API_BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/finalize`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    }
  );

  return readJson(res);
}

export async function getLikedPostIds() {
  const res = await fetch(`${API_BASE_URL}/posts`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  const posts = await readJson(res);

  return (Array.isArray(posts) ? posts : [])
    .filter((post) => post?.likedByMe === true)
    .map((post) => Number(post.id));
}

export async function togglePostLike(id, currentlyLiked = false) {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error("ログインが必要です");
  }

  const res = await fetch(
    `${API_BASE_URL}/posts/${encodeURIComponent(Number(id))}/like`,
    {
      method: currentlyLiked ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return readJson(res).then((data) => ({
    liked: !currentlyLiked,
    postId: Number(id),
    likes: Number(data?.likes ?? 0),
  }));
}

export async function getPostComments(postId) {
  const res = await fetch(
    `${API_BASE_URL}/posts/${encodeURIComponent(postId)}/comments`
  );
  const data = await readJson(res);
  return (Array.isArray(data) ? data : []).map(normalizeComment);
}

export async function createPostComment(postId, content) {
  const res = await fetch(
    `${API_BASE_URL}/posts/${encodeURIComponent(postId)}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ content }),
    }
  );

  const data = await readJson(res);
  return {
    comment: normalizeComment(data.comment ?? data),
    comments: Number(data.comments ?? 0),
  };
}

export async function deletePostComment(postId, commentId) {
  const res = await fetch(
    `${API_BASE_URL}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  return readJson(res);
}
export async function getTags(sort = "popular") {
  const query = sort ? `?sort=${encodeURIComponent(sort)}` : "";
  const res = await fetch(`${API_BASE_URL}/tags${query}`);
  const data = await readJson(res);
  return Array.isArray(data) ? data : [];
}

export async function getTagByName(name) {
  const target = String(name).replace(/^#/, "");
  const tags = await getTags("popular");

  return (
    tags.find(
      (tag) => String(tag.name ?? "").replace(/^#/, "") === target
    ) ?? null
  );
}

export async function signup(payload) {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      name: payload.name,
      birthday: payload.birthday,
      age_visibility: payload.ageVisibility ?? false,
      area: payload.area,
      profile: payload.profile,
      icon_url: payload.iconUrl ?? null,
    }),
  });

  const data = await readJson(res);
  return {
    success: true,
    user: data.user,
  };
}
export async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await readJson(res);

  // 現在のbackendは session.access_token を返す。
  // 旧形式の accessToken にも対応する。
  const accessToken =
    data?.accessToken ?? data?.session?.access_token ?? null;

  if (!accessToken) {
    throw new Error("ログイン用のアクセストークンを取得できませんでした。");
  }

  localStorage.setItem("accessToken", accessToken);

  const profile = data?.user ?? null;

  if (!profile) {
    throw new Error("ログインしたユーザー情報を取得できませんでした。");
  }

  // アプリでは public.users.user_id をユーザーIDとして使う。
  // Supabase AuthのUUIDである users.id はそのままアプリIDにはしない。
  const user = {
    ...profile,
    id: profile.user_id ?? profile.userId ?? profile.id,
    userId: profile.user_id ?? profile.userId ?? profile.id,
    user_id: profile.user_id ?? profile.userId ?? profile.id,
    name: profile.name ?? profile.display_name ?? "",
    displayName:
      profile.displayName ?? profile.display_name ?? profile.name ?? "",
    icon: profile.icon ?? profile.icon_url ?? "🙂",
    area: profile.area ?? null,
    birthday: profile.birthday ?? null,
  };

  localStorage.setItem("user", JSON.stringify(user));

  return {
    success: true,
    user,
    accessToken,
  };
}

export async function getDummyUsers() {
  const res = await fetch(`${API_BASE_URL}/users`);
  return readJson(res);
}

export async function loginByUserId(userId) {
  const user = await getUserById(userId);

  if (!user) {
    return {
      success: false,
      user: null,
      message: "ユーザーが見つかりません",
    };
  }

  // ログインしたユーザーを毎回上書き保存する。
  // これで以前ログインした別ユーザーが残り続けるのを防ぐ。
  localStorage.setItem("user", JSON.stringify(user));

  return { success: true, user };
}
