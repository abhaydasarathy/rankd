import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { PLACEMENT_CATEGORIES } from "../data/categories.js";

/**
 * Normalizes category IDs between canonical slugs and legacy aliases
 */
export function normalizeCategoryId(catId) {
  if (!catId) return "academics";
  const lower = catId.toLowerCase().trim();
  if (lower === "coding_practice" || lower === "coding" || lower === "coding-platform") {
    return "coding-platforms";
  }
  if (lower === "inhouse" || lower === "inhouse_projects" || lower === "inhouseprojects") {
    return "inhouse-projects";
  }
  if (lower === "memberships") {
    return "membership";
  }
  return lower;
}

/**
 * Fetch all 11 placement categories from Supabase, falling back to canonical categories.js
 */
export async function getPlacementCategories() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("placement_categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((cat) => ({
          id: cat.id,
          title: cat.title,
          shortDescription: cat.short_description,
          rubricText: cat.rubric_text,
          iconName: cat.icon_name,
          maxMarks: Number(cat.max_marks),
          displayOrder: cat.display_order,
          isActive: cat.is_active !== false,
          updateFormType: getFormTypeForCategory(cat.id),
        }));
      }
    } catch (err) {
      console.warn("Notice: Fetching placement_categories from DB fallback to local rubric:", err);
    }
  }

  // Authoritative fallback
  return PLACEMENT_CATEGORIES.map((cat, idx) => ({
    ...cat,
    displayOrder: idx + 1,
    isActive: true,
  }));
}

/**
 * Returns the form type used by CategorySheet
 */
export function getFormTypeForCategory(categoryId) {
  const norm = normalizeCategoryId(categoryId);
  switch (norm) {
    case "academics": return "academics";
    case "github": return "github";
    case "coding-platforms": return "coding";
    case "internship": return "internship";
    case "skillset": return "skillset";
    case "projects": return "projects";
    case "fullstack": return "fullstack";
    case "hackathons": return "hackathons";
    case "inhouse-projects": return "inhouse";
    case "membership": return "membership";
    case "assessments": return "assessments";
    default: return "generic";
  }
}

/**
 * Find single category by ID
 */
export async function getCategoryById(categoryId) {
  const norm = normalizeCategoryId(categoryId);
  const categories = await getPlacementCategories();
  return categories.find((c) => normalizeCategoryId(c.id) === norm) || null;
}
