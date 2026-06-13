import type { Item, Recipe } from "../types/data";
import { itemByClass, recipeByClass } from "./data";

/**
 * 생산 의존성 그래프.
 *
 * - 노드 두 종류:
 *   - kind="item":   아이템·유체 (원형)
 *   - kind="recipe": 빌딩+레시피 (라운드 사각형). outputItemClass 로
 *     이 레시피가 어느 아이템을 만드는지 추적 — 노드 클릭 시 후보 변경.
 * - 엣지 방향: 재료 아이템 → 레시피 → 산물 아이템
 * - 최종 아이템에서 역방향으로 펼친다. 원자재(category=raw) 거나
 *   produced_by 가 비어있으면 종료. 사이클은 visited set 으로 차단.
 * - 분량/소요시간은 다이어그램에 표시하지 않는다 (사용자 요구사항).
 *
 * 레시피 선택 cascade:
 *   1) overrides[itemClass] 가 있으면 그 레시피
 *   2) 없으면 default: for_building=false ∧ alternate=false 우선
 *   3) 그것도 없으면 alt 중 첫 항목 (정렬: alternate=false → alternate=true)
 */

export type CalcNode =
  | { id: string; kind: "item"; item: Item }
  | { id: string; kind: "recipe"; recipe: Recipe; outputItemClass: string };

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

/**
 * 어떤 아이템을 만들 수 있는 후보 레시피 전체. for_building 제외.
 * 정렬: 기본(non-alternate) 먼저, 그 다음 alt.
 */
export function recipesForItem(itemClass: string): Recipe[] {
  const item = itemByClass.get(itemClass);
  if (!item) return [];
  const candidates = item.produced_by
    .map((p) => recipeByClass.get(p.recipe))
    .filter((r): r is Recipe => !!r && !r.for_building);
  return [...candidates].sort((a, b) => {
    if (a.alternate !== b.alternate) return a.alternate ? 1 : -1;
    return a.name.en.localeCompare(b.name.en);
  });
}

export function pickDefaultRecipe(itemClass: string): Recipe | null {
  const list = recipesForItem(itemClass);
  return list[0] ?? null;
}

function pickRecipeWithOverride(itemClass: string, overrides: Record<string, string>): Recipe | null {
  const cn = overrides[itemClass];
  if (cn) {
    const r = recipeByClass.get(cn);
    if (r && !r.for_building) return r;
  }
  return pickDefaultRecipe(itemClass);
}

/**
 * 트리 노드 — 들여쓰기 트리 / BOM 표용.
 *
 *   id          : 트리 안에서 유일 (같은 item 이 여러 경로에 나와도 다른 id)
 *   itemClass   : 아이템 class_name
 *   demand      : 루트 1 개 만들기 위한 이 아이템의 누적 필요 수량
 *   recipe      : 사용 레시피. raw / produced_by 비어있으면 null
 *   cycles      : 그 레시피를 몇 사이클 돌려야 하는지 (= demand / 사이클당 산출)
 *   children    : 재료 트리 (재귀)
 *   isRaw       : 더 이상 내려갈 곳 없는 원료
 *   cycleStop   : 사이클 방지로 멈춘 노드 (children 비어있어도 ingredient 있음)
 */
export interface TreeNode {
  id: string;
  itemClass: string;
  item: Item;
  demand: number;
  recipe: Recipe | null;
  cycles: number;
  children: TreeNode[];
  isRaw: boolean;
  cycleStop?: boolean;
}

export function buildProductionTree(
  rootItemClass: string,
  overrides: Record<string, string> = {},
  rootQty = 1,
  maxDepth = 16,
): TreeNode | null {
  const rootItem = itemByClass.get(rootItemClass);
  if (!rootItem) return null;
  let counter = 0;

  function walk(
    itemClass: string,
    demand: number,
    depth: number,
    visited: Set<string>,
  ): TreeNode | null {
    if (depth > maxDepth) return null;
    const item = itemByClass.get(itemClass);
    if (!item) return null;

    const id = `n${counter++}`;
    const isRaw = item.category === "raw" || item.produced_by.length === 0;
    const recipe = isRaw ? null : pickRecipeWithOverride(itemClass, overrides);
    let cycles = 0;
    const children: TreeNode[] = [];
    let cycleStop = false;

    if (recipe) {
      const productAmount = recipe.products.find((p) => p.item === itemClass)?.amount ?? 1;
      cycles = demand / productAmount;

      if (visited.has(recipe.class_name)) {
        cycleStop = true;
      } else {
        const newVisited = new Set(visited);
        newVisited.add(recipe.class_name);
        for (const ing of recipe.ingredients) {
          const child = walk(ing.item, cycles * ing.amount, depth + 1, newVisited);
          if (child) children.push(child);
        }
      }
    }

    return { id, itemClass, item, demand, recipe, cycles, children, isRaw, cycleStop };
  }

  return walk(rootItemClass, rootQty, 0, new Set());
}

/**
 * BOM 행 — 트리를 itemClass 기준으로 평탄화 + dedup.
 * 같은 item 이 여러 경로에 등장하면 demand 와 cycles 합산, depth 는 최소값.
 */
export interface BomRow {
  depth: number;
  itemClass: string;
  item: Item;
  demand: number;
  recipe: Recipe | null;
  cycles: number;
  building: string | null;
  isRaw: boolean;
}

export function flattenToBom(tree: TreeNode): BomRow[] {
  const rows = new Map<string, BomRow>();
  function visit(node: TreeNode, depth: number) {
    const existing = rows.get(node.itemClass);
    if (existing) {
      existing.depth = Math.min(existing.depth, depth);
      existing.demand += node.demand;
      existing.cycles += node.cycles;
    } else {
      rows.set(node.itemClass, {
        depth,
        itemClass: node.itemClass,
        item: node.item,
        demand: node.demand,
        recipe: node.recipe,
        cycles: node.cycles,
        building: node.recipe?.produced_in[0] ?? null,
        isRaw: node.isRaw,
      });
    }
    for (const c of node.children) visit(c, depth + 1);
  }
  visit(tree, 0);
  return Array.from(rows.values()).sort(
    (a, b) => a.depth - b.depth || a.item.name.en.localeCompare(b.item.name.en),
  );
}

export function buildProductionGraph(
  rootItemClass: string,
  overrides: Record<string, string> = {},
  maxDepth = 16,
): CalcGraph {
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
    if (item.category === "raw" || item.produced_by.length === 0) return;
    const recipe = pickRecipeWithOverride(itemClass, overrides);
    if (!recipe) return;
    const recipeNodeId = `recipe:${recipe.class_name}::${itemClass}`;
    if (visitedRecipes.has(recipeNodeId)) {
      edges.push({ id: `${recipeNodeId}->${itemNodeId}`, source: recipeNodeId, target: itemNodeId });
      return;
    }
    visitedRecipes.add(recipeNodeId);
    nodes.set(recipeNodeId, { id: recipeNodeId, kind: "recipe", recipe, outputItemClass: itemClass });
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
