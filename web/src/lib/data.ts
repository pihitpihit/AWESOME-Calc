import itemsRaw from "../../../data/items.yaml";
import recipesRaw from "../../../data/recipes.yaml";
import type { Item, ItemsFile, Recipe, RecipesFile } from "../types/data";

export const items: Item[] = (itemsRaw as ItemsFile).items;
export const recipes: Recipe[] = (recipesRaw as RecipesFile).recipes;

export const itemBySlug = new Map(items.map((it) => [it.slug, it]));
export const itemByClass = new Map(items.map((it) => [it.class_name, it]));
export const recipeBySlug = new Map(recipes.map((r) => [r.slug, r]));
export const recipeByClass = new Map(recipes.map((r) => [r.class_name, r]));

export const ICON_BASE = `${import.meta.env.BASE_URL}icons/`;

export function iconUrl(slug: string): string {
  return `${ICON_BASE}${slug}_64.png`;
}

export function displayName(name: { en: string; ko: string | null }, lang: "ko" | "en" = "ko"): string {
  if (lang === "ko") return name.ko ?? name.en;
  return name.en;
}

export function classToItem(cn: string): Item | undefined {
  return itemByClass.get(cn);
}
export function classToRecipe(cn: string): Recipe | undefined {
  return recipeByClass.get(cn);
}

/**
 * 분당 처리량 계산. amount × 60 / time(s). 소수점 둘째 자리에서 반올림.
 * 유체도 동일 식 — 단위(개/분, m³/분)는 호출 측에서 라벨링.
 */
export function perMin(amount: number, timeSeconds: number): number {
  if (!timeSeconds) return 0;
  return Math.round((amount * 60 / timeSeconds) * 100) / 100;
}

/** 아이템이 유체이면 "m³/min", 아니면 "/min" 라벨. */
export function rateLabel(item: Item | undefined): string {
  return item?.is_fluid ? "m³/min" : "/min";
}

export const ITEM_CATEGORIES = [
  "raw",
  "ingot",
  "part",
  "fluid",
  "fuel",
  "ammo",
  "equipment",
  "nuclear",
  "biomass",
  "special",
] as const;

export const CATEGORY_LABELS: Record<(typeof ITEM_CATEGORIES)[number], { en: string; ko: string }> = {
  raw:       { en: "Raw",       ko: "원자재" },
  ingot:     { en: "Ingot",     ko: "주괴" },
  part:      { en: "Part",      ko: "부품" },
  fluid:     { en: "Fluid",     ko: "유체" },
  fuel:      { en: "Fuel",      ko: "연료" },
  ammo:      { en: "Ammo",      ko: "탄약" },
  equipment: { en: "Equipment", ko: "장비" },
  nuclear:   { en: "Nuclear",   ko: "핵" },
  biomass:   { en: "Biomass",   ko: "바이오" },
  special:   { en: "Special",   ko: "특수" },
};

export const UNLOCK_LABELS: Record<string, { en: string; ko: string }> = {
  default:   { en: "Available from start", ko: "기본 (시작 시)" },
  tutorial:  { en: "Tutorial",   ko: "튜토리얼" },
  milestone: { en: "Milestone",  ko: "마일스톤" },
  mam:       { en: "MAM",        ko: "MAM 연구" },
  alternate: { en: "Hard Drive", ko: "하드 드라이브" },
  other:     { en: "Other",      ko: "기타" },
};
