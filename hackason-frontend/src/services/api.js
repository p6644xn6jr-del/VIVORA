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
  };
}

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");

  return accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
}

function normalizePost(post) {
  const uid = post?.userId ?? post?.user_id;
    return {
    ...post,
    id: post?.id,
    userId: uid,
    userName: post?.userName ?? post?.displayName ?? post?.username ?? null,
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
    createdAt: post?.createdAt ?? post?.created_at ?? null,
    createdAtText: post?.createdAtText ?? (post?.created_at ? new Date(post.created_at).toLocaleString("ja-JP") : "日時不明"),
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

  const contests = list.map(normalizeContest);
  const currentUser = getStoredUser();
  const currentUserId = Number(
    currentUser?.user_id ?? currentUser?.userId ?? currentUser?.id
  );

  if (!Number.isInteger(currentUserId)) {
    return contests;
  }

  return Promise.all(
    contests.map(async (contest) => {
      try {
        const participantData = await getTournamentParticipants(contest.id);
        const participants = Array.isArray(participantData)
          ? participantData
          : (Array.isArray(participantData?.participants)
              ? participantData.participants
              : []);

        const joined = participants.some(
          (participant) =>
            Number(
              participant?.user_id ?? participant?.userId
            ) === currentUserId
        );

        return {
          ...contest,
          joined,
          joinStatus: joined ? "参加中" : null,
        };
      } catch (error) {
        console.error(
          `大会${contest.id}の参加状態取得に失敗しました:`,
          error
        );
        return contest;
      }
    })
  );
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
  const accessToken = localStorage.getItem("accessToken");

  const res = await fetch(
    `${API_BASE_URL}/tournaments/${encodeURIComponent(id)}`,
    {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    }
  );

  if (res.status === 404) return null;
  return normalizeContest(await readJson(res));
}

export async function getTournamentRanking(tournamentId) {
  const res = await fetch(
    `${API_BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/ranking`
  );

  return readJson(res);
}

export async function getJoinedContests() {
  const contests = await getContests();
  return contests.filter(x => x.joinStatus === "参加中" || x.joined === true);
}

export async function joinContest(id) {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error("ログインが必要です");
  }

  const res = await fetch(
    `${API_BASE_URL}/tournaments/${encodeURIComponent(id)}/participants`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return readJson(res);
}

export async function cancelTournamentParticipation(tournamentId) {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error("ログインが必要です");
  }

  const res = await fetch(
    `${API_BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/participants`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
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
  return joinContest(tournamentId);
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
  const accessToken = localStorage.getItem("accessToken");

  const res = await fetch(
    `${API_BASE_URL}/posts/${encodeURIComponent(id)}`,
    {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    }
  );

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

export async function saveRecord({ tournamentId, score }) {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error("ログインが必要です");
  }

  if (tournamentId == null || score == null || !Number.isFinite(Number(score))) {
    throw new Error("大会IDと記録を正しく入力してください。");
  }

  const res = await fetch(`${API_BASE_URL}/record`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      tournamentId: Number(tournamentId),
      score: Number(score),
    }),
  });

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
    body: JSON.stringify(payload),
  });

  const data = await readJson(res);

  const accessToken =
    data?.accessToken ?? data?.session?.access_token ?? null;

  if (accessToken) {
    localStorage.setItem("accessToken", accessToken);
  }

  const profile = data?.user ?? null;
  if (profile) {
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

  return {
    success: true,
    user: await getCurrentUser(),
    accessToken,
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
    session: { access_token: accessToken },
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
