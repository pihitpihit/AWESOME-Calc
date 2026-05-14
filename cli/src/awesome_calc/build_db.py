"""
Satisfactory 정적 DB 빌더.

cli/sources/data.json (greeny/SatisfactoryTools 파생, v1.0+ 컨텐츠) 과
cli/i18n/ko.yaml 의 한국어 매핑을 합쳐 data/items.yaml, data/recipes.yaml 을 생성한다.

실행: python -m awesome_calc.build_db  또는  python cli/src/awesome_calc/build_db.py
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[3]
CLI = ROOT / "cli"
DATA_DIR = ROOT / "data"

SOURCE_JSON = CLI / "sources" / "data.json"
KO_YAML = CLI / "i18n" / "ko.yaml"
OUT_ITEMS = DATA_DIR / "items.yaml"
OUT_RECIPES = DATA_DIR / "recipes.yaml"


RAW_ORES = {
    "Desc_OreIron_C", "Desc_OreCopper_C", "Desc_Stone_C", "Desc_Coal_C",
    "Desc_OreGold_C", "Desc_Sulfur_C", "Desc_OreBauxite_C", "Desc_RawQuartz_C",
    "Desc_OreUranium_C", "Desc_LiquidOil_C", "Desc_Water_C",
    "Desc_NitrogenGas_C", "Desc_SAM_C",
}
AMMO_HINTS = ("rebar", "nobelisk", "cartridge", "snowball", "spike", "rebargun")
EQUIP_HINTS = (
    "hazmatsuit", "jetpack", "hoverpack", "filter", "gasmask", "parachute",
    "scanner", "miner", "beacon", "zipline", "bladerunners", "chainsaw",
    "detonator", "rifle", "inhaler", "golfcart", "jumpingstilts",
    "shockshank", "stunspear",
)
SPECIAL = {
    "Desc_MercerSphere_C", "Desc_SomerSloop_C", "Desc_WAT1_C", "Desc_WAT2_C",
    "Desc_ResourceSinkCoupon_C", "Desc_HardDrive_C", "Desc_Gift_C",
    "special__power", "special__sinkPoint",
}
BIOMASS_HINTS = ("mycelia", "leaves", "wood", "biomass", "biofuel", "flowerpetals", "berry", "shroom", "nut_")
POWER_SLUGS = {"Desc_Crystal_C", "Desc_Crystal_mk2_C", "Desc_Crystal_mk3_C", "Desc_CrystalShard_C"}


def categorize(class_name: str, item: dict) -> str:
    cn = class_name
    cnl = cn.lower()
    if cn in RAW_ORES:
        return "raw"
    if item.get("liquid"):
        return "fluid"
    if cn in SPECIAL:
        return "special"
    if cn in POWER_SLUGS:
        return "special"
    if any(h in cnl for h in AMMO_HINTS):
        return "ammo"
    if any(h in cnl for h in EQUIP_HINTS):
        return "equipment"
    if any(h in cnl for h in BIOMASS_HINTS):
        return "biomass"
    if item.get("radioactiveDecay", 0):
        return "nuclear"
    if item.get("energyValue", 0) and ("fuel" in cnl or "coke" in cnl or "rod" in cnl or "cell" in cnl):
        return "fuel"
    if "ingot" in cnl:
        return "ingot"
    return "part"


def build_unlock_map(schematics: dict) -> dict[str, list[dict]]:
    """recipe class_name -> list of schematics that unlock it."""
    m: dict[str, list[dict]] = defaultdict(list)
    for sc_id, sc in schematics.items():
        for r in sc.get("unlock", {}).get("recipes", []) or []:
            m[r].append(sc)
    return m


_UNLOCK_PRIORITY = {
    "EST_Alternate": 0,
    "EST_MAM": 1,
    "EST_Milestone": 2,
    "EST_Tutorial": 3,
    "EST_HardDrive": 0,
    "EST_Customization": 5,
}


def pick_primary_schematic(schematics: list[dict]) -> dict | None:
    if not schematics:
        return None
    return sorted(
        schematics,
        key=lambda s: (_UNLOCK_PRIORITY.get(s.get("type", ""), 9), s.get("tier") or 99),
    )[0]


def unlock_label(schematics: list[dict]) -> dict:
    sc = pick_primary_schematic(schematics)
    if sc is None:
        return {
            "source": "default",
            "en": "Available from start",
            "ko": "기본 (시작 시)",
        }
    t = sc.get("type", "")
    name = sc.get("name", "")
    tier = sc.get("tier")
    out = {
        "source": t.replace("EST_", "").lower() if t else "other",
        "schematic_class": sc.get("className"),
        "schematic_name": name,
    }
    if tier is not None and t == "EST_Milestone":
        out["tier"] = tier
        out["en"] = f"Milestone: {name} (Tier {tier})"
        out["ko"] = f"마일스톤: {name} (티어 {tier})"
    elif t == "EST_MAM":
        out["en"] = f"MAM: {name}"
        out["ko"] = f"MAM 연구: {name}"
    elif t == "EST_Alternate":
        out["en"] = f"Hard Drive: {name}"
        out["ko"] = f"하드 드라이브: {name}"
    elif t == "EST_Tutorial":
        out["en"] = f"Tutorial: {name}"
        out["ko"] = f"튜토리얼: {name}"
    else:
        out["en"] = name or "Unknown"
        out["ko"] = name or "알 수 없음"
    return out


def build_item_recipe_index(recipes: dict) -> tuple[dict, dict]:
    produced_by: dict[str, list] = defaultdict(list)
    consumed_in: dict[str, list] = defaultdict(list)
    for r_id, r in recipes.items():
        is_alt = bool(r.get("alternate"))
        for p in r.get("products", []):
            produced_by[p["item"]].append({
                "recipe": r_id,
                "alternate": is_alt,
                "amount": p["amount"],
            })
        for ing in r.get("ingredients", []):
            consumed_in[ing["item"]].append({
                "recipe": r_id,
                "alternate": is_alt,
                "amount": ing["amount"],
            })
    for d in (produced_by, consumed_in):
        for k in d:
            d[k].sort(key=lambda x: (x["alternate"], x["recipe"]))
    return produced_by, consumed_in


def load_yaml(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def write_yaml(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        f.write("# 자동 생성 — `python cli/src/awesome_calc/build_db.py` 로 재생성.\n")
        f.write("# 수동 편집하지 말 것. 한국어는 cli/i18n/ko.yaml 에서 관리한다.\n")
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False, width=160, default_flow_style=False)


def main() -> None:
    raw = json.loads(SOURCE_JSON.read_text(encoding="utf-8"))
    ko_map = load_yaml(KO_YAML)
    ko_items = ko_map.get("items", {}) or {}
    ko_recipes = ko_map.get("recipes", {}) or {}

    unlock_map = build_unlock_map(raw["schematics"])
    produced_by, consumed_in = build_item_recipe_index(raw["recipes"])

    items_out = []
    for class_name in sorted(raw["items"]):
        it = raw["items"][class_name]
        items_out.append({
            "class_name": class_name,
            "slug": it["slug"],
            "name": {
                "en": it["name"],
                "ko": ko_items.get(class_name),
            },
            "category": categorize(class_name, it),
            "stack_size": it.get("stackSize"),
            "sink_points": it.get("sinkPoints") or None,
            "energy_value_mj": it.get("energyValue") or None,
            "radioactive_decay": it.get("radioactiveDecay") or None,
            "is_fluid": bool(it.get("liquid")),
            "description_en": (it.get("description") or "").strip() or None,
            "icon": f"icons/{it['slug']}_64.png",
            "produced_by": produced_by.get(class_name, []),
            "consumed_in": consumed_in.get(class_name, []),
        })

    recipes_out = []
    for class_name in sorted(raw["recipes"]):
        r = raw["recipes"][class_name]
        recipes_out.append({
            "class_name": class_name,
            "slug": r["slug"],
            "name": {
                "en": r["name"],
                "ko": ko_recipes.get(class_name),
            },
            "alternate": bool(r.get("alternate")),
            "for_building": bool(r.get("forBuilding")),
            "in_hand": bool(r.get("inHand")),
            "in_workshop": bool(r.get("inWorkshop")),
            "in_machine": bool(r.get("inMachine")),
            "time_seconds": r.get("time"),
            "produced_in": r.get("producedIn") or [],
            "ingredients": [{"item": i["item"], "amount": i["amount"]} for i in r["ingredients"]],
            "products":    [{"item": p["item"], "amount": p["amount"]} for p in r["products"]],
            "unlock": unlock_label(unlock_map.get(class_name, [])),
        })

    write_yaml(OUT_ITEMS, {"items": items_out})
    write_yaml(OUT_RECIPES, {"recipes": recipes_out})

    # Stats
    by_cat: dict[str, int] = defaultdict(int)
    ko_missing_items = 0
    for it in items_out:
        by_cat[it["category"]] += 1
        if not it["name"]["ko"]:
            ko_missing_items += 1
    ko_missing_recipes = sum(1 for r in recipes_out if not r["name"]["ko"])

    print(f"Items   : {len(items_out)}  (ko missing: {ko_missing_items})")
    print(f"Recipes : {len(recipes_out)}  (ko missing: {ko_missing_recipes})")
    print("Item categories:", dict(by_cat))


if __name__ == "__main__":
    main()
