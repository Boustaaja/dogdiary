import { supabase } from "./supabase.js";
import forestBadge from "./assets/badges/forest.svg";
import dogDayBadge from "./assets/badges/dogDay.svg";
import dogParkBadge from "./assets/badges/dogPark.svg";
import "./dailyTasks.css";

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
];

let dailyTask = null;
let diaryId = null;
let currentWalker = null;

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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

async function getOrCreateDailyTask() {
  const taskDate = getToday();

  // Tarkista ensin, onko tämän päivän tehtävä jo tallennettu.
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

  const katjaStatus = dailyTask.katja_completed
    ? "Suoritettu"
    : "Ei vielä suoritettu";

  const anttiStatus = dailyTask.antti_completed
    ? "Suoritettu"
    : "Ei vielä suoritettu";

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
    ${lockIcon}
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
          ${completed ? "Tehtävä suoritettu ✓" : "Merkitse suoritetuksi"}
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

async function completeDailyTask() {
  if (!dailyTask || !currentWalker) return;

  const column =
    currentWalker === "Katja" ? "katja_completed" : "antti_completed";

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
