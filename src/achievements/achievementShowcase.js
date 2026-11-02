import { achievementGroups } from "./achievementData.js";
import lockImage from "../assets/Images/Lock.svg";
import {
  DAILY_TASK_BADGE_IDS,
  getAchievementProgress,
  getBadgeProgressState,
  getDailyTaskCounts,
  getUnlockedPersonalBadges,
} from "./achievementProgress.js";

// Achievement showcase UI: renders the compact diary badge cards and manages slot selection.
// The DOM layer stays separate from the badge rules so display changes do not touch the logic rules.
import {
  getAchievementShowcasePreferences,
  getCurrentAchievementUser,
  saveAchievementShowcasePreferences,
} from "./achievementStorage.js";

// Reuse the project's lock artwork anywhere an achievement is still locked.
const lockIcon = `<img src="${lockImage}" alt="" aria-hidden="true" class="achievement-lock-icon">`;

// Normalize saved choices to exactly six slots for rendering and picker operations.
function getAchievementShowcaseSlots(savedBadgeIds) {
  const slots = Array.isArray(savedBadgeIds) ? savedBadgeIds.slice(0, 6) : [];

  while (slots.length < 6) {
    slots.push("");
  }

  return slots;
}

// Build the modal for choosing unlocked badges and prevent duplicates across slots.
function openAchievementPicker(
  walker,
  slotIndex,
  unlockedBadges,
  slots,
  onSelect,
) {
  document.querySelector(".achievement-picker-backdrop")?.remove();

  const usedBadgeIds = new Set(
    slots.map((id, index) => (index === slotIndex ? "" : id)).filter(Boolean),
  );

  const backdrop = document.createElement("div");
  backdrop.className = "achievement-picker-backdrop";

  backdrop.innerHTML = `
    <div
      class="achievement-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-picker-title"
    >
      <div class="achievement-picker-header">
        <h3 class="achievement-picker-title" id="achievement-picker-title">
          Valitse ${walker}n palkinto
        </h3>
        <button
          type="button"
          class="achievement-picker-close"
          aria-label="Sulje"
        >×</button>
      </div>
      <div class="achievement-picker-grid"></div>
    </div>
  `;

  const grid = backdrop.querySelector(".achievement-picker-grid");

  // Add each unlocked badge as a selectable option; already-used badges are disabled.
  unlockedBadges.forEach((badge) => {
    const alreadyUsed = usedBadgeIds.has(badge.id);
    const option = document.createElement("button");

    option.type = "button";
    option.className = "achievement-picker-option";
    option.disabled = alreadyUsed;

    const image = document.createElement("img");
    image.src = badge.icon;
    image.alt = "";

    const name = document.createElement("p");
    name.className = "achievement-picker-option-name";
    name.textContent = badge.name;

    option.append(image, name);

    option.addEventListener("click", async () => {
      const success = await onSelect(badge.id);

      if (success) {
        backdrop.remove();
      }
    });

    grid.appendChild(option);
  });

  // Allow closing the picker from its button, the backdrop, or the Escape key.
  const closeButton = backdrop.querySelector(".achievement-picker-close");
  closeButton.addEventListener("click", () => backdrop.remove());

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) backdrop.remove();
  });

  document.addEventListener("keydown", function handleEscape(event) {
    if (event.key === "Escape") {
      backdrop.remove();
      document.removeEventListener("keydown", handleEscape);
    }
  });

  document.body.appendChild(backdrop);
}

// Render one badge card with its lock state and optional detailed progress bar.
function renderBadge(
  badge,
  walks,
  brainworkEntries,
  walker = null,
  detailed = false,
  dailyTaskCounts = {},
) {
  const isDailyTask = DAILY_TASK_BADGE_IDS.includes(badge.id);

  const progress = getBadgeProgressState(
    badge,
    walks,
    brainworkEntries,
    walker,
    dailyTaskCounts,
  );
  const { earned, ownedCount, target, unlocked, unit } = progress;

  const iconIsImage =
    typeof badge.icon === "string" && badge.icon.includes(".svg");

  const iconContent = unlocked
    ? iconIsImage
      ? `<img src="${badge.icon}" alt="" class="achievement-image" data-badge-id="${badge.id}">`
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
        !isDailyTask && badge.id !== "good-day" && badge.id !== "long-walk"
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

// Fill a six-card showcase grid, adding placeholders if the group has fewer badges.
function renderBadgeGrid(
  badges,
  walks,
  brainworkEntries,
  walker = null,
  groupId = "",
  dailyTaskCounts = {},
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
        dailyTaskCounts,
      ),
    )
    .join("");
}

// Render one walker's six personal slots, preserving valid saved choices where possible.
function renderPersonalShowcaseSlots(
  walker,
  unlockedBadges,
  savedBadgeIds,
  canEdit,
  walks,
  brainworkEntries,
  dailyTaskCounts,
) {
  const slots = getAchievementShowcaseSlots(savedBadgeIds);
  const usedIds = new Set(
    slots.filter((id) => unlockedBadges.some((badge) => badge.id === id)),
  );

  return slots
    .map((savedId, slotIndex) => {
      let badge = unlockedBadges.find((item) => item.id === savedId);

      if (!badge) {
        badge = unlockedBadges.find((item) => !usedIds.has(item.id));

        if (badge) {
          usedIds.add(badge.id);
        }
      }

      const icon = badge
        ? `<img class="achievement-image" data-badge-id="${badge.id}" src="${badge.icon}" alt="">`
        : lockIcon;

      const name = badge?.name ?? "Lukittu palkinto";

      let ownedCount = 0;

      if (badge) {
        const progress = getBadgeProgressState(
          badge,
          walks,
          brainworkEntries,
          walker,
          dailyTaskCounts,
        );

        ownedCount = progress.ownedCount;
      }

      return `
        <div class="achievement-card ${badge ? "is-unlocked" : "is-locked"}">
          <button
            type="button"
            class="achievement-slot-trigger"
            data-walker="${walker}"
            data-slot-index="${slotIndex}"
            aria-label="Vaihda ${walker}n palkinto: ${name}"
            ${canEdit && badge ? "" : "disabled"}
          >
            <div class="achievement-icon">
              ${icon}
            </div>
          </button>

          <p class="achievement-earned-count">${ownedCount}x</p>
          <p class="achievement-name">${name}</p>
        </div>
      `;
    })
    .join("");
}

// Open the picker for the clicked slot and persist a selection or swap.
async function handleAchievementSlotClick(
  event,
  walks,
  brainworkEntries,
  dailyTaskCounts,
) {
  const button = event.target.closest(".achievement-slot-trigger");
  if (!button) return;

  const walker = button.dataset.walker;
  const slotIndex = Number(button.dataset.slotIndex);

  const user = await getCurrentAchievementUser();

  if (!user || walker !== user.walker) return;

  const unlockedBadges = getUnlockedPersonalBadges(
    walker,
    walks,
    brainworkEntries,
    dailyTaskCounts,
  );

  const savedIds = await getAchievementShowcasePreferences(
    user.diaryId,
    walker,
  );

  const slots = getAchievementShowcaseSlots(savedIds);

  openAchievementPicker(
    walker,
    slotIndex,
    unlockedBadges,
    slots,
    // Re-read saved choices before applying the selection to avoid stale slot data.
    async (badgeId) => {
      const latestSavedIds = await getAchievementShowcasePreferences(
        user.diaryId,
        walker,
      );

      const latestSlots = getAchievementShowcaseSlots(latestSavedIds);

      const otherIndex = latestSlots.findIndex(
        (id, index) => index !== slotIndex && id === badgeId,
      );

      if (otherIndex !== -1) {
        const currentBadgeId = latestSlots[slotIndex];

        latestSlots[slotIndex] = badgeId;
        latestSlots[otherIndex] = currentBadgeId;
      } else {
        latestSlots[slotIndex] = badgeId;
      }

      const saved = await saveAchievementShowcasePreferences(
        user.userId,
        user.diaryId,
        walker,
        latestSlots,
      );

      if (saved) {
        await renderAchievementShowcase(walks, brainworkEntries);
      }

      return saved;
    },
  );
}

// Render shared achievements and both walkers' editable/read-only showcase slots.
export async function renderAchievementShowcase(walks = [], brainworkEntries = []) {
  const container = document.querySelector("#achievements-showcase");
  if (!container) return;

  const dailyTaskCounts = await getDailyTaskCounts();
  const currentUser = await getCurrentAchievementUser();

  const sharedGroups = achievementGroups.filter(
    (group) => group.id !== "personal" && group.id !== "daily-tasks",
  );

  const sharedHtml = sharedGroups
    .map(
      (group) => `
        <section class="achievement-group">
          <h3>${group.title}</h3>
          <div class="achievement-grid">
            ${renderBadgeGrid(
              group.badges,
              walks,
              brainworkEntries,
              null,
              group.id,
              dailyTaskCounts,
            )}
          </div>
        </section>
      `,
    )
    .join("");

  const personalHtml = achievementGroups.find((group) => group.id === "personal")
    ? await Promise.all(
        ["Katja", "Antti"].map(async (walker) => {
          const savedIds = currentUser
            ? await getAchievementShowcasePreferences(currentUser.diaryId, walker)
            : null;

          const unlockedBadges = getUnlockedPersonalBadges(
            walker,
            walks,
            brainworkEntries,
            dailyTaskCounts,
          );

          const canEdit = currentUser?.walker === walker;

          return `
            <section class="achievement-group">
              <h3>${walker}</h3>
              <div class="achievement-grid">
${renderPersonalShowcaseSlots(
  walker,
  unlockedBadges,
  savedIds,
  canEdit,
  walks,
  brainworkEntries,
  dailyTaskCounts,
)}
              </div>
            </section>
          `;
        }),
      )
    : [];

  container.innerHTML = `
  <section class="panel achievements-panel">
<div class="panel-header">
  <h3>Palkinnot</h3>

  <button
    type="button"
    id="show-all-achievements"
    class="all-achievement-button"
  >
    Kaikki palkinnot
  </button>
</div>

    ${sharedHtml}
    ${personalHtml.join("")}
  </section>
`;

  container.onclick = (event) => {
    handleAchievementSlotClick(event, walks, brainworkEntries, dailyTaskCounts);
  };
}

// Render the selected tab in the full achievement page and update its accessible tab state.
export async function renderAllAchievements(
  walks = [],
  brainworkEntries = [],
  activeTab = "shared",
) {
  const container = document.querySelector("#all-achievements-content");
  if (!container) return;

  const dailyTaskCounts = await getDailyTaskCounts();

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
            ? (achievementGroups.find((item) => item.id === "daily-tasks")?.badges ?? [])
            : []),
        ]
          .map((badge) =>
            renderBadge(
              badge,
              walks,
              brainworkEntries,
              walker,
              true,
              dailyTaskCounts,
            ),
          )
          .join("")}
      </div>
    </section>
  `;

  // Keep tab styling and accessibility state aligned with the rendered group.
  document.querySelectorAll("[data-achievement-tab]").forEach((button) => {
    const selected = button.dataset.achievementTab === activeTab;

    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
}

export { getAchievementProgress };
