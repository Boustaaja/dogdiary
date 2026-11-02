import { supabase } from "../supabase.js";

// Achievement storage: reads and writes the user-specific showcase selections and current user mapping.
// This makes it easier to keep database access separate from rendering and progress rules.
// Resolve the authenticated account, its shared diary and the matching showcase owner.
export async function getCurrentAchievementUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    console.error("Kirjautuneen käyttäjän haku epäonnistui:", error);
    return null;
  }

  const user = data.user;
  const email = user.email?.toLowerCase();

  let walker = null;

  if (email === "boustaaja@hotmail.com") walker = "Katja";
  if (email === "godek_88@hotmail.com") walker = "Antti";

  if (!walker) {
    console.error("Käyttäjälle ei löytynyt nimeä palkintovalintoihin.");
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("diary_members")
    .select("diary_id")
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    console.error("Päiväkirjan hakeminen epäonnistui:", membershipError);
    return null;
  }

  return {
    userId: user.id,
    diaryId: membership.diary_id,
    walker,
  };
}

// Fetch the badge ids saved for one walker's personal showcase.
export async function getAchievementShowcasePreferences(diaryId, walker) {
  const { data, error } = await supabase
    .from("achievement_showcase_preferences")
    .select("selected_badge_ids")
    .eq("diary_id", diaryId)
    .eq("walker", walker)
    .maybeSingle();

  if (error) {
    console.error("Palkintovalintojen haku epäonnistui:", error);
    return null;
  }

  return data?.selected_badge_ids ?? null;
}

// Persist the selected showcase slots so they remain consistent across sessions.
export async function saveAchievementShowcasePreferences(
  userId,
  diaryId,
  walker,
  selectedBadgeIds,
) {
  const { error } = await supabase
    .from("achievement_showcase_preferences")
    .upsert(
      {
        user_id: userId,
        diary_id: diaryId,
        walker,
        selected_badge_ids: selectedBadgeIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("Palkintovalintojen tallennus epäonnistui:", error);
    return false;
  }

  return true;
}
