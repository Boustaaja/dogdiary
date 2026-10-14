import { supabase } from "./supabase.js";

let brainworkEntries = [];
let diaryId = null;
let brainworkChannel = null;

async function loadBrainwork() {
  const { data, error } = await supabase
    .from("diary_members")
    .select("diary_id")
    .single();

  if (error) {
    console.error("Päiväkirjan hakeminen epäonnistui:", error);
    return false;
  }

  diaryId = data.diary_id;

  const { data: entries, error: entriesError } = await supabase
    .from("brainwork")
    .select("*")
    .eq("diary_id", diaryId)
    .order("date", { ascending: false });

  if (entriesError) {
    console.error("Aivojumppausten hakeminen epäonnistui:", entriesError);
    return false;
  }

  brainworkEntries = entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    activity: entry.activity,
    minutes: entry.minutes,
  }));

  return true;
}

async function saveBrainwork(entry) {
  if (!diaryId) {
    alert("Päiväkirjaa ei ole vielä ladattu. Yritä hetken kuluttua uudelleen.");
    return false;
  }

  const { error } = await supabase.from("brainwork").insert({
    diary_id: diaryId,
    date: entry.date,
    activity: entry.activity,
    minutes: entry.minutes,
  });

  if (error) {
    console.error("Aivojumpan tallentaminen epäonnistui:", error);
    alert("Aivojumpan tallentaminen epäonnistui. Yritä uudelleen.");
    return false;
  }

  return true;
}

export function initBrainwork(updateCalendar) {
  const brainworkList = document.querySelector("#brainwork-list");
  const brainworkForm = document.querySelector("#brainwork-form");
  const brainworkSummary = document.querySelector("#brainwork-summary");
  const brainTime = document.querySelector("#brain-time");

  const brainworkStartButton = document.querySelector("#brainwork-start");
  const brainworkStopButton = document.querySelector("#brainwork-stop");
  const brainworkTimerDisplay = document.querySelector("#brainwork-timer");
  const brainworkTimerStatus = document.querySelector(
    "#brainwork-timer-status",
  );
  const brainworkMinutesInput = document.querySelector("#brainwork-minutes");

  const brainworkDurationButtons = document.querySelectorAll(
    ".brainwork-duration-button",
  );

  let brainworkStartTime = null;
  let brainworkTimerInterval = null;
  let brainworkElapsedMs = 0;

  function renderBrainwork() {
    const today = new Date().toLocaleDateString("sv-SE");

    const todayMinutes = brainworkEntries
      .filter((entry) => entry.date === today)
      .reduce((total, entry) => total + entry.minutes, 0);

    brainworkSummary.textContent = `${todayMinutes} min`;
    brainTime.textContent = `${todayMinutes} min`;

    brainworkList.innerHTML = "";

    if (brainworkEntries.length === 0) {
      brainworkList.innerHTML =
        '<p class="muted">Aivojumppia ei ole vielä kirjattu.</p>';
      return;
    }

    const sortedEntries = [...brainworkEntries].sort((a, b) =>
      b.date.localeCompare(a.date),
    );

    sortedEntries.forEach((entry) => {
      const item = document.createElement("article");
      item.className = "walk-item";

      const info = document.createElement("div");
      info.className = "walk-info";

      const title = document.createElement("strong");
      title.textContent = entry.activity;

      const details = document.createElement("span");
      details.textContent = `${entry.date} · ${entry.minutes} min`;

      info.append(title, details);
      item.append(info);
      brainworkList.append(item);
    });
  }

  function subscribeToBrainwork() {
    if (brainworkChannel || !diaryId) {
      return;
    }

    brainworkChannel = supabase
      .channel(`brainwork-${diaryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "brainwork",
          filter: `diary_id=eq.${diaryId}`,
        },
        async () => {
          const loaded = await loadBrainwork();

          if (!loaded) return;

          renderBrainwork();

          if (updateCalendar) {
            updateCalendar();
          }
        },
      )
      .subscribe();
  }

  function updateBrainworkTimer() {
    const currentSessionMs =
      brainworkStartTime !== null ? Date.now() - brainworkStartTime : 0;

    const elapsedSeconds = Math.floor(
      (brainworkElapsedMs + currentSessionMs) / 1000,
    );

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    brainworkTimerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function selectBrainworkDuration(minutes) {
    brainworkMinutesInput.value = minutes;

    brainworkDurationButtons.forEach((button) => {
      button.classList.toggle(
        "is-selected",
        Number(button.dataset.minutes) === minutes,
      );
    });
  }

  brainworkStartButton.addEventListener("click", () => {
    if (brainworkStartTime !== null) return;

    brainworkStartTime = Date.now();

    brainworkStartButton.disabled = true;
    brainworkStopButton.disabled = false;
    brainworkStartButton.classList.add("is-selected");

    brainworkDurationButtons.forEach((button) => {
      button.classList.remove("is-selected");
    });

    brainworkTimerStatus.textContent = "Harjoitus käynnissä";

    updateBrainworkTimer();
    brainworkTimerInterval = setInterval(updateBrainworkTimer, 250);
  });

  brainworkStopButton.addEventListener("click", () => {
    if (brainworkStartTime === null) return;

    brainworkElapsedMs += Date.now() - brainworkStartTime;
    brainworkStartTime = null;

    clearInterval(brainworkTimerInterval);
    brainworkTimerInterval = null;

    updateBrainworkTimer();

    selectBrainworkDuration(
      Math.max(1, Math.round(brainworkElapsedMs / 60000)),
    );

    brainworkStartButton.disabled = false;
    brainworkStopButton.disabled = true;
    brainworkStartButton.classList.remove("is-selected");

    brainworkTimerStatus.textContent =
      "Ajastin pysäytetty. Voit jatkaa tai tallentaa harjoituksen.";
  });

  brainworkDurationButtons.forEach((button) => {
    button.addEventListener("click", () => {
      brainworkMinutesInput.value = button.dataset.minutes;

      brainworkDurationButtons.forEach((item) => {
        item.classList.toggle("is-selected", item === button);
      });
    });
  });

  brainworkForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (brainworkStartTime !== null) {
      brainworkTimerStatus.textContent = "Pysäytä ajastin ennen tallentamista.";
      return;
    }

    const date = new Date().toLocaleDateString("sv-SE");
    const minutes = Number(brainworkMinutesInput.value);
    const activity = document.querySelector("#brainwork-activity").value.trim();

    if (
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > 180 ||
      !activity
    ) {
      return;
    }

    const entry = { date, minutes, activity };

    const saved = await saveBrainwork(entry);

    if (!saved) return;

    const loaded = await loadBrainwork();

    if (!loaded) return;

    renderBrainwork();

    if (updateCalendar) {
      updateCalendar();
    }

    brainworkForm.reset();
    brainworkMinutesInput.value = "";

    brainworkDurationButtons.forEach((button) => {
      button.classList.remove("is-selected");
    });

    brainworkElapsedMs = 0;
    brainworkStartTime = null;
    brainworkTimerDisplay.textContent = "00:00";

    brainworkTimerStatus.textContent = "Ajastin ei ole käynnissä";
  });

  renderBrainwork();

  loadBrainwork().then((loaded) => {
    if (!loaded) return;

    renderBrainwork();

    if (updateCalendar) {
      updateCalendar();
    }

    subscribeToBrainwork();
  });
}

export function getBrainworkEntries() {
  return brainworkEntries;
}
