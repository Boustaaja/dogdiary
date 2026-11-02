import "./achievements.css";
import "./allAchievements.css";

// Achievement module entry point: re-exports the UI and logic from dedicated modules.
// This is intentionally small so the app can import a single stable path while the real
// implementation is split into focused files.
export {
  renderAchievementShowcase,
  renderAllAchievements,
} from "./achievementShowcase.js";
