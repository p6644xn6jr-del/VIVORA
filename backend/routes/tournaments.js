const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const authenticateUser = require("../middleware/auth");
const { buildRanking, formatScore } = require("../utils/ranking");
const {
  getTournamentClosedMessage,
  getTournamentStatus,
  isTournamentClosed,
} = require("../utils/tournamentStatus");
const { buildTitleAwardRows, selectTitleWinners } = require("../utils/titleAwards");
const { canFinalizeTournament } = require("../utils/admin");
const { buildResultSummary } = require("../utils/resultSummary");
require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function getCurrentUserId(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authHeader.split(" ")[1];
  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken);

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("user_id")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.user_id ?? null;
}

async function getTournamentOr404(id, res) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    res.status(500).json({
      message: "大会詳細の取得に失敗しました",
      error: error.message
    });
    return null;
  }

  if (!data) {
    res.status(404).json({
      message: "大会が見つかりません"
    });
    return null;
  }

  return data;
}

async function getTournamentRanking(tournament) {
  const { data: records, error } = await supabase
    .from("records")
    .select("*, users(display_name, icon_url), posts(image_url, media, content)")
    .eq("tournament_id", tournament.id);

  if (error) {
    throw error;
  }

  return buildRanking(records ?? [], tournament);
}

async function countTournamentParticipants(tournamentId, fallback = 0) {
  const { count, error } = await supabase
    .from("tournament_participants")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (error) {
    throw error;
  }

  return count ?? Number(fallback ?? 0);
}

async function addParticipantCounts(tournaments) {
  return Promise.all(
    (tournaments ?? []).map(async (tournament) => {
      const participantsCount = await countTournamentParticipants(
        tournament.id,
        tournament.participants
      );

      return {
        ...tournament,
        status: getTournamentStatus(tournament),
        participants: participantsCount,
        participantsCount,
      };
    })
  );
}

function toResultTournament(tournament, rankingItem = null) {
  return {
    ...tournament,
    status: getTournamentStatus(tournament),
    image: tournament.image_url ?? "",
    participants: tournament.participantsCount ?? tournament.participants ?? 0,
    myRank: rankingItem?.rank ?? null,
    myBestScore: rankingItem?.scoreText ?? null,
    myBestRecordId: rankingItem?.recordId ?? null,
  };
}

async function getBestRankForUser(tournaments, userId) {
  const ranks = [];

  for (const tournament of tournaments) {
    const ranking = await getTournamentRanking(tournament);
    const userRank = ranking.find(
      (item) => Number(item.userId) === Number(userId)
    );

    if (userRank?.rank) {
      ranks.push(Number(userRank.rank));
    }
  }

  return ranks.length ? Math.min(...ranks) : null;
}

// 大会一覧
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return res.status(500).json({
      message: "大会一覧の取得に失敗しました",
      error: error.message
    });
  }

  try {
    return res.json(await addParticipantCounts(data ?? []));
  } catch (countError) {
    return res.status(500).json({
      message: "大会参加人数の取得に失敗しました",
      error: countError.message
    });
  }
});

// 人気大会
router.get("/popular", async (req, res) => {
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: "人気大会の取得に失敗しました",
      error: error.message
    });
  }

  let withCounts = [];

  try {
    withCounts = await addParticipantCounts(tournaments ?? []);
  } catch (countError) {
    return res.status(500).json({
      message: "人気大会の参加人数取得に失敗しました",
      error: countError.message
    });
  }

  withCounts.sort(
    (a, b) => Number(b.participantsCount ?? 0) - Number(a.participantsCount ?? 0)
  );

  return res.json(withCounts.slice(0, 10));
});

router.get("/results/summary", async (req, res) => {
  const currentUserId = await getCurrentUserId(req);

  try {
    const { data: tournaments, error: tournamentsError } = await supabase
      .from("tournaments")
      .select("*")
      .order("end_at", { ascending: false, nullsFirst: false });

    if (tournamentsError) {
      throw tournamentsError;
    }

    const finishedTournaments = await addParticipantCounts(
      (tournaments ?? []).filter(
        (tournament) => getTournamentStatus(tournament) === "finished"
      )
    );

    let joinedRows = [];
    let recentResults = [];
    let titleCount = 0;
    let bestRank = null;

    if (currentUserId) {
      const { data: joinedData, error: joinedError } = await supabase
        .from("tournament_participants")
        .select("*, tournaments(*)")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (joinedError) {
        throw joinedError;
      }

      joinedRows = joinedData ?? [];
      const joinedFinished = joinedRows
        .map((item) => item.tournaments)
        .filter(
          (tournament) =>
            tournament && getTournamentStatus(tournament) === "finished"
        );

      recentResults = await Promise.all(
        joinedFinished.slice(0, 3).map(async (tournament) => {
          const participantsCount = await countTournamentParticipants(
            tournament.id,
            tournament.participants
          );
          const ranking = await getTournamentRanking(tournament);
          const myRanking = ranking.find(
            (item) => Number(item.userId) === Number(currentUserId)
          );

          return toResultTournament(
            {
              ...tournament,
              participantsCount,
            },
            myRanking
          );
        })
      );

      const { count, error: titleCountError } = await supabase
        .from("user_titles")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUserId);

      if (titleCountError) {
        throw titleCountError;
      }

      titleCount = count ?? 0;
      bestRank = await getBestRankForUser(joinedFinished, currentUserId);
    }

    const { data: titleAwards, error: titlesError } = await supabase
      .from("user_titles")
      .select("*, users(display_name, icon_url), titles(*), tournaments(*), records(score, unit)")
      .order("awarded_at", { ascending: false })
      .limit(10);

    if (titlesError) {
      throw titlesError;
    }

    return res.json(
      buildResultSummary({
        recentResults,
        winners: (titleAwards ?? []).map((award) => ({
          id: award.id,
          userId: award.user_id,
          userName: award.users?.display_name ?? "",
          userIcon: award.users?.icon_url ?? "",
          tournamentId: award.tournament_id,
          tournamentTitle: award.tournaments?.title ?? "",
          titleName: award.titles?.name ?? "",
          titleImageUrl: award.titles?.image_url ?? "",
          rank: award.rank,
          score: award.records?.score ?? null,
          unit: award.records?.unit ?? award.tournaments?.unit ?? "",
          scoreText:
            award.records?.score == null
              ? null
              : formatScore(
                  award.records.score,
                  award.tournaments,
                  award.records?.unit ?? award.tournaments?.unit ?? ""
                ),
          awardedAt: award.awarded_at,
        })),
        history: finishedTournaments.slice(0, 5).map((tournament) =>
          toResultTournament(tournament)
        ),
        joinedCount: joinedRows.length,
        titleCount,
        bestRank,
      })
    );
  } catch (error) {
    return res.status(500).json({
      message: "大会結果サマリーの取得に失敗しました",
      error: error.message,
    });
  }
});

// 大会作成
router.post("/", authenticateUser, async (req, res) => {
  const {
    title,
    category,
    participants,
    description,
    rule,
    start_at,
    end_at,
    official,
    image_url,
    type,
    target,
    unit,
    direction,
    decimal_places,
  } = req.body;

  if (!title || !category) {
    return res.status(400).json({
      message: "title と category は必須です"
    });
  }

  const { data, error } = await supabase
    .from("tournaments")
    .insert([
      {
        title,
        category,
        participants: participants ?? 0,
        description,
        rule,
        start_at,
        end_at,
        created_by: req.userId,
        official: official ?? false,
        image_url,
        type,
        target,
        unit,
        direction,
        decimal_places: decimal_places ?? 0,
      }
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      message: "大会の登録に失敗しました",
      error: error.message
    });
  }

  return res.status(201).json(data);
});

// 大会詳細
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  const data = await getTournamentOr404(id, res);
  if (!data) return;

  const currentUserId = await getCurrentUserId(req);
  const [{ count: participantsCount }, { data: title }, { data: relatedPosts }] =
    await Promise.all([
      supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", id),
      supabase
        .from("titles")
        .select("*")
        .eq("tournament_id", id)
        .maybeSingle(),
      supabase
        .from("posts")
        .select("*")
        .eq("tournament_id", id)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

  let joinedByMe = false;

  if (currentUserId) {
    const { data: participation } = await supabase
      .from("tournament_participants")
      .select("id")
      .eq("tournament_id", id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    joinedByMe = !!participation;
  }

  const safeParticipantsCount = participantsCount ?? Number(data.participants ?? 0);

  return res.json({
    ...data,
    status: getTournamentStatus(data),
    participants: safeParticipantsCount,
    participantsCount: safeParticipantsCount,
    joinedByMe,
    titleAward: title ?? null,
    relatedPosts: relatedPosts ?? [],
  });
});

// 大会参加登録
router.post("/:id/participants", authenticateUser, async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  const tournament = await getTournamentOr404(tournamentId, res);
  if (!tournament) return;

  if (isTournamentClosed(tournament)) {
    return res.status(409).json({
      message: getTournamentClosedMessage(tournament)
    });
  }

  const { data, error } = await supabase
    .from("tournament_participants")
    .insert([
      {
        tournament_id: tournamentId,
        user_id: req.userId
      }
    ])
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      const participantsCount = await countTournamentParticipants(tournamentId);

      return res.status(200).json({
        message: "すでに参加しています",
        participant: null,
        participantsCount,
      });
    }

    console.error("参加登録エラー:", error);

    return res.status(500).json({
      message: "大会への参加登録に失敗しました",
      error: error.message
    });
  }

  const participantsCount = await countTournamentParticipants(tournamentId);

  return res.status(201).json({
    message: "大会に参加しました",
    participant: data,
    participantsCount,
  });
});

// 大会参加キャンセル
router.delete("/:id/participants", authenticateUser, async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  const { error } = await supabase
    .from("tournament_participants")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("user_id", req.userId);

  if (error) {
    console.error("参加キャンセルエラー:", error);
    return res.status(500).json({
      message: "大会参加のキャンセルに失敗しました",
      error: error.message
    });
  }

  const participantsCount = await countTournamentParticipants(tournamentId);

  return res.json({
    message: "大会の参加をキャンセルしました",
    participantsCount,
  });
});

// 大会参加者一覧
router.get("/:id/participants", async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("tournament_participants")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (error) {
    console.error("参加者一覧取得エラー:", error);
    return res.status(500).json({
      message: "参加者一覧の取得に失敗しました",
      error: error.message
    });
  }

  return res.json(data);
});

// 大会ごとの優勝称号画像
router.get("/:id/title", async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("titles")
    .select("*")
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      message: "称号の取得に失敗しました",
      error: error.message
    });
  }

  return res.json(data);
});

// 大会ごとのランキング取得API
router.get("/:id/ranking", async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  const tournament = await getTournamentOr404(tournamentId, res);
  if (!tournament) return;

  try {
    const ranking = await getTournamentRanking(tournament);
    return res.json(ranking);
  } catch (error) {
    return res.status(500).json({
      message: "ランキングの取得に失敗しました",
      error: error.message
    });
  }
});

// 大会結果を確定し、1位ユーザーに画像付き称号を付与
router.post("/:id/finalize", authenticateUser, async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  const tournament = await getTournamentOr404(tournamentId, res);
  if (!tournament) return;

  if (!canFinalizeTournament(req.user)) {
    return res.status(403).json({
      message: "大会結果を確定する権限がありません"
    });
  }

  try {
    const ranking = await getTournamentRanking(tournament);
    const winners = selectTitleWinners(ranking);

    if (!winners.length) {
      return res.status(400).json({
        message: "称号を付与できる記録がありません"
      });
    }

    const { data: title, error: titleError } = await supabase
      .from("titles")
      .select("*")
      .eq("tournament_id", tournamentId)
      .maybeSingle();

    if (titleError) {
      throw titleError;
    }

    if (!title) {
      return res.status(404).json({
        message: "この大会の称号画像が設定されていません"
      });
    }

    const awards = buildTitleAwardRows(winners, title, tournamentId);

    const { data: userTitles, error: awardError } = await supabase
      .from("user_titles")
      .upsert(awards, { onConflict: "user_id,title_id,tournament_id" })
      .select();

    if (awardError) {
      throw awardError;
    }

    await supabase
      .from("tournaments")
      .update({ result_finalized_at: new Date().toISOString() })
      .eq("id", tournamentId);

    return res.json({
      message: "大会結果を確定し、称号を付与しました",
      winner: winners[0],
      winners,
      title,
      userTitles: userTitles ?? [],
      ranking,
    });
  } catch (error) {
    return res.status(500).json({
      message: "大会結果の確定に失敗しました",
      error: error.message
    });
  }
});

module.exports = router;
