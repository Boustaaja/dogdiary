import "./style.css";

// Main app shell: prepares the global layout, login flow and feature bootstrapping.
// This file is intentionally the composition layer; it wires together the diary view,
// calendar, and feature modules without owning the business logic itself.
import { initDogProfile } from "./dogProfile.js";
import { initBrainwork, getBrainworkEntries } from "./brainwork.js";
import { initWalks, getWalks } from "./walks.js";
import { supabase } from "./supabase.js";
import { renderWeeklyCalendar } from "./calendar.js";
import {
  renderAchievementShowcase,
  renderAllAchievements,
} from "./achievements/achievements.js";
import puppy from "./assets/Images/puppy.png";
import { initDailyTasks } from "./dailyTasks.js";
import clockIcon from "./assets/Images/clock.svg";
import foodIcon from "./assets/Images/food.svg";
import lightbulbIcon from "./assets/Images/lightbulb.svg";

const app = document.querySelector("#app");

app.innerHTML = `
<section id="login-view" class="login-view" hidden>
    <div class="login-card">
<div class="brand-icon">
  <img src="/brand.png" alt="" />
</div>
      <h1>DogDiary</h1>
      <p>Kirjaudu sisään nähdäksesi yhteisen päiväkirjan.</p>

      <form id="login-form">
        <label for="login-email">Sähköposti</label>
        <input
          type="email"
          id="login-email"
          autocomplete="email"
          placeholder="Sähköpostiosoitteesi"
          required
        >

        <label for="login-password">Salasana</label>
        <input
          type="password"
          id="login-password"
          autocomplete="current-password"
          placeholder="Salasanasi"
          required
        >

        <button type="submit" class="primary-button full-width">
          Kirjaudu sisään
        </button>

        <p id="login-message" role="status"></p>
      </form>
    </div>
  </section>

  <div id="diary-view" hidden>
  <header class="app-header">
    <div class="brand">
<div class="brand-icon">
  <img src="/brand.png" alt="" />
</div>
      <div>
        <h1 class="brand-name">DogDiary</h1>
        <p class="brand-subtitle">Koiran hyvinvointipäiväkirja</p>
      </div>
    </div>
<div class="header-actions">
  <div class="date-label" id="current-date"></div>
  <button
    type="button"

class="primary-button logout-button"
    id="logout-button"
  >
    Kirjaudu ulos
  </button>
</div>
  </header>

<main id="diary-main" class="page">
    <section class="welcome">
      <p class="eyebrow">Päivän kuulumiset</p>
      <h2 id="welcome-greeting"></h2>
    </section>

    <div class="dog-profile">
      <label for="dog-photo" class="dog-avatar-label">
        <img id="dog-avatar" src="" alt="Koiran profiilikuva">
      </label>

      <input type="file" id="dog-photo" accept="image/*" hidden>

      <h3 id="dog-name-display" tabindex="0">Oma koira</h3>

      <input
        type="text"
        id="dog-name-input"
        placeholder="Koiran nimi"
        maxlength="40"
        hidden
      >

      <p>Pidetään huolta siitä, että jokainen päivä on hyvä koirapäivä.</p>
    </div>

    <section class="stats-grid" aria-label="Päivän yhteenveto">
      <article class="stat-card">
<div class="stat-icon" aria-hidden="true">
  <img src="${puppy}" alt="" />
</div>
        <p class="stat-value" id="walk-count">0 / 3</p>
        <p class="stat-label">Lenkit tehty</p>
      </article>

      <article class="stat-card">
        <div class="stat-icon" aria-hidden="true">
          <img src="${clockIcon}" alt="" />
        </div>
        <p class="stat-value" id="walk-time">0 min</p>
        <p class="stat-label">Ulkoilua yhteensä</p>
      </article>

      <article class="stat-card">
        <div class="stat-icon" aria-hidden="true">
          <img src="${foodIcon}" alt="" />
        </div>
        <p class="stat-value" id="meal-count">0 / 3</p>
        <p class="stat-label">Ruokailut hoidettu</p>
      </article>

      <article class="stat-card">
        <div class="stat-icon" aria-hidden="true">
          <img src="${lightbulbIcon}" alt="" />
        </div>
        <p class="stat-value" id="brain-time">0 min</p>
        <p class="stat-label">Aivotyöskentely</p>
      </article>  
    </section>

<section class="panel weekly-calendar">
  <div class="panel-header calendar-header">
    <h3>Viikkokalenteri</h3>

    <div class="calendar-navigation">
      <button type="button" id="previous-week" class="primary-button">
        ← Edellinen
      </button>

      <button type="button" id="current-week" class="primary-button">
        Tämä viikko
      </button>

      <button type="button" id="next-week" class="primary-button">
        Seuraava →
      </button>
    </div>
  </div>

<p class="muted" id="calendar-week-label"></p>

      <div class="week-grid" id="week-calendar">
        <!-- Viikonpäivät lisätään JavaScriptillä. -->
      </div>

      <div class="calendar-legend">
        <span><i class="status-neutral"></i> Ei vielä kirjauksia</span>
        <span><i class="status-red"></i> Alle tavoitteen</span>
        <span><i class="status-yellow"></i> Osittain saavutettu</span>
        <span><i class="status-green"></i> Tavoite saavutettu</span>
      </div>

<div class="calendar-legend">
  <span>Lenkit – Tavoite: väh. 3 lenkkiä ja 90 min päivässä</span>
  <span>Ruoka – Tavoite: 3 täyttä annosta päivässä</span>
  <span>Aivojumppa – Tavoite: 15 min päivässä</span>
</div>
    </section>
<section id="daily-task"></section>
    <section id="achievements-showcase"></section>

    <div class="content-grid">
      <section class="panel">
        <div class="panel-header">
          <h3>Päivän lenkit</h3>
          <span class="muted">Tavoite: väh. 3 lenkkiä / 90 min.</span>
        </div>

        <div class="progress-track" aria-label="Lenkkien eteneminen">
          <div class="progress-fill" id="walk-progress"></div>
        </div>

        <div class="walk-timer section-spacer">
        <p class="muted">Lenkin ajastin</p>
  <p id="walk-timer" class="walk-timer-display">00:00:00</p>

  <div class="form-actions">
    <button type="button" id="start-walk-timer" class="primary-button">
      Käynnistä lenkki
    </button>
    <button
      type="button"
      id="stop-walk-timer"
      class="secondary-button"
      disabled
    >
      Lopeta lenkki
    </button>
  </div>

  <p id="walk-timer-status" class="muted"></p>
</div>

        <div class="walk-list section-spacer" id="walk-list">
          <p class="muted">Lenkkejä ei ole vielä kirjattu.</p>
        </div>

        <button class="primary-button full-width section-spacer" id="add-walk">
          + Lisää lenkki
        </button>
      </section>

      <div>
        <section class="panel">
          <div class="panel-header">
            <h3>Ruokailut</h3>
            <span class="muted" id="meal-summary">0 / 3</span>
          </div>

          <div class="meal-list" id="meal-list">
            <p class="muted">Ruokailut merkitään lenkkien yhteydessä.</p>
          </div>
        </section>

        <section class="panel section-spacer">
          <div class="panel-header">
            <h3>Aivotyöskentely</h3>
            <span class="muted" id="brainwork-summary">0 min</span>
          </div>

          <div class="brain-card">
            <h4>Nenä töihin, aivot töihin!</h4>
            <p>Päivän tavoite on 5–15 minuuttia.</p>

            <div class="brainwork-timer section-spacer">
              <p id="brainwork-timer" class="brainwork-timer-display">00:00</p>
              <p id="brainwork-timer-status" class="muted">
                Ajastin ei ole käynnissä
              </p>

              <div class="brainwork-card-icon" aria-hidden="true">
                <img src="${lightbulbIcon}" alt="" />
              </div>

              <div class="brainwork-timer-buttons">
                <button type="button" class="primary-button" id="brainwork-start">
                  Käynnistä
                </button>
                <button
                  type="button"
                  class="secondary-button"
                  id="brainwork-stop"
                  disabled
                >
                  ■ Pysäytä
                </button>
              </div>
            </div>

<label for="brainwork-date">Päivämäärä</label>
<input
  type="date"
  id="brainwork-date"
  name="date"
  required
>

            <form id="brainwork-form" class="section-spacer">
              <label for="brainwork-activity">Aktiviteetti</label>
              <input
                type="text"
                id="brainwork-activity"
                name="activity"
                placeholder="Esim. hajutyöskentely"
                required
              >

              <p class="brainwork-field-label">Kesto</p>

              <div
                class="brainwork-duration-options"
                id="brainwork-duration-options"
              >
                <button
                  type="button"
                  class="primary-button brainwork-duration-button"
                  data-minutes="5"
                >5 min</button>
                <button
                  type="button"
                  class="primary-button brainwork-duration-button"
                  data-minutes="10"
                >10 min</button>
                <button
                  type="button"
                  class="primary-button brainwork-duration-button"
                  data-minutes="15"
                >15 min</button>
              </div>

              <input
                type="hidden"
                id="brainwork-minutes"
                name="minutes"
                value=""
              >

              <button
                type="submit"
                class="primary-button full-width section-spacer"
              >
                + Lisää aivojumppa
              </button>
            </form>

            <div id="brainwork-list">
              <p class="muted">Aivojumppia ei ole vielä kirjattu.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>

<main id="all-achievements-view" class="page" hidden>
  <section class="all-achievements-panel">
    <div class="all-achievements-header">
      <button
        type="button"
        id="back-to-diary"
        class="all-achievements-back"
      >
        ← Takaisin
      </button>

      <h1>Kaikki palkinnot</h1>
      <p>Seuraa yhteisiä ja henkilökohtaisia saavutuksia.</p>
    </div>

    <div
      class="all-achievements-tabs"
      role="tablist"
      aria-label="Palkintojen ryhmä"
    >
      <button
        type="button"
        class="all-achievements-tab is-active"
        data-achievement-tab="shared"
        role="tab"
        aria-selected="true"
      >
        Yhteiset
      </button>

      <button
        type="button"
        class="all-achievements-tab"
        data-achievement-tab="katja"
        role="tab"
        aria-selected="false"
      >
        Katja
      </button>

      <button
        type="button"
        class="all-achievements-tab"
        data-achievement-tab="antti"
        role="tab"
        aria-selected="false"
      >
        Antti
      </button>

    </div>

    <div id="all-achievements-content"></div>
  </section>
</main>

</div>
`;

const dateElement = document.querySelector("#current-date");

dateElement.textContent = new Intl.DateTimeFormat("fi-FI", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

// --- Weekly calendar coordination ---
let selectedWeekOffset = 0;

// The app shell refreshes dependent achievement views; calendar.js only calculates and draws the week.
function renderWeekCalendar() {
  if (!document.querySelector("#week-calendar")) return;

  const walks = getWalks();
  const brainworkEntries = getBrainworkEntries();

  renderWeeklyCalendar(walks, brainworkEntries, selectedWeekOffset);
  renderAchievementShowcase(walks, brainworkEntries);

  // Keep the all-achievements view current while it is open and diary data changes.
  if (!document.querySelector("#all-achievements-view").hidden) {
    renderAllAchievementsPage();
  }
}

// --- Achievement pages and navigation ---
let activeAchievementTab = "shared";

// Show one of the two main views without reloading the application.
function toggleDiaryView(isVisible) {
  const diaryMain = document.querySelector("#diary-main");
  const allAchievementsView = document.querySelector("#all-achievements-view");

  if (diaryMain) diaryMain.hidden = !isVisible;
  if (allAchievementsView) allAchievementsView.hidden = isVisible;
}

// Render the selected achievement tab using the latest walk and brainwork entries.
function renderAllAchievementsPage() {
  renderAllAchievements(
    getWalks(),
    getBrainworkEntries(),
    activeAchievementTab,
  );
}

// Open the full achievement view from its button in the compact showcase.
document.querySelector("#achievements-showcase").addEventListener("click", (event) => {
    if (!event.target.closest("#show-all-achievements")) return;

    toggleDiaryView(false);
    activeAchievementTab = "shared";
    renderAllAchievementsPage();
  });

// Change the selected group/person tab in the full achievement view.
document
  .querySelector("#all-achievements-view")
  .addEventListener("click", (event) => {
    const tab = event.target.closest("[data-achievement-tab]");
    if (!tab) return;

    activeAchievementTab = tab.dataset.achievementTab;
    renderAllAchievementsPage();
  });

// Return to the diary's main dashboard.
document.querySelector("#back-to-diary").addEventListener("click", () => {
  toggleDiaryView(true);
});

// Move the calendar by whole weeks; selecting the current week resets the offset.
document.querySelector("#previous-week").addEventListener("click", () => {
  selectedWeekOffset--;
  renderWeekCalendar();
});

document.querySelector("#current-week").addEventListener("click", () => {
  selectedWeekOffset = 0;
  renderWeekCalendar();
});

document.querySelector("#next-week").addEventListener("click", () => {
  selectedWeekOffset++;
  renderWeekCalendar();
});

// --- Diary bootstrap and auth state ---
let diaryInitialized = false;

const greetings = [
  (name) => `Terve, ${name}!`,
  (name) => `Terve taas, ${name}, valmiina lenkille?`,
  (name) => `Moikka ${name}! Pidetään hauska päivä yhdessä.`,
  (name) => `Päivän tassutehtävät kutsuvat, ${name}!`,
  (name) => `Hei ${name}, mukava nähdä taas!`,
  (name) => `Moikka ${name}! Mitä kivaa tänään keksitään?`,
  (name) => `Moi ${name}! Aika laittaa häntä heilumaan ja tassut töihin!`,
];

// Personalize the welcome text using the signed-in account and a random greeting.
async function updateWelcomeGreeting() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    console.error("Kirjautuneen käyttäjän hakeminen epäonnistui:", error);
    return;
  }

  const email = data.user.email?.toLowerCase();
  let name = "";

  if (email === "boustaaja@hotmail.com") name = "Katja";
  if (email === "godek_88@hotmail.com") name = "Antti";

  if (!name) name = "tassuvastaava";

  const randomGreeting =
    greetings[Math.floor(Math.random() * greetings.length)];

  document.querySelector("#welcome-greeting").textContent =
    randomGreeting(name);
}

// Initialize feature modules once after authentication; later auth events reuse them.
function initDiary() {
  if (diaryInitialized) return;

  diaryInitialized = true;
  updateWelcomeGreeting();

  initDogProfile();
  initWalks(renderWeekCalendar);
  initBrainwork(renderWeekCalendar);

  renderWeekCalendar();
  initDailyTasks();
}

const loginView = document.querySelector("#login-view");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const diaryView = document.querySelector("#diary-view");

// Check the active Supabase session and show the matching top-level application view.
async function updateLoginView() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Kirjautumistilan tarkistus epäonnistui:", error);
    return;
  }

  loginView.hidden = !!session;
  diaryView.hidden = !session;

  if (session) {
    initDiary();
  }
}

// Submit credentials, show progress/errors, then switch to the diary on success.
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginMessage.textContent = "Kirjaudutaan sisään...";

  const email = document.querySelector("#login-email").value;
  const password = document.querySelector("#login-password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginMessage.textContent =
      "Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana.";
    return;
  }

  loginMessage.textContent = "";
  await updateLoginView();
});

// Keep the visible login/diary view in sync when Supabase changes the session.
supabase.auth.onAuthStateChange(() => {
  updateLoginView();
});

updateLoginView();

const logoutButton = document.querySelector("#logout-button");

// Sign out and reload so user-specific module state and realtime channels are cleared.
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Kirjaudutaan ulos...";

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Uloskirjautuminen epäonnistui:", error);
    logoutButton.disabled = false;
    logoutButton.textContent = "Kirjaudu ulos";
    return;
  }

  // Uloskirjautuminen onnistui.
  // Ladataan sovellus uudelleen, jotta vanhan käyttäjän
  // tiedot, moduulien tila ja Realtime-kanavat tyhjentyvät.
  window.location.reload();
});
