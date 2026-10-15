import "./style.css";
import lightningIcon from "./assets/Images/lightning-svgrepo-com.svg";
import boneIcon from "./assets/Images/bone-svgrepo-com.svg";
import lightbulbIcon from "./assets/Images/light-bulb-svgrepo-com.svg";
import { initDogProfile } from "./dogProfile.js";
import { initBrainwork, getBrainworkEntries } from "./brainwork.js";
import { initWalks, getWalks } from "./walks.js";
import { supabase } from "./supabase.js";

const app = document.querySelector("#app");

app.innerHTML = `
<section id="login-view" class="login-view" hidden>
    <div class="login-card">
      <div class="brand-icon" aria-hidden="true">🐾</div>
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
      <div class="brand-icon" aria-hidden="true">🐾</div>
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

  <main class="page">
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
        <div class="stat-icon" aria-hidden="true">🐕</div>
        <p class="stat-value" id="walk-count">0 / 3</p>
        <p class="stat-label">Lenkit tehty</p>
      </article>

      <article class="stat-card">
        <div class="stat-icon" aria-hidden="true">🕒</div>
        <p class="stat-value" id="walk-time">0 min</p>
        <p class="stat-label">Ulkoilua yhteensä</p>
      </article>

      <article class="stat-card">
        <div class="stat-icon" aria-hidden="true">🍽️</div>
        <p class="stat-value" id="meal-count">0 / 3</p>
        <p class="stat-label">Ruokailut hoidettu</p>
      </article>

      <article class="stat-card">
        <div class="stat-icon" aria-hidden="true">💡</div>
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
  <span>⚡ Lenkit – Tavoite: väh. 3 lenkkiä ja 120 min päivässä</span>
  <span>🦴 Ruoka – Tavoite: 3 täyttä annosta päivässä</span>
  <span>💡 Aivojumppa – Tavoite: 15 min päivässä</span>
</div>
    </section>

    <div class="content-grid">
      <section class="panel">
        <div class="panel-header">
          <h3>Päivän lenkit</h3>
          <span class="muted">Tavoite: väh. 3 lenkkiä / 120 min.</span>
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
            <h4>Nenä töihin, aivot töihin! 🐾</h4>
            <p>Päivän tavoite on 5–15 minuuttia.</p>

            <div class="brainwork-timer section-spacer">
              <p id="brainwork-timer" class="brainwork-timer-display">00:00</p>
              <p id="brainwork-timer-status" class="muted">
                Ajastin ei ole käynnissä
              </p>

              <div class="brainwork-timer-buttons">
                <button type="button" class="primary-button" id="brainwork-start">
                  ▶ Käynnistä
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
</div>
`;

const dateElement = document.querySelector("#current-date");

dateElement.textContent = new Intl.DateTimeFormat("fi-FI", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

let selectedWeekOffset = 0;
function renderWeekCalendar() {
  const brainworkEntries = getBrainworkEntries();
  const walks = getWalks();

  const calendar = document.querySelector("#week-calendar");
  if (!calendar) return;

  calendar.innerHTML = "";

  const today = new Date();
  const weekday = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - weekday + selectedWeekOffset * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const dateFormat = { day: "numeric", month: "numeric" };

  const weekLabel = document.querySelector("#calendar-week-label");

  if (weekLabel) {
    weekLabel.textContent =
      `${monday.toLocaleDateString("fi-FI", dateFormat)}.–` +
      `${sunday.toLocaleDateString("fi-FI", dateFormat)}`;
  }

  const dayNames = ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    const dayWalks = walks.filter((walk) => walk.date === dateKey);

    const creditedMinutes = dayWalks.reduce((total, walk) => {
      const ballMinutes = walk.ballMinutes ?? (walk.ball ? walk.duration : 0);
      const fastMinutes = walk.fastMinutes ?? 0;

      return total + walk.duration + ballMinutes + fastMinutes;
    }, 0);

    const mealPoints = dayWalks.reduce((total, walk) => {
      if (walk.portion === "full") return total + 1;
      if (walk.portion === "half") return total + 0.5;
      return total;
    }, 0);

    const meals = Math.min(mealPoints, 3);

    const todayKey = today.toLocaleDateString("sv-SE");
    const isFuture = dateKey > todayKey;
    const isToday = dateKey === todayKey;

    let walkColor = "neutral";
    let mealColor = "neutral";
    let brainworkColor = "neutral";

    const brainworkMinutes = brainworkEntries
      .filter((entry) => entry.date === dateKey)
      .reduce((total, entry) => total + Number(entry.minutes), 0);

    if (brainworkMinutes >= 15) {
      brainworkColor = "green";
    } else if (brainworkMinutes >= 10) {
      brainworkColor = "yellow";
    } else if (brainworkMinutes >= 5) {
      brainworkColor = "red";
    }

    if (!isFuture && !isToday) {
      walkColor =
        dayWalks.length < 3 || creditedMinutes < 90
          ? "red"
          : creditedMinutes < 120
            ? "yellow"
            : "green";

      mealColor =
        meals >= 3
          ? "green"
          : meals >= 2
            ? "yellow"
            : meals >= 1
              ? "red"
              : "neutral";
    } else if (isToday) {
      walkColor =
        dayWalks.length >= 3 && creditedMinutes >= 120
          ? "green"
          : dayWalks.length >= 3 && creditedMinutes >= 90
            ? "yellow"
            : dayWalks.length > 0
              ? "red"
              : "neutral";

      mealColor =
        meals >= 3
          ? "green"
          : meals >= 2
            ? "yellow"
            : meals >= 1
              ? "red"
              : "neutral";
    }

    const day = document.createElement("div");
    day.className = `calendar-day${isToday ? " is-today" : ""}`;

    const name = document.createElement("span");
    name.className = "calendar-day-name";
    name.textContent = dayNames[i];

    const number = document.createElement("span");
    number.className = "calendar-day-number";
    number.textContent = date.getDate();

    const marks = document.createElement("div");
    marks.className = "calendar-marks";

    const walkMark = document.createElement("span");
    walkMark.className = `calendar-icon icon-walk status-${walkColor}`;
    walkMark.style.maskImage = `url("${lightningIcon}")`;
    walkMark.style.webkitMaskImage = `url("${lightningIcon}")`;
    walkMark.title = "Lenkit";

    const mealMark = document.createElement("span");
    mealMark.className = `calendar-icon icon-meal status-${mealColor}`;
    mealMark.style.maskImage = `url("${boneIcon}")`;
    mealMark.style.webkitMaskImage = `url("${boneIcon}")`;
    mealMark.title = "Ruoka";

    const brainworkMark = document.createElement("span");
    brainworkMark.className = `calendar-icon icon-brainwork status-${brainworkColor}`;
    brainworkMark.style.maskImage = `url("${lightbulbIcon}")`;
    brainworkMark.style.webkitMaskImage = `url("${lightbulbIcon}")`;
    brainworkMark.title = "Aivojumppa";

    marks.append(walkMark, mealMark, brainworkMark);
    day.append(name, number, marks);
    calendar.append(day);
  }
}

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

let diaryInitialized = false;

const greetings = [
  "Tervehdys, tassuvastaava! 🐶",
  "Hei karvakaverin huoltaja! 🐾",
  "Tervetuloa takaisin, karvakaverin hovipalvelija! 🦴",
  "Päivää, koiran henkilökunta! 🐕",
  "Moikka, tassutiimin ihmisjäsen! 🐾",
  "Hei, karvakaverin hyvinvointipäällikkö! 🐶",
];

const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

const greetingElement = document.querySelector("#welcome-greeting");

if (greetingElement) {
  greetingElement.textContent = randomGreeting;
}

function initDiary() {
  if (diaryInitialized) return;

  diaryInitialized = true;
  initDogProfile();
  initWalks(renderWeekCalendar);
  initBrainwork(renderWeekCalendar);
  renderWeekCalendar();
}

const loginView = document.querySelector("#login-view");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const diaryView = document.querySelector("#diary-view");

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

supabase.auth.onAuthStateChange(() => {
  updateLoginView();
});

updateLoginView();

const logoutButton = document.querySelector("#logout-button");

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

  logoutButton.disabled = false;
  logoutButton.textContent = "Kirjaudu ulos";
});
