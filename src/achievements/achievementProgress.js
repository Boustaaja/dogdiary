import { achievementGroups } from "./achievementData.js";
import { supabase } from "../supabase.js";

// Achievement progress module: owns the badge rules, streak calculations and unlock state.
// This keeps the logic in one place instead of mixing business rules with DOM rendering.
export const personalAchievementIds = [
  "long-walk",
  "three-long-walks",
  "five-long-walks",
  "ten-long-walks",
];

export const DAILY_TASK_BADGE_IDS = [
  "forest",
  "dog-day",
  "dog-park",
  "camping",
  "water",
  "field",
];

export const UNLOCKED_ACHIEVEMENTS_KEY = "dogdiary-unlocked-achievements";

// Calculate the daily inputs used by the shared successful-day rule.
export function getDaySuccessMetrics(walks, brainworkEntries, dateKey) {
  const dayWalks = walks.filter((walk) => walk.date === dateKey);

  const creditedMinutes = dayWalks.reduce((total, walk) => {
    const ballMinutes = walk.ballMinutes ?? (walk.ball ? walk.duration : 0);
    const fastMinutes = walk.fastMinutes ?? 0;

    return (
      total +
      Number(walk.duration) +
      Number(ballMinutes) +
      Number(fastMinutes)
    );
  }, 0);

  const mealPoints = dayWalks.reduce((total, walk) => {
    if (walk.portion === "full") return total + 1;
    if (walk.portion === "half") return total + 0.5;
    return total;
  }, 0);

  const brainworkMinutes = brainworkEntries
    .filter((entry) => entry.date === dateKey)
    .reduce((total, entry) => total + Number(entry.minutes), 0);

  return { dayWalks, creditedMinutes, mealPoints, brainworkMinutes };
}

// A successful day must meet the walk count, credited minutes, meal and brainwork targets.
export function isSuccessfulDay(walks, brainworkEntries, dateKey) {
  const { dayWalks, creditedMinutes, mealPoints, brainworkMinutes } =
    getDaySuccessMetrics(walks, brainworkEntries, dateKey);

  return (
    dayWalks.length >= 3 &&
    creditedMinutes >= 90 &&
    mealPoints >= 3 &&
    brainworkMinutes >= 15
  );
}

// Read the browser's persisted unlock list; older or invalid storage is treated as empty.
function getUnlockedAchievements() {
  try {
    return JSON.parse(localStorage.getItem(UNLOCKED_ACHIEVEMENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

// Check whether an achievement id has already been persisted as unlocked.
function isAchievementUnlocked(id) {
  return getUnlockedAchievements().includes(id);
}

// Store a newly unlocked achievement once so it remains unlocked on later visits.
function saveUnlockedAchievement(id) {
  const unlocked = getUnlockedAchievements();

  if (!unlocked.includes(id)) {
    unlocked.push(id);
    localStorage.setItem(UNLOCKED_ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
  }
}

// Count completed daily-task types for each walker across the shared diary.
export async function getDailyTaskCounts() {
  const counts = {
    Katja: {
      forest: 0,
      "dog-day": 0,
      "dog-park": 0,
      camping: 0,
      water: 0,
      field: 0,
    },
    Antti: {
      forest: 0,
      "dog-day": 0,
      "dog-park": 0,
      camping: 0,
      water: 0,
      field: 0,
    },
  };

  const { data: membership, error: membershipError } = await supabase
    .from("diary_members")
    .select("diary_id")
    .single();

  if (membershipError || !membership) {
    console.error("Päiväkirjan hakeminen epäonnistui:", membershipError);
    return counts;
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("daily_tasks")
    .select("task_id, katja_completed, antti_completed")
    .eq("diary_id", membership.diary_id);

  if (tasksError) {
    console.error("Päivätehtävien hakeminen epäonnistui:", tasksError);
    return counts;
  }

  for (const task of tasks ?? []) {
    if (!(task.task_id in counts.Katja)) continue;

    if (task.katja_completed) {
      counts.Katja[task.task_id]++;
    }

    if (task.antti_completed) {
      counts.Antti[task.task_id]++;
    }
  }

  return counts;
}

// Count qualifying days and milestone streaks, excluding the still-in-progress current day.
export function getDailyAchievementCounts(walks, brainworkEntries) {
  const counts = {
    "good-day": 0,
    "three-day-streak": 0,
    "five-day-streak": 0,
    "seven-day-streak": 0,
  };

  const today = new Date().toLocaleDateString("sv-SE");
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const dates = [
    ...walks.map((walk) => walk.date),
    ...brainworkEntries.map((entry) => entry.date),
  ].filter((date) => date && date <= yesterdayKey);

  if (dates.length === 0) return counts;

  let currentDate = new Date(`${dates.sort()[0]}T00:00:00Z`);
  let streak = 0;

  while (currentDate <= yesterday) {
    const dateKey = currentDate.toISOString().slice(0, 10);
    const successfulDay = isSuccessfulDay(walks, brainworkEntries, dateKey);

    if (successfulDay) {
      counts["good-day"]++;
      streak++;

      if (streak % 3 === 0) counts["three-day-streak"]++;
      if (streak % 5 === 0) counts["five-day-streak"]++;
      if (streak % 7 === 0) counts["seven-day-streak"]++;
    } else {
      streak = 0;
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return counts;
}

// Return the current and longest successful-day streak up to yesterday.
export function getSuccessfulStreaks(walks, brainworkEntries) {
  const today = new Date().toLocaleDateString("sv-SE");
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const dates = [
    ...walks.map((walk) => walk.date),
    ...brainworkEntries.map((entry) => entry.date),
  ].filter((date) => date && date <= yesterdayKey);

  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let currentDate = new Date(`${dates.sort()[0]}T00:00:00Z`);
  let streak = 0;
  let longestStreak = 0;

  while (currentDate <= yesterday) {
    const dateKey = currentDate.toISOString().slice(0, 10);
    const successfulDay = isSuccessfulDay(walks, brainworkEntries, dateKey);

    if (successfulDay) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return {
    currentStreak: streak,
    longestStreak,
  };
}

// Return earned progress for the badge type, preserving unlock history where applicable.
export function getAchievementProgress(badge, walks, brainworkEntries, walker = null) {
  if (badge.isEmpty) {
    return {
      earned: 0,
      ownedCount: 0,
      target: 1,
      unlocked: false,
      unit: "palkintoa",
    };
  }

  const dailyCounts = getDailyAchievementCounts(walks, brainworkEntries);

  if (badge.id === "good-day") {
    const ownedCount = dailyCounts["good-day"];

    return {
      earned: ownedCount,
      ownedCount,
      target: Math.max(1, ownedCount),
      unlocked: ownedCount > 0 || isAchievementUnlocked(badge.id),
      unit: "päivää",
    };
  }

  if (["three-day-streak", "five-day-streak", "seven-day-streak"].includes(badge.id)) {
    const target = badge.milestone;
    const ownedCount = dailyCounts[badge.id];
    const { currentStreak } = getSuccessfulStreaks(walks, brainworkEntries);

    const earned = currentStreak === 0 ? 0 : currentStreak % target || target;
    const unlocked = isAchievementUnlocked(badge.id) || ownedCount > 0;

    if (unlocked) {
      saveUnlockedAchievement(badge.id);
    }

    return {
      earned,
      ownedCount,
      target,
      unlocked,
      unit: "päivää putkeen",
    };
  }

  if (walker && personalAchievementIds.includes(badge.id)) {
    const longWalkCount = walks.filter(
      (walk) => walk.walker === walker && Number(walk.duration) >= 60,
    ).length;

    if (badge.id === "long-walk") {
      const unlocked =
        isAchievementUnlocked(`${walker}-${badge.id}`) || longWalkCount > 0;

      if (unlocked) {
        saveUnlockedAchievement(`${walker}-${badge.id}`);
      }

      return {
        earned: longWalkCount,
        ownedCount: longWalkCount,
        target: Math.max(1, longWalkCount),
        unlocked,
        unit: "lenkkiä",
      };
    }

    const target = badge.milestone;
    const ownedCount = Math.floor(longWalkCount / target);
    const remainder = longWalkCount % target;
    const earned = remainder === 0 && ownedCount > 0 ? target : remainder;
    const unlocked = isAchievementUnlocked(`${walker}-${badge.id}`) || ownedCount > 0;

    if (unlocked) {
      saveUnlockedAchievement(`${walker}-${badge.id}`);
    }

    return {
      earned,
      ownedCount,
      target,
      unlocked,
      unit: "lenkkiä",
    };
  }

  return {
    earned: 0,
    ownedCount: 0,
    target: badge.milestone ?? 1,
    unlocked: false,
    unit: "kertaa",
  };
}

// Filter personal and daily-task badges to the ones this walker has unlocked.
export function getUnlockedPersonalBadges(walker, walks, brainworkEntries, dailyTaskCounts) {
  const dailyTaskGroup = achievementGroups.find((group) => group.id === "daily-tasks");

  const dailyTaskIds = new Set(
    (dailyTaskGroup?.badges ?? []).map((badge) => badge.id),
  );

  return getPersonalShowcaseBadges().filter((badge) => {
    if (dailyTaskIds.has(badge.id)) {
      return Number(dailyTaskCounts?.[walker]?.[badge.id] ?? 0) > 0;
    }

    const progress = getAchievementProgress(
      badge,
      walks,
      brainworkEntries,
      walker,
    );

    return progress.unlocked;
  });
}

// Adapt each badge's progress into the common shape used by the UI renderer.
export function getBadgeProgressState(badge, walks, brainworkEntries, walker = null, dailyTaskCounts = {}) {
  const isDailyTask = DAILY_TASK_BADGE_IDS.includes(badge.id);

  if (!isDailyTask) {
    return getAchievementProgress(badge, walks, brainworkEntries, walker);
  }

  const ownedCount = Number(dailyTaskCounts[walker]?.[badge.id] ?? 0);

  return {
    earned: ownedCount,
    ownedCount,
    target: Math.max(1, ownedCount),
    unlocked: ownedCount > 0,
    unit: "kertaa",
  };
}

// Return the canonical badges available in a personal showcase.
export function getPersonalShowcaseBadges() {
  const personalGroup = achievementGroups.find((group) => group.id === "personal");
  const dailyTaskGroup = achievementGroups.find((group) => group.id === "daily-tasks");

  return [...(personalGroup?.badges ?? []), ...(dailyTaskGroup?.badges ?? [])];
}
