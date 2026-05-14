export type LocalizedName = { en: string; ko: string | null };

export type ItemCategory =
  | "raw"
  | "ingot"
  | "part"
  | "fluid"
  | "fuel"
  | "ammo"
  | "equipment"
  | "nuclear"
  | "biomass"
  | "special";

export interface RecipeRef {
  recipe: string;
  alternate: boolean;
  amount: number;
}

export interface Item {
  class_name: string;
  slug: string;
  name: LocalizedName;
  category: ItemCategory;
  stack_size: number | null;
  sink_points: number | null;
  energy_value_mj: number | null;
  radioactive_decay: number | null;
  is_fluid: boolean;
  description_en: string | null;
  icon: string;
  produced_by: RecipeRef[];
  consumed_in: RecipeRef[];
}

export interface Stack {
  item: string;
  amount: number;
}

export interface RecipeUnlock {
  source: "milestone" | "mam" | "alternate" | "tutorial" | "default" | "other" | string;
  schematic_class?: string;
  schematic_name?: string;
  tier?: number;
  en: string;
  ko: string;
}

export interface Recipe {
  class_name: string;
  slug: string;
  name: LocalizedName;
  alternate: boolean;
  for_building: boolean;
  in_hand: boolean;
  in_workshop: boolean;
  in_machine: boolean;
  time_seconds: number;
  produced_in: string[];
  ingredients: Stack[];
  products: Stack[];
  unlock: RecipeUnlock;
}

export interface ItemsFile {
  items: Item[];
}

export interface RecipesFile {
  recipes: Recipe[];
}
