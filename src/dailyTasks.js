import { supabase } from "./supabase.js";
import forestBadge from "./assets/badges/forest.svg";
import lockImage from "./assets/Images/Lock.svg";

// Daily task card: keeps one random task per day, stored per user and rendered in the diary UI.
// This module is intentionally focused on a single, stable responsibility: today's task + completion state.
import dogDayBadge from "./assets/badges/dogDay.svg";
import dogParkBadge from "./assets/badges/dogPark.svg";
import campingBadge from "./assets/badges/camping.svg";
import waterBadge from "./assets/badges/water.svg";
import fieldBadge from "./assets/badges/field.svg";
import "./dailyTasks.css";

const dailyTaskOptions = [
  {
    id: "forest",
    name: "Metsälenkki",
    description: "Tehkää lenkki metsässä.",
    icon: forestBadge,
  },
  {
    id: "dog-day",
    name: "Koiran vuoro",
    description: "Anna koiran johdattaa lenkkiä.",
    icon: dogDayBadge,
  },
  {
    id: "dog-park",
    name: "Puistopäivä",
    description: "Käykää koirapuistossa.",
    icon: dogParkBadge,
  },
  {
    id: "camping",
    name: "Retkellä",
    description: "Tehkää retki eväiden kanssa.",
    icon: campingBadge,
  },
  {
    id: "water",
    name: "Veden äärellä",
    description: "Tehkää lenkki veden äärellä.",
    icon: waterBadge,
  },
  {
    id: "field",
    name: "Avara lenkki",
    description: "Tehkää lenkki avaralla niityllä tai pellolla.",
    icon: fieldBadge,
  },
];

let dailyTask = null;
let diaryId = null;
let currentWalker = null;

// The completion state is stored per walker, so status is mapped to the right database column.
function getTaskCompletionColumn(walker) {
  return walker === "Katja" ? "katja_completed" : "antti_completed";
}

// Convert the stored boolean into the status text shown for each walker.
function getTaskCompletionStatus(isCompleted) {
  return isCompleted ? "Suoritettu" : "Ei vielä suoritettu";
}

// Return today's local date as YYYY-MM-DD for the daily-task database query.
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Diary id is needed for all queries so the task belongs to the correct shared dog diary.
async function getDiaryId() {
  const { data, error } = await supabase
    .from("diary_members")
    .select("diary_id")
    .single();

  if (error) {
    throw error;
  }

  return data.diary_id;
}

// Resolve the logged-in account to the matching walker name used by task fields.
async function getCurrentWalker() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw error ?? new Error("Kirjautunutta käyttäjää ei löytynyt.");
  }

  const email = data.user.email?.toLowerCase();

  if (email === "boustaaja@hotmail.com") return "Katja";
  if (email === "godek_88@hotmail.com") return "Antti";

  throw new Error("Käyttäjälle ei löytynyt nimeä.");
}

// Fetch or create the daily task once per date so both users get the same challenge for that day.
async function getOrCreateDailyTask() {
  const taskDate = getToday();

  // Check whether the task already exists before creating another random task.
  const { data: existingTask, error: fetchError } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("diary_id", diaryId)
    .eq("task_date", taskDate)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existingTask) return existingTask;

  // Valitse uusi tehtävä vain, jos sitä ei vielä ole.
  const selectedTask =
    dailyTaskOptions[Math.floor(Math.random() * dailyTaskOptions.length)];

  const { data: newTask, error: insertError } = await supabase
    .from("daily_tasks")
    .insert({
      diary_id: diaryId,
      task_date: taskDate,
      task_id: selectedTask.id,
    })
    .select()
    .single();

  if (!insertError) return newTask;

  // Jos toinen käyttäjä ehti luoda tehtävän samaan aikaan,
  // käytä hänen tallentamaansa tehtävää.
  const { data: savedTask, error: retryError } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("diary_id", diaryId)
    .eq("task_date", taskDate)
    .maybeSingle();

  if (retryError) throw retryError;
  if (savedTask) return savedTask;

  throw insertError;
}

// Render the current daily task and show each user's completion state in a compact card.
function renderDailyTask() {
  const container = document.querySelector("#daily-task");
  if (!container || !dailyTask) return;

  const taskInfo = dailyTaskOptions.find(
    (task) => task.id === dailyTask.task_id,
  );

  if (!taskInfo) {
    container.innerHTML = "<p>Päivätehtävää ei löytynyt.</p>";
    return;
  }

  const completed =
    currentWalker === "Katja"
      ? dailyTask.katja_completed
      : dailyTask.antti_completed;

  const katjaStatus = getTaskCompletionStatus(dailyTask.katja_completed);
  const anttiStatus = getTaskCompletionStatus(dailyTask.antti_completed);

  container.innerHTML = `
    <div class="daily-task-card">
${
  completed
    ? `<img
        class="daily-task-badge"
        src="${taskInfo.icon}"
        alt="${taskInfo.name}"
      />`
    : `<div class="daily-task-badge locked">
    <img src="${lockImage}" alt="" aria-hidden="true">
  </div>`
}

      <div class="daily-task-info">
        <p class="daily-task-label">PÄIVÄN TEHTÄVÄ</p>
        <h2>${taskInfo.name}</h2>
        <p>${taskInfo.description}</p>

        <button
          id="complete-daily-task"
          type="button"
          ${completed ? "disabled" : ""}
        >
          ${completed ? "Tehtävä suoritettu" : "Merkitse suoritetuksi"}
        </button>

        <div class="daily-task-status">
          <p>Katja: ${katjaStatus}</p>
          <p>Antti: ${anttiStatus}</p>
        </div>
      </div>
    </div>
  `;

  document
    .querySelector("#complete-daily-task")
    ?.addEventListener("click", completeDailyTask);
}

// Mark today's task complete for the signed-in walker and render the updated shared state.
async function completeDailyTask() {
  if (!dailyTask || !currentWalker) return;

  const column = getTaskCompletionColumn(currentWalker);

  const { data, error } = await supabase
    .from("daily_tasks")
    .update({ [column]: true })
    .eq("id", dailyTask.id)
    .select()
    .single();

  if (error) {
    console.error("Päivätehtävän tallennus epäonnistui:", error);
    alert("Tehtävän tallennus epäonnistui. Yritä uudelleen.");
    return;
  }

  dailyTask = data;
  renderDailyTask();
}

// Load the diary, identify the current walker, and display today's shared task.
export async function initDailyTasks() {
  const container = document.querySelector("#daily-task");
  if (!container) return;

  container.innerHTML = "<p>Ladataan päivän tehtävää...</p>";

  try {
    diaryId = await getDiaryId();
    currentWalker = await getCurrentWalker();
    dailyTask = await getOrCreateDailyTask();

    renderDailyTask();
  } catch (error) {
    console.error("Päivätehtävän lataaminen epäonnistui:", error);
    container.innerHTML =
      "<p>Päivän tehtävää ei voitu ladata. Yritä päivittää sivu.</p>";
  }
}
