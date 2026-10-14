import defaultDogAvatar from "./assets/images/dog-breed-svgrepo-com.svg";
import { supabase } from "./supabase.js";

export function initDogProfile() {
  const dogPhotoInput = document.querySelector("#dog-photo");
  const dogAvatar = document.querySelector("#dog-avatar");
  const dogNameInput = document.querySelector("#dog-name-input");
  const dogNameDisplay = document.querySelector("#dog-name-display");

  let diaryId = null;
  let profileChannel = null;
  let currentName = "";

  dogAvatar.src = defaultDogAvatar;
  dogNameDisplay.textContent = "Oma koira";

  function showDogName() {
    dogNameInput.hidden = true;
    dogNameDisplay.hidden = false;
  }

  function editDogName() {
    dogNameDisplay.hidden = true;
    dogNameInput.hidden = false;
    dogNameInput.value = currentName;
    dogNameInput.focus();
  }

  async function loadDogProfile() {
    const { data, error } = await supabase
      .from("dog_profile")
      .select("name, photo_path")
      .eq("diary_id", diaryId)
      .maybeSingle();

    if (error) {
      console.error("Koiran profiilin hakeminen epäonnistui:", error);
      return;
    }

    // Luodaan yhteinen profiili ensimmäisellä käyttökerralla.
    if (!data) {
      const { error: insertError } = await supabase
        .from("dog_profile")
        .insert({ diary_id: diaryId, name: "" });

      if (insertError && insertError.code !== "23505") {
        console.error("Koiran profiilin luominen epäonnistui:", insertError);
        return;
      }

      // Haetaan profiili uudelleen, myös jos toinen käyttäjä loi sen samaan aikaan.
      return loadDogProfile();
    }

    currentName = data.name || "";
    dogNameDisplay.textContent = currentName || "Oma koira";

    if (document.activeElement !== dogNameInput) {
      dogNameInput.value = currentName;
      showDogName();
    }

    if (!data.photo_path) {
      dogAvatar.src = defaultDogAvatar;
      return;
    }

    const { data: imageData, error: imageError } = await supabase.storage
      .from("dog-photos")
      .createSignedUrl(data.photo_path, 60 * 60);

    if (imageError) {
      console.error("Koiran kuvan lataaminen epäonnistui:", imageError);
      dogAvatar.src = defaultDogAvatar;
      return;
    }

    dogAvatar.src = imageData.signedUrl;
  }

  async function saveDogName() {
    const name = dogNameInput.value.trim();

    if (name === currentName) {
      showDogName();
      return;
    }

    const { error } = await supabase
      .from("dog_profile")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("diary_id", diaryId);

    if (error) {
      console.error("Koiran nimen tallentaminen epäonnistui:", error);
      alert("Koiran nimen tallentaminen epäonnistui. Yritä uudelleen.");
      dogNameInput.value = currentName;
      showDogName();
      return;
    }

    currentName = name;
    dogNameDisplay.textContent = name || "Oma koira";
    showDogName();
  }

  async function uploadDogPhoto(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Valitse kuvatiedosto.");
      dogPhotoInput.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      alert("Valitse enintään 1 Mt:n kokoinen kuva.");
      dogPhotoInput.value = "";
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"];

    if (!allowedExtensions.includes(extension)) {
      alert("Käytä JPG-, PNG-, WEBP- tai GIF-kuvaa.");
      dogPhotoInput.value = "";
      return;
    }

    const photoPath = `${diaryId}/dog-photo.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("dog-photos")
      .upload(photoPath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Koiran kuvan tallentaminen epäonnistui:", uploadError);
      alert("Kuvan tallentaminen epäonnistui. Yritä uudelleen.");
      dogPhotoInput.value = "";
      return;
    }

    const { error: updateError } = await supabase
      .from("dog_profile")
      .update({
        photo_path: photoPath,
        updated_at: new Date().toISOString(),
      })
      .eq("diary_id", diaryId);

    if (updateError) {
      console.error(
        "Koiran profiilikuvan päivittäminen epäonnistui:",
        updateError,
      );
      alert("Kuvan tallennus epäonnistui. Yritä uudelleen.");
      return;
    }

    await loadDogProfile();
    dogPhotoInput.value = "";
  }

  dogNameDisplay.addEventListener("click", editDogName);

  dogNameDisplay.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      editDogName();
    }
  });

  dogNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      dogNameInput.blur();
    }

    if (event.key === "Escape") {
      dogNameInput.value = currentName;
      showDogName();
    }
  });

  dogNameInput.addEventListener("blur", saveDogName);

  dogPhotoInput.addEventListener("change", () => {
    uploadDogPhoto(dogPhotoInput.files[0]);
  });

  async function initializeProfile() {
    const { data: membership, error: membershipError } = await supabase
      .from("diary_members")
      .select("diary_id")
      .single();

    if (membershipError) {
      console.error("Päiväkirjan hakeminen epäonnistui:", membershipError);
      return;
    }

    diaryId = membership.diary_id;

    await loadDogProfile();

    if (profileChannel) {
      await supabase.removeChannel(profileChannel);
    }

    profileChannel = supabase
      .channel(`dog-profile-${diaryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dog_profile",
          filter: `diary_id=eq.${diaryId}`,
        },
        () => {
          loadDogProfile();
        },
      )
      .subscribe();
  }

  initializeProfile();
}
