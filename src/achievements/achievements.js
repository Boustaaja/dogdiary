import { achievementGroups } from "./achievementData.js";
import "./achievements.css";
import "./allAchievements.css";
import { supabase } from "../supabase.js";

const lockIcon = `
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="4" y="10" width="16" height="11" rx="2"></rect>
    <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
  </svg>
`;

const personalAchievementIds = [
  "long-walk",
  "three-long-walks",
  "five-long-walks",
  "ten-long-walks",
];

const UNLOCKED_ACHIEVEMENTS_KEY = "dogdiary-unlocked-achievements";

function getUnlockedAchievements() {
  try {
    return JSON.parse(localStorage.getItem(UNLOCKED_ACHIEVEMENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function isAchievementUnlocked(id) {
  return getUnlockedAchievements().includes(id);
}

async function getUnlockedDailyTaskIds() {
  const unlocked = new Set();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Kirjautuneen käyttäjän haku epäonnistui:", userError);
    return unlocked;
  }

  const email = user.email?.toLowerCase();

  let completionField;

  if (email === "boustaaja@hotmail.com") {
    completionField = "katja_completed";
  } else if (email === "godek_88@hotmail.com") {
    completionField = "antti_completed";
  } else {
    return unlocked;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("diary_members")
    .select("diary_id")
    .single();

  if (membershipError || !membership) {
    console.error("Päiväkirjan hakeminen epäonnistui:", membershipError);
    return unlocked;
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("daily_tasks")
    .select("task_id, katja_completed, antti_completed")
    .eq("diary_id", membership.diary_id);

  if (tasksError) {
    console.error("Päivätehtävien hakeminen epäonnistui:", tasksError);
    return unlocked;
  }

  for (const task of tasks ?? []) {
    if (task[completionField]) {
      unlocked.add(task.task_id);
    }
  }

  return unlocked;
}

function saveUnlockedAchievement(id) {
  const unlocked = getUnlockedAchievements();

  if (!unlocked.includes(id)) {
    unlocked.push(id);
    localStorage.setItem(UNLOCKED_ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
  }
}

function getDailyAchievementCounts(walks, brainworkEntries) {
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

    const successfulDay =
      dayWalks.length >= 3 &&
      creditedMinutes >= 90 &&
      mealPoints >= 3 &&
      brainworkMinutes >= 15;

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

function getSuccessfulStreaks(walks, brainworkEntries) {
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

    const successfulDay =
      dayWalks.length >= 3 &&
      creditedMinutes >= 90 &&
      mealPoints >= 3 &&
      brainworkMinutes >= 15;

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

function getAchievementProgress(badge, walks, brainworkEntries, walker = null) {
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

  if (
    ["three-day-streak", "five-day-streak", "seven-day-streak"].includes(
      badge.id,
    )
  ) {
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

    const unlocked =
      isAchievementUnlocked(`${walker}-${badge.id}`) || ownedCount > 0;

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

function renderBadge(
  badge,
  walks,
  brainworkEntries,
  walker = null,
  detailed = false,
  dailyTaskUnlocks = new Set(),
) {
  const isDailyTask = ["forest", "dog-day", "dog-park"].includes(badge.id);

  const progress = isDailyTask
    ? {
        earned: 0,
        ownedCount: 0,
        target: 1,
        unlocked: false,
        unit: "kertaa",
      }
    : getAchievementProgress(badge, walks, brainworkEntries, walker);

  let { earned, ownedCount, target, unlocked, unit } = progress;

  if (isDailyTask) {
    unlocked = dailyTaskUnlocks.has(badge.id);
    earned = unlocked ? 1 : 0;
    ownedCount = earned;
  }

  const iconIsImage =
    typeof badge.icon === "string" && badge.icon.includes(".svg");

  const iconContent = unlocked
    ? iconIsImage
      ? `<img src="${badge.icon}" alt="" class="achievement-image">`
      : badge.icon
    : lockIcon;

  const progressPercent =
    target > 0 ? Math.min(100, (earned / target) * 100) : 0;

  return `
    <article class="achievement-card ${unlocked ? "is-unlocked" : "is-locked"} ${
      detailed ? "achievement-card-detailed" : ""
    }">
      <div class="achievement-icon">
        ${iconContent}
      </div>

${
  unlocked
    ? `<p class="achievement-earned-count">${ownedCount}x</p>`
    : `<p class="achievement-earned-count">0x</p>`
}

      <h4 class="achievement-name">${badge.name}</h4>

${
  detailed
    ? `
      <p class="achievement-description">${badge.description}</p>

      ${
        badge.id !== "good-day" && badge.id !== "long-walk"
          ? `
            <div class="achievement-progress">
              <div class="achievement-progress-label">
                <span>${earned} / ${target}</span>
                <span>${unit}</span>
              </div>
              <div
                class="achievement-progress-track"
                role="progressbar"
                aria-label="Edistyminen: ${badge.name}"
                aria-valuemin="0"
                aria-valuemax="${target}"
                aria-valuenow="${Math.min(earned, target)}"
              >
                <div
                  class="achievement-progress-fill"
                  style="width: ${progressPercent}%"
                ></div>
              </div>
            </div>
          `
          : ""
      }
    `
    : `
      <p class="achievement-status">
        ${unlocked ? "Avattu" : "Lukittu"}
      </p>
    `
}
    </article>
  `;
}

function renderBadgeGrid(
  badges,
  walks,
  brainworkEntries,
  walker = null,
  groupId = "",
  dailyTaskUnlocks = new Set(),
) {
  const displayBadges = [
    ...badges.slice(0, 6),
    ...Array.from({ length: Math.max(0, 6 - badges.length) }, (_, index) => ({
      id: `empty-${groupId}-${index}`,
      name: "Lukittu palkinto",
      description: "",
      icon: "",
      milestone: null,
      isEmpty: true,
    })),
  ];

  return displayBadges
    .map((badge) =>
      renderBadge(
        badge,
        walks,
        brainworkEntries,
        walker,
        false,
        dailyTaskUnlocks,
      ),
    )
    .join("");
}

export async function renderAchievementShowcase(
  walks = [],
  brainworkEntries = [],
) {
  const container = document.querySelector("#achievements-showcase");
  if (!container) return;

  const dailyTaskUnlocks = await getUnlockedDailyTaskIds();

  const sharedGroups = achievementGroups.filter(
    (group) => group.id !== "personal" && group.id !== "daily-tasks",
  );

  const personalGroup = achievementGroups.find(
    (group) => group.id === "personal",
  );

  const sharedHtml = sharedGroups
    .map(
      (group) => `
        <section class="achievement-group">
          <h4 class="achievement-group-title">${group.title}</h4>
          <div class="achievement-grid">
            ${renderBadgeGrid(
              group.badges,
              walks,
              brainworkEntries,
              null,
              group.id,
              dailyTaskUnlocks,
            )}
          </div>
        </section>
      `,
    )
    .join("");

  const personalHtml = personalGroup
    ? ["Katja", "Antti"]
        .map(
          (walker) => `
            <section class="achievement-group">
              <h4 class="achievement-group-title">${walker}</h4>
              <div class="achievement-grid">

${renderBadgeGrid(
  [
    ...personalGroup.badges,
    ...(achievementGroups.find((group) => group.id === "daily-tasks")?.badges ??
      []),
  ],
  walks,
  brainworkEntries,
  walker,
  walker.toLowerCase(),
  dailyTaskUnlocks,
)}
              </div>
            </section>
          `,
        )
        .join("")
    : "";

  container.innerHTML = `
    <section class="achievements-panel" aria-labelledby="achievements-title">
      <div class="achievements-header">
        <h3 class="achievements-title" id="achievements-title">
          Palkinnot
        </h3>

        <button
          type="button"
          class="achievements-link"
          id="show-all-achievements"
        >
          Katso kaikki →
        </button>
      </div>

      ${sharedHtml}
      ${personalHtml}
    </section>
  `;
}

export async function renderAllAchievements(
  walks = [],
  brainworkEntries = [],
  activeTab = "shared",
) {
  const container = document.querySelector("#all-achievements-content");
  if (!container) return;

  const dailyTaskUnlocks = await getUnlockedDailyTaskIds();

  const isPersonalTab = activeTab === "katja" || activeTab === "antti";
  const walker =
    activeTab === "katja" ? "Katja" : activeTab === "antti" ? "Antti" : null;

  const group = achievementGroups.find((item) =>
    isPersonalTab ? item.id === "personal" : item.id === "shared",
  );

  if (!group) return;

  container.innerHTML = `
    <section class="all-achievements-group">
      <h2 class="all-achievements-group-title">${group.title}</h2>
      <p class="all-achievements-group-description">${group.description}</p>

      <div class="all-achievements-grid">
        ${[
          ...group.badges,
          ...(isPersonalTab
            ? (achievementGroups.find((item) => item.id === "daily-tasks")
                ?.badges ?? [])
            : []),
        ]
          .map((badge) =>
            renderBadge(
              badge,
              walks,
              brainworkEntries,
              walker,
              true,
              dailyTaskUnlocks,
            ),
          )
          .join("")}
      </div>
    </section>
  `;

  document.querySelectorAll("[data-achievement-tab]").forEach((button) => {
    const selected = button.dataset.achievementTab === activeTab;

    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
}
