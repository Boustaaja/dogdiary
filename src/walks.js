import { updateSummary } from "./summary.js";

import { supabase } from "./supabase.js";

let walks = [];
let diaryId = null;
let walksChannel = null;

export function getWalks() {
  return walks;
}

export function initWalks(updateCalendar) {
  async function getLoggedInWalker() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      console.error("Kirjautuneen käyttäjän hakeminen epäonnistui:", error);
      return "";
    }

    const email = data.user.email?.toLowerCase();

    // Vaihda näihin Katjan ja Antin oikeat kirjautumissähköpostit.
    if (email === "boustaaja@hotmail.com") return "Katja";
    if (email === "godek_88@hotmail.com") return "Antti";

    return "";
  }

  async function loadWalks() {
    const { data: membership, error: membershipError } = await supabase
      .from("diary_members")
      .select("diary_id")
      .single();

    if (membershipError) {
      console.error("Päiväkirjan hakeminen epäonnistui:", membershipError);
      return;
    }

    diaryId = membership.diary_id;

    addWalkButton.disabled = false;
    addWalkButton.title = "";

    const { data, error } = await supabase
      .from("walks")
      .select("*")
      .eq("diary_id", diaryId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Lenkkien hakeminen epäonnistui:", error);
      return;
    }

    walks = data.map((walk) => ({
      id: walk.id,
      date: walk.date,
      walker: walk.walker,
      start: walk.start_time,
      end: walk.end_time,
      duration: walk.duration,
      ballMinutes: walk.ball_minutes,
      fastMinutes: walk.fast_minutes,
      portion: walk.portion,
    }));

    renderWalks();

    if (updateCalendar) {
      updateCalendar();
    }
    subscribeToWalks();
  }

  const walkList = document.querySelector("#walk-list");
  const addWalkButton = document.querySelector("#add-walk");

  addWalkButton.disabled = true;
  addWalkButton.title = "Ladataan yhteistä päiväkirjaa...";

  function getWalkDuration(start, end) {
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);

    const startTotal = startHour * 60 + startMinute;
    let endTotal = endHour * 60 + endMinute;

    if (endTotal <= startTotal) {
      endTotal += 24 * 60;
    }

    return endTotal - startTotal;
  }

  function getWalkCategory(minutes) {
    if (minutes < 15) return { name: "Lyhyt", color: "red" };
    if (minutes < 30) return { name: "Keskipitkä", color: "orange" };
    if (minutes < 60) return { name: "Pitkä", color: "yellow" };

    return { name: "Extra-pitkä", color: "green" };
  }

  function subscribeToWalks() {
    if (walksChannel) {
      return;
    }

    walksChannel = supabase
      .channel(`walks-${diaryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "walks",
        },
        (payload) => {
          loadWalks();
        },
      )
      .subscribe((status) => {});
  }

  async function saveWalk(walk) {
    if (!diaryId) {
      alert(
        "Päiväkirjaa ei ole vielä ladattu. Yritä hetken kuluttua uudelleen.",
      );
      return false;
    }

    const { error } = await supabase.from("walks").insert({
      diary_id: diaryId,
      date: walk.date,
      walker: walk.walker,
      start_time: walk.start,
      end_time: walk.end,
      duration: walk.duration,
      ball_minutes: walk.ballMinutes,
      fast_minutes: walk.fastMinutes,
      portion: walk.portion,
    });

    if (error) {
      console.error("Lenkin tallentaminen epäonnistui:", error);
      alert("Lenkin tallentaminen epäonnistui. Yritä uudelleen.");
      return false;
    }

    return true;
  }

  async function deleteWalk(walk) {
    const confirmed = confirm(
      `Haluatko varmasti poistaa lenkin ${walk.start}–${walk.end}?`,
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("walks")
      .delete()
      .eq("id", walk.id)
      .eq("diary_id", diaryId);

    if (error) {
      console.error("Lenkin poistaminen epäonnistui:", error);
      alert("Lenkin poistaminen epäonnistui. Yritä uudelleen.");
      return;
    }

    await loadWalks();
  }

  function renderWalks() {
    walkList.innerHTML = "";

    if (walks.length === 0) {
      walkList.innerHTML =
        '<p class="muted">Lenkkejä ei ole vielä kirjattu.</p>';
    }

    walks.forEach((walk) => {
      const ballMinutes = walk.ballMinutes ?? (walk.ball ? walk.duration : 0);
      const fastMinutes = walk.fastMinutes ?? 0;
      const creditedMinutes = walk.duration + ballMinutes + fastMinutes;
      const category = getWalkCategory(creditedMinutes);

      const item = document.createElement("article");
      item.className = "walk-item";

      const dot = document.createElement("div");
      dot.className = `status-dot status-${category.color}`;

      const info = document.createElement("div");
      info.className = "walk-info";

      const title = document.createElement("strong");
      title.textContent = `${walk.start.slice(0, 5)}–${walk.end.slice(0, 5)} · ${category.name}`;

      const details = document.createElement("span");
      details.textContent =
        `${walk.walker} · ${walk.duration} min` +
        ` · 🟡 ${ballMinutes} min` +
        ` · ⚡ ${fastMinutes} min`;

      info.append(title, details);

      const duration = document.createElement("span");
      duration.className = "walk-duration";

      if (walk.portion === "full") {
        duration.textContent = "🍽️ Täysi annos";
      } else if (walk.portion === "half") {
        duration.textContent = "🍽️ Puolikas annos";
      } else {
        duration.textContent = "Ei ruokaa";
      }

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "secondary-button delete-walk-button";
      deleteButton.textContent = "Poista";
      deleteButton.setAttribute(
        "aria-label",
        `Poista lenkki ${walk.start}–${walk.end}`,
      );

      deleteButton.addEventListener("click", async () => {
        await deleteWalk(walk);
      });

      item.append(dot, info, duration, deleteButton);
      walkList.append(item);
    });

    updateSummary(walks);
  }

  addWalkButton.addEventListener("click", () => {
    const existingForm = document.querySelector("#walk-form");

    if (existingForm) {
      existingForm.remove();
      return;
    }

    const form = document.createElement("form");
    form.id = "walk-form";
    form.className = "panel section-spacer";

    form.innerHTML = `
      <div class="panel-header">
        <h3>Lisää lenkki</h3>
      </div>

<label class="form-field">
  <span>Kuka käytti koiran?</span>
  <select name="walker" required>
    <option value="">Ladataan käyttäjää...</option>
    <option value="Katja">Katja</option>
    <option value="Antti">Antti</option>
  </select>
</label>

      <label class="form-field">
        <span>Lähtöaika</span>
        <input name="start" type="time" required>
      </label>

      <label class="form-field">
        <span>Paluu kotiin</span>
        <input name="end" type="time" required>
      </label>

      <label class="form-field">
        <span>Pallottelua (min)</span>
        <input name="ballMinutes" type="number" min="0" step="1" value="0" required>
      </label>

      <label class="form-field">
        <span>Nopeatempoista liikuntaa (min)</span>
        <input name="fastMinutes" type="number" min="0" step="1" value="0" required>
      </label>

      <label class="form-field">
        <span>Annoskoko</span>
        <select name="portion">
          <option value="">Ei ruokaa</option>
          <option value="full">Täysi annos</option>
          <option value="half">Puolikas annos</option>
        </select>
      </label>

      <p id="walk-preview" class="muted">
        Valitse lähtö- ja paluuaika.
      </p>

      <div class="form-actions">
        <button class="primary-button" type="submit">Tallenna lenkki</button>
        <button class="secondary-button" type="button" id="cancel-walk">
          Peruuta
        </button>
      </div>
    `;

    walkList.after(form);

    const startInput = form.elements.start;
    const endInput = form.elements.end;

    startInput.addEventListener("input", () => {
      if (!startInput.value) return;

      const [hours, minutes] = startInput.value.split(":").map(Number);
      const endTime = (hours * 60 + minutes + 15) % (24 * 60);

      const endHours = String(Math.floor(endTime / 60)).padStart(2, "0");
      const endMinutes = String(endTime % 60).padStart(2, "0");

      endInput.value = `${endHours}:${endMinutes}`;

      updatePreview();
    });

    const walkerSelect = form.elements.walker;

    walkerSelect.disabled = true;

    getLoggedInWalker().then((walker) => {
      if (!walker) {
        walkerSelect.value = "";
        walkerSelect.options[0].textContent = "Käyttäjää ei tunnistettu";
        return;
      }

      walkerSelect.value = walker;
      walkerSelect.disabled = false;
    });

    const ballMinutesInput = form.elements.ballMinutes;
    const fastMinutesInput = form.elements.fastMinutes;
    const preview = form.querySelector("#walk-preview");

    function updatePreview() {
      if (!startInput.value || !endInput.value) {
        preview.textContent = "Valitse lähtö- ja paluuaika.";
        return;
      }

      const duration = getWalkDuration(startInput.value, endInput.value);
      const ballMinutes = Number(ballMinutesInput.value);
      const fastMinutes = Number(fastMinutesInput.value);

      if (
        ballMinutes < 0 ||
        fastMinutes < 0 ||
        !Number.isInteger(ballMinutes) ||
        !Number.isInteger(fastMinutes)
      ) {
        preview.textContent =
          "Anna liikuntaminuutit kokonaislukuina, vähintään 0.";
        return;
      }

      if (ballMinutes + fastMinutes > duration) {
        preview.textContent =
          "Liikuntaminuutit eivät voi ylittää lenkin kokonaiskestoa.";
        return;
      }

      const creditedMinutes = duration + ballMinutes + fastMinutes;
      const category = getWalkCategory(duration);

      preview.textContent =
        `Kesto ${duration} min · ${category.name} · ` +
        `Tavoitteeseen ${creditedMinutes} min`;
    }

    startInput.addEventListener("input", updatePreview);
    endInput.addEventListener("input", updatePreview);
    ballMinutesInput.addEventListener("input", updatePreview);
    fastMinutesInput.addEventListener("input", updatePreview);

    form.querySelector("#cancel-walk").addEventListener("click", () => {
      form.remove();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!startInput.value || !endInput.value) return;

      const duration = getWalkDuration(startInput.value, endInput.value);
      const ballMinutes = Number(ballMinutesInput.value);
      const fastMinutes = Number(fastMinutesInput.value);

      if (
        duration <= 0 ||
        duration >= 24 * 60 ||
        ballMinutes < 0 ||
        fastMinutes < 0 ||
        !Number.isInteger(ballMinutes) ||
        !Number.isInteger(fastMinutes) ||
        ballMinutes + fastMinutes > duration
      ) {
        preview.textContent =
          "Tarkista ajat ja liikuntaminuutit ennen tallentamista.";
        return;
      }

      const today = new Date().toLocaleDateString("sv-SE");

      const walk = {
        date: today,
        walker: form.elements.walker.value,
        start: startInput.value,
        end: endInput.value,
        duration,
        ballMinutes,
        fastMinutes,
        portion: form.elements.portion.value,
      };

      const saved = await saveWalk(walk);

      if (!saved) return;

      form.remove();
    });
  });

  renderWalks();
  loadWalks();
}
