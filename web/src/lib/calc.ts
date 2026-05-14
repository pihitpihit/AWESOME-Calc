import type { Item, Recipe } from "../types/data";
import { itemByClass, recipeByClass } from "./data";

/**
 * 생산 의존성 그래프.
 *
 * - 노드 두 종류:
 *   - kind="item":   아이템·유체 (원형 표시)
 *   - kind="recipe": 빌딩+레시피 (라운드 사각형 표시)
 * - 엣지 방향: 재료 아이템 → 레시피 → 산물 아이템
 * - 최종 아이템에서 역방향으로 펼친다. 원자재(category=raw) 거나
 *   produced_by 가 비어있으면 종료. 사이클은 visited set 으로 차단.
 * - 분량/소요시간은 다이어그램에 표시하지 않는다 (사용자 요구사항).
 *
 * 기본 레시피 선택 정책:
 *   1) for_building=false (빌딩 건축 레시피 제외)
 *   2) alternate=false 우선 (없으면 alt 중 첫 항목)
 */

export type CalcNode =
  | { id: string; kind: "item"; item: Item }
  | { id: string; kind: "recipe"; recipe: Recipe };

export interface CalcEdge {
  id: string;
  source: string;
  target: string;
}

export interface CalcGraph {
  nodes: CalcNode[];
  edges: CalcEdge[];
  rootId: string | null;
}

export function pickDefaultRecipe(itemClass: string): Recipe | null {
  const item = itemByClass.get(itemClass);
  if (!item) return null;
  const candidates = item.produced_by
    .map((p) => recipeByClass.get(p.recipe))
    .filter((r): r is Recipe => !!r && !r.for_building);
  if (candidates.length === 0) return null;
  return candidates.find((r) => !r.alternate) ?? candidates[0];
}

export function buildProductionGraph(rootItemClass: string, maxDepth = 16): CalcGraph {
  const nodes = new Map<string, CalcNode>();
  const edges: CalcEdge[] = [];
  const visitedRecipes = new Set<string>();
  const rootItem = itemByClass.get(rootItemClass);
  if (!rootItem) return { nodes: [], edges: [], rootId: null };

  function addItemNode(itemClass: string): string | null {
    const item = itemByClass.get(itemClass);
    if (!item) return null;
    const id = `item:${itemClass}`;
    if (!nodes.has(id)) nodes.set(id, { id, kind: "item", item });
    return id;
  }

  function walk(itemClass: string, depth: number) {
    if (depth > maxDepth) return;
    const itemNodeId = addItemNode(itemClass);
    if (!itemNodeId) return;
    const item = itemByClass.get(itemClass)!;
    // 원자재 또는 생산 불가 → 종료
    if (item.category === "raw" || item.produced_by.length === 0) return;
    const recipe = pickDefaultRecipe(itemClass);
    if (!recipe) return;
    const recipeNodeId = `recipe:${recipe.class_name}`;
    if (visitedRecipes.has(recipe.class_name)) {
      // 사이클: 엣지만 잇고 재귀 중단
      edges.push({ id: `${recipeNodeId}->${itemNodeId}`, source: recipeNodeId, target: itemNodeId });
      return;
    }
    visitedRecipes.add(recipe.class_name);
    nodes.set(recipeNodeId, { id: recipeNodeId, kind: "recipe", recipe });
    edges.push({ id: `${recipeNodeId}->${itemNodeId}`, source: recipeNodeId, target: itemNodeId });
    for (const ing of recipe.ingredients) {
      const ingId = addItemNode(ing.item);
      if (!ingId) continue;
      edges.push({ id: `${ingId}->${recipeNodeId}`, source: ingId, target: recipeNodeId });
      walk(ing.item, depth + 1);
    }
  }

  walk(rootItemClass, 0);
  return {
    nodes: Array.from(nodes.values()),
    edges,
    rootId: `item:${rootItemClass}`,
  };
}
