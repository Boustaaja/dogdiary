export function updateSummary(walks) {
  const today = new Date().toLocaleDateString("sv-SE");
  const todayWalks = walks.filter((walk) => walk.date === today);

  const actualMinutes = todayWalks.reduce(
    (total, walk) => total + walk.duration,
    0,
  );

  const creditedMinutes = todayWalks.reduce((total, walk) => {
    const ballMinutes = walk.ballMinutes ?? (walk.ball ? walk.duration : 0);
    const fastMinutes = walk.fastMinutes ?? 0;

    return total + walk.duration + ballMinutes + fastMinutes;
  }, 0);

  const mealPoints = todayWalks.reduce((total, walk) => {
    if (walk.portion === "full") return total + 1;
    if (walk.portion === "half") return total + 0.5;
    return total;
  }, 0);

  const meals = Math.min(mealPoints, 3);

  document.querySelector("#walk-count").textContent =
    `${todayWalks.length} / 3`;

  document.querySelector("#walk-time").textContent = `${creditedMinutes} min`;

  const creditedTimeElement = document.querySelector("#credited-time");

  if (creditedTimeElement) {
    creditedTimeElement.textContent = `${creditedMinutes} min`;
  }

  document.querySelector("#meal-count").textContent = `${meals} / 3`;
  document.querySelector("#meal-summary").textContent = `${meals} / 3`;

  document.querySelector("#walk-progress").style.width =
    `${Math.min(todayWalks.length / 3, 1) * 100}%`;

  const mealList = document.querySelector("#meal-list");
  mealList.innerHTML = "";

  const mealsToday = todayWalks.filter(
    (walk) => walk.portion === "full" || walk.portion === "half",
  );

  if (mealsToday.length === 0) {
    mealList.innerHTML =
      '<p class="muted">Ruokailuja ei ole vielä kirjattu.</p>';
  }

  mealsToday.forEach((walk) => {
    const row = document.createElement("div");
    row.className = "meal-row";

    const icon = document.createElement("span");
    icon.className = "meal-check";
    icon.textContent = "✓";

    const label = document.createElement("span");
    const portionLabel =
      walk.portion === "full" ? "Täysi annos · 1 p" : "Puolikas annos · 0,5 p";

    label.textContent = `${walk.start} · ${portionLabel} · ${walk.walker}`;

    row.append(icon, label);
    mealList.append(row);
  });
}
