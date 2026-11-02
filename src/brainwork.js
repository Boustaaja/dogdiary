import { supabase } from "./supabase.js";

// Brainwork module: handles the brainwork log, timer flow and selected-day rendering.
// The module keeps the data fetch/update logic close to the UI so the daily tracking
// remains easy to understand and adjust without digging through the whole app shell.
let brainworkEntries = [];
let diaryId = null;
let brainworkChannel = null;

// Shared date helpers keep the timer summary and calendar data consistent.
function getDateString(date = new Date()) {
  return date.toLocaleDateString("sv-SE");
}

// Totals follow the same day key represented in the database, so the UI and records match.
function getTotalMinutesForDate(entries, dateKey) {
  return entries
    .filter((entry) => entry.date === dateKey)
    .reduce((total, entry) => total + Number(entry.minutes), 0);
}

// Load the diary's brainwork entries and keep them in memory for the selected-day view.
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

// New entries are inserted with the current diary id to keep data scoped to the shared dog diary.
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

// Connect the brainwork form, timer and entry list to the shared diary.
export function initBrainwork(updateCalendar) {
  // UI wiring: all DOM elements that power the brainwork form, list and timer.
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

  const brainworkDateInput = document.querySelector("#brainwork-date");

  brainworkDateInput.value = getDateString();

  const brainworkDurationButtons = document.querySelectorAll(
    ".brainwork-duration-button",
  );

  let brainworkStartTime = null;
  let brainworkTimerInterval = null;
  let brainworkElapsedMs = 0;

  // Render the selected day: totals, list of entries and current summary values.
  function renderBrainwork() {
    const selectedDate = brainworkDateInput.value || getDateString();
    const selectedEntries = brainworkEntries.filter(
      (entry) => entry.date === selectedDate,
    );
    const selectedMinutes = getTotalMinutesForDate(brainworkEntries, selectedDate);

    brainworkSummary.textContent = `${selectedMinutes} min`;

    const today = getDateString();
    const todayMinutes = getTotalMinutesForDate(brainworkEntries, today);

    brainTime.textContent = `${todayMinutes} min`;

    brainworkList.innerHTML = "";

    if (selectedEntries.length === 0) {
      brainworkList.innerHTML =
        '<p class="muted">Tälle päivälle ei ole vielä kirjattu aivojumppia.</p>';
      return;
    }

    const sortedEntries = [...selectedEntries].sort((a, b) =>
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

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "secondary-button delete-walk-button";
      deleteButton.textContent = "Poista";
      deleteButton.setAttribute(
        "aria-label",
        `Poista aivojumppakirjaus ${entry.activity}`,
      );

      // Delete the entry associated with this rendered row.
      deleteButton.addEventListener("click", async () => {
        await deleteBrainwork(entry);
      });

      item.append(info, deleteButton);
      brainworkList.append(item);
    });
  }

  // Changing the selected date refreshes both the list and the calendar.
  brainworkDateInput.addEventListener("change", () => {
    renderBrainwork();
    updateCalendar?.();
  });

  // Confirm and delete an entry, then reload the list and any date-dependent views.
  async function deleteBrainwork(entry) {
    const confirmed = confirm(
      `Haluatko varmasti poistaa älytoimintakirjauksen "${entry.activity}" (${entry.date})?`,
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("brainwork")
      .delete()
      .eq("id", entry.id)
      .eq("diary_id", diaryId);

    if (error) {
      console.error("Älytoimintakirjauksen poistaminen epäonnistui:", error);
      alert("Kirjauksen poistaminen epäonnistui. Yritä uudelleen.");
      return;
    }

    const loaded = await loadBrainwork();

    if (!loaded) return;

    renderBrainwork();

    if (updateCalendar) {
      updateCalendar();
    }
  }

  // Keep the list synced if anyone else changes the same diary record in real time.
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
        },
        // Reload shared entries after another client updates the diary.
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

  // Render the timer from elapsed time so repeated intervals do not accumulate timing drift.
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

  // Set a preset duration and keep the matching quick-select button highlighted.
  function selectBrainworkDuration(minutes) {
    brainworkMinutesInput.value = minutes;

    // Quick-select buttons set the same duration field that the timer can fill.
    brainworkDurationButtons.forEach((button) => {
      const selected = Number(button.dataset.minutes) === minutes;
      button.classList.toggle("is-selected", selected);
    });
  }

  // Clear the quick-select highlight when the user starts a custom timed session.
  function clearDurationSelection() {
    brainworkDurationButtons.forEach((button) => {
      button.classList.remove("is-selected");
    });
  }

  // Timer controls capture a custom session duration for the activity form.
  brainworkStartButton.addEventListener("click", () => {
    if (brainworkStartTime !== null) return;

    brainworkStartTime = Date.now();

    brainworkStartButton.disabled = true;
    brainworkStopButton.disabled = false;
    brainworkStartButton.classList.add("is-selected");

    clearDurationSelection();

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
      selectBrainworkDuration(Number(button.dataset.minutes));
    });
  });

  // Validate and save the selected activity, then reset form and timer state.
  brainworkForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (brainworkStartTime !== null) {
      brainworkTimerStatus.textContent = "Pysäytä ajastin ennen tallentamista.";
      return;
    }

    const date = brainworkDateInput.value;
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
    brainworkDateInput.value = getDateString();

    clearDurationSelection();

    brainworkElapsedMs = 0;
    brainworkStartTime = null;
    brainworkTimerDisplay.textContent = "00:00";

    brainworkTimerStatus.textContent = "Ajastin ei ole käynnissä";
  });

  renderBrainwork();

  // Populate the first view after data loads, then start listening for shared updates.
  loadBrainwork().then((loaded) => {
    if (!loaded) return;

    renderBrainwork();

    if (updateCalendar) {
      updateCalendar();
    }

    subscribeToBrainwork();
  });
}

// Expose the in-memory entries so the calendar and achievements can calculate progress.
export function getBrainworkEntries() {
  return brainworkEntries;
}
