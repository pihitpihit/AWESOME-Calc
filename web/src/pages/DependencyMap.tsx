import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";

import { displayName, iconUrl, itemByClass, recipes } from "../lib/data";
import type { Item, Recipe } from "../types/data";

// ── Constants ────────────────────────────────────────────────────────────────

const RECIPE_W = 260;
const RECIPE_H = 80;
const SOURCE_W = 160;
const SOURCE_H = 52;

const SAM_INGREDIENT = "Desc_SAMIngot_C";

/** 빌딩 class_name → 한글 짧은 이름. */
const BUILDING_LABEL: Record<string, string> = {
  Desc_AssemblerMk1_C: "조립기",
  Desc_Blender_C: "혼합기",
  Desc_ConstructorMk1_C: "제작기",
  Desc_Converter_C: "변환기",
  Desc_FoundryMk1_C: "주조소",
  Desc_HadronCollider_C: "입자가속기",
  Desc_ManufacturerMk1_C: "제조기",
  Desc_OilRefinery_C: "정유소",
  Desc_Packager_C: "패키저",
  Desc_QuantumEncoder_C: "양자인코더",
  Desc_SmelterMk1_C: "제련소",
};

function buildingShort(cn?: string): string {
  if (!cn) return "—";
  return BUILDING_LABEL[cn] ?? cn.replace(/^Desc_/, "").replace(/_C$/, "").replace(/Mk1$/, "");
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function DependencyMap() {
  const flow = useMemo(() => buildAndLayout(), []);

  return (
    <div className="min-w-0">
      {/* Sticky header */}
      <div className="sticky top-12 z-20 bg-ficsit-dark py-3 space-y-2 border-b border-ficsit-border">
        <header>
          <h1 className="text-2xl font-bold">전체 의존성 지도</h1>
          <p className="text-sm text-zinc-400">
            모든 레시피의 입력 → 출력 관계를 한 캔버스에서. 드래그로 이동, 휠로 확대/축소.
            <span className="text-zinc-600 ml-2">
              · 빌딩 건축 / Reanimated SAM 합성 제외 · {flow.recipeCount}개 레시피 / {flow.sourceCount}개 원천
            </span>
          </p>
        </header>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-zinc-500 bg-ficsit-panel" />
            기본 레시피
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-cyan-400/70 bg-ficsit-panel" />
            대체 레시피
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-ficsit-orange bg-ficsit-dark" />
            원천 (채굴 · 채집)
          </span>
        </div>
      </div>

      <div
        className="panel w-full min-w-0 overflow-hidden mt-3"
        style={{ height: "calc(100vh - 220px)", minHeight: 500 }}
      >
        <ReactFlowProvider>
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            nodeTypes={NODE_TYPES}
            defaultViewport={{ x: 40, y: 40, zoom: 0.6 }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            elementsSelectable={false}
            panOnDrag
            panOnScroll
            zoomOnScroll
          >
            <Background gap={32} size={1} color="#27272a" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

// ── Custom Nodes ─────────────────────────────────────────────────────────────

function SourceNode({ data }: { data: { item: Item } }) {
  const { item } = data;
  return (
    <Link
      to={`/items/${item.slug}`}
      className="flex items-center gap-2 rounded-full bg-ficsit-dark border-2 border-ficsit-orange px-2 py-1 no-underline"
      style={{ width: SOURCE_W, height: SOURCE_H }}
    >
      <img
        src={iconUrl(item.slug)}
        width={36}
        height={36}
        className="rounded-sm bg-ficsit-panel shrink-0"
        alt=""
      />
      <span className="text-xs text-zinc-100 truncate flex-1">{displayName(item.name)}</span>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-zinc-600 !border-0"
      />
    </Link>
  );
}

function RecipeNode({ data }: { data: { recipe: Recipe } }) {
  const { recipe: r } = data;
  const product = r.products[0] ? itemByClass.get(r.products[0].item) : undefined;
  const label = buildingShort(r.produced_in[0]);

  return (
    <Link
      to={`/recipes/${r.slug}`}
      className={[
        "flex gap-2 rounded-lg p-2 bg-ficsit-panel border-2 shadow-md no-underline",
        r.alternate ? "border-cyan-400/70" : "border-zinc-500",
      ].join(" ")}
      style={{ width: RECIPE_W, height: RECIPE_H }}
    >
      {product && (
        <img
          src={iconUrl(product.slug)}
          width={48}
          height={48}
          className="rounded-sm bg-ficsit-dark shrink-0 self-center"
          alt=""
        />
      )}
      <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
        <span
          className="text-xs font-medium text-zinc-100 truncate leading-tight"
          title={displayName(r.name)}
        >
          {displayName(r.name)}
        </span>
        <div className="flex items-center gap-1 min-w-0">
          <span
            className="text-[9px] text-zinc-400 font-mono shrink-0 px-1 rounded bg-ficsit-dark"
            title={r.produced_in[0]}
          >
            {label}
          </span>
          {r.ingredients.slice(0, 6).map((ing, i) => {
            const item = itemByClass.get(ing.item);
            if (!item) return null;
            return (
              <img
                key={i}
                src={iconUrl(item.slug)}
                width={16}
                height={16}
                className="rounded-sm bg-ficsit-dark shrink-0"
                alt=""
                title={`×${ing.amount} ${displayName(item.name)}`}
              />
            );
          })}
          {r.ingredients.length > 6 && (
            <span className="text-[9px] text-zinc-500">+{r.ingredients.length - 6}</span>
          )}
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-zinc-600 !border-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-zinc-600 !border-0"
      />
    </Link>
  );
}

const NODE_TYPES = {
  depSource: SourceNode,
  depRecipe: RecipeNode,
};

// ── Graph Construction ───────────────────────────────────────────────────────

interface DepNode {
  id: string;
  kind: "source" | "recipe";
  item?: Item;
  recipe?: Recipe;
}

interface DepEdge {
  id: string;
  source: string;
  target: string;
}

/**
 * 전체 의존성 그래프 빌드 + dagre LR 레이아웃.
 *
 * 필터링:
 *   - for_building 제외
 *   - Converter 빌딩에서 SAM Ingot 을 재료로 쓰는 레시피 (Reanimated SAM 합성) 제외
 *     비-SAM Converter 레시피(Pink Diamond, Excited Photonic Matter 등)는 유지
 *
 * 노드:
 *   - source 노드 = 필터링 후 어떤 레시피도 생산하지 않는 ingredient (원천)
 *   - recipe 노드 = 필터링된 각 레시피
 *
 * 엣지:
 *   - 각 레시피의 ingredient 마다, 그 ingredient 의 producer(들) → 이 레시피로 엣지
 *   - source 인 경우 source 노드 → 이 레시피
 */
function buildAndLayout() {
  const filtered = recipes.filter((r) => {
    if (r.for_building) return false;
    const isSamSynthesis =
      r.produced_in.some((b) => b.includes("Converter")) &&
      r.ingredients.some((i) => i.item === SAM_INGREDIENT);
    return !isSamSynthesis;
  });

  // 필터링된 레시피 중 어떤 것이라도 생산하는 item class
  const producedClasses = new Set<string>();
  for (const r of filtered) {
    for (const p of r.products) producedClasses.add(p.item);
  }

  // 원천: ingredient 로 등장하지만 어떤 필터링 레시피도 생산하지 않음
  const sourceClasses = new Set<string>();
  for (const r of filtered) {
    for (const ing of r.ingredients) {
      if (!producedClasses.has(ing.item)) sourceClasses.add(ing.item);
    }
  }

  // item class → 이 item 을 생산하는 대표 recipe 노드 ID (기본 우선, 없으면 첫 대체)
  // 엣지가 너무 많아지면 레이아웃이 비대해지므로 ingredient 마다 하나의 producer 만 그린다.
  // 대체 레시피는 outgoing 엣지 없이 leaf 처럼 표시됨 — 노드 자체와 ingredient 입력만 보인다.
  const primaryProducerByItem = new Map<string, string>();
  for (const r of filtered) {
    if (r.alternate) continue;
    for (const p of r.products) {
      if (!primaryProducerByItem.has(p.item)) {
        primaryProducerByItem.set(p.item, `rec:${r.class_name}`);
      }
    }
  }
  // 기본 레시피가 없는 item 은 대체 레시피라도 사용
  for (const r of filtered) {
    for (const p of r.products) {
      if (!primaryProducerByItem.has(p.item)) {
        primaryProducerByItem.set(p.item, `rec:${r.class_name}`);
      }
    }
  }

  const nodes: DepNode[] = [];
  for (const cn of sourceClasses) {
    const it = itemByClass.get(cn);
    if (it) nodes.push({ id: `src:${cn}`, kind: "source", item: it });
  }
  for (const r of filtered) {
    nodes.push({ id: `rec:${r.class_name}`, kind: "recipe", recipe: r });
  }

  const edges: DepEdge[] = [];
  for (const r of filtered) {
    const targetId = `rec:${r.class_name}`;
    const seen = new Set<string>();
    for (const ing of r.ingredients) {
      let srcId: string | undefined;
      if (sourceClasses.has(ing.item)) {
        srcId = `src:${ing.item}`;
      } else {
        srcId = primaryProducerByItem.get(ing.item);
      }
      if (!srcId || srcId === targetId) continue;
      const id = `${srcId}->${targetId}`;
      if (!seen.has(id)) {
        edges.push({ id, source: srcId, target: targetId });
        seen.add(id);
      }
    }
  }

  return layout({ nodes, edges });
}

function layout(graph: { nodes: DepNode[]; edges: DepEdge[] }) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    nodesep: 12,
    ranksep: 60,
    edgesep: 6,
    marginx: 32,
    marginy: 32,
    ranker: "network-simplex",
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of graph.nodes) {
    const size =
      n.kind === "source"
        ? { width: SOURCE_W, height: SOURCE_H }
        : { width: RECIPE_W, height: RECIPE_H };
    g.setNode(n.id, size);
  }
  for (const e of graph.edges) {
    g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  const nodes: Node[] = graph.nodes.map((n) => {
    const pos = g.node(n.id);
    const size =
      n.kind === "source"
        ? { width: SOURCE_W, height: SOURCE_H }
        : { width: RECIPE_W, height: RECIPE_H };
    return {
      id: n.id,
      type: n.kind === "source" ? "depSource" : "depRecipe",
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
      data: n.kind === "source" ? { item: n.item } : { recipe: n.recipe },
      draggable: false,
      selectable: false,
    };
  });

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    style: { stroke: "#3f3f46", strokeWidth: 1 },
    animated: false,
  }));

  const sourceCount = graph.nodes.filter((n) => n.kind === "source").length;
  const recipeCount = graph.nodes.filter((n) => n.kind === "recipe").length;

  return { nodes, edges, sourceCount, recipeCount };
}
