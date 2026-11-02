import lightningIcon from "./assets/Images/lightning-svgrepo-com.svg";
import boneIcon from "./assets/Images/bone-svgrepo-com.svg";
import lightbulbIcon from "./assets/Images/light-bulb-svgrepo-com.svg";

// Weekly calendar module: computes daily status and renders the seven-day calendar.
// Data is passed in so this module stays independent of Supabase and app-wide state.
// Convert local calendar dates to the YYYY-MM-DD format used by database records.
function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

// Collect the selected day's walks and calculate the minutes and meal points shown in its status.
function getWalkMetricsForDate(walks, dateKey) {
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

  return { dayWalks, creditedMinutes, mealPoints };
}

// Sum the brainwork sessions for one day so calendar colors use the day's total.
function getBrainworkMinutesForDate(brainworkEntries, dateKey) {
  return brainworkEntries
    .filter((entry) => entry.date === dateKey)
    .reduce((total, entry) => total + Number(entry.minutes), 0);
}

// Apply the diary's completion thresholds and return the color for each calendar marker.
function getDayStatusColors({
  dayWalks,
  creditedMinutes,
  mealPoints,
  brainworkMinutes,
  isFuture,
  isToday,
}) {
  const meals = Math.min(mealPoints, 3);

  let walkColor = "neutral";
  let mealColor = "neutral";

  if (!isFuture && !isToday && dayWalks.length > 0) {
    walkColor =
      dayWalks.length < 3 || creditedMinutes < 60
        ? "red"
        : creditedMinutes < 90
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
      dayWalks.length >= 3 && creditedMinutes >= 90
        ? "green"
        : dayWalks.length >= 3 && creditedMinutes >= 60
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

  let brainworkColor = "neutral";

  if (brainworkMinutes >= 15) {
    brainworkColor = "green";
  } else if (brainworkMinutes >= 10) {
    brainworkColor = "yellow";
  } else if (brainworkMinutes >= 5) {
    brainworkColor = "red";
  }

  return { walkColor, mealColor, brainworkColor };
}

// Create one icon marker with its status color and accessible hover label.
function createCalendarMark(icon, type, title, color) {
  const mark = document.createElement("span");
  mark.className = `calendar-icon icon-${type} status-${color}`;
  mark.style.maskImage = `url("${icon}")`;
  mark.style.webkitMaskImage = `url("${icon}")`;
  mark.title = title;
  return mark;
}

// Draw a week offset from the current week; offset 0 always represents this week.
export function renderWeeklyCalendar(walks, brainworkEntries, selectedWeekOffset) {
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
  const todayKey = today.toLocaleDateString("sv-SE");

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    const dateKey = toDateKey(date);
    const { dayWalks, creditedMinutes, mealPoints } = getWalkMetricsForDate(
      walks,
      dateKey,
    );
    const isFuture = dateKey > todayKey;
    const isToday = dateKey === todayKey;
    const brainworkMinutes = getBrainworkMinutesForDate(
      brainworkEntries,
      dateKey,
    );
    const { walkColor, mealColor, brainworkColor } = getDayStatusColors({
      dayWalks,
      creditedMinutes,
      mealPoints,
      brainworkMinutes,
      isFuture,
      isToday,
    });

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

    marks.append(
      createCalendarMark(lightningIcon, "walk", "Lenkit", walkColor),
      createCalendarMark(boneIcon, "meal", "Ruoka", mealColor),
      createCalendarMark(
        lightbulbIcon,
        "brainwork",
        "Aivojumppa",
        brainworkColor,
      ),
    );

    day.append(name, number, marks);
    calendar.append(day);
  }
}
