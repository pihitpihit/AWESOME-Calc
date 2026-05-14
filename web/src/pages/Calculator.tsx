import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";

import { Button } from "@pihitpihit/plastic";
import { CATEGORY_LABELS, displayName, items, itemBySlug } from "../lib/data";
import { buildProductionGraph, pickDefaultRecipe, type CalcGraph } from "../lib/calc";
import { nodeTypes, type RecipeFlowNodeData } from "../components/calc-nodes";
import { edgeTypes } from "../components/calc-edges";
import { Section } from "../components/Section";
import { RecipePickerModal } from "../components/RecipePickerModal";

const ITEM_NODE_W = 140;
const ITEM_NODE_H = 110;
const RECIPE_NODE_W = 220;
const RECIPE_NODE_H = 92;

function nodeSize(kind: "item" | "recipe") {
  return kind === "item"
    ? { width: ITEM_NODE_W, height: ITEM_NODE_H }
    : { width: RECIPE_NODE_W, height: RECIPE_NODE_H };
}

/**
 * dagre 로 BT(아래→위) 자동 레이아웃.
 * - rank 0 (원자재) 가 아래, 최종 산물이 위.
 * - 노드 핸들도 target=Bottom, source=Top 으로 맞춰져 있어야 함.
 */
function layout(graph: CalcGraph, onPick: RecipeFlowNodeData["onPick"]) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "BT", nodesep: 36, ranksep: 90, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of graph.nodes) g.setNode(n.id, nodeSize(n.kind));
  for (const e of graph.edges) g.setEdge(e.source, e.target);
  dagre.layout(g);

  const nodes: Node[] = graph.nodes.map((n) => {
    const pos = g.node(n.id);
    const size = nodeSize(n.kind);
    return {
      id: n.id,
      type: n.kind === "item" ? "itemFlow" : "recipeFlow",
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
      data:
        n.kind === "item"
          ? { item: n.item, isRoot: n.id === graph.rootId }
          : { recipe: n.recipe, outputItemClass: n.outputItemClass, onPick },
      draggable: false,
      selectable: false,
    };
  });

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "chevron",
  }));

  return { nodes, edges };
}

export function Calculator() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const rootItem = slug ? itemBySlug.get(slug) : undefined;

  // 사용자가 명시적으로 고른 레시피들. {itemClass: recipeClass}.
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  // 어떤 산물 아이템에 대해 picker 를 열어둘지.
  const [pickingForItem, setPickingForItem] = useState<string | null>(null);

  // 루트 아이템이 바뀌면 overrides 초기화.
  const rootClass = rootItem?.class_name;
  const overridesForRoot = useMemo(() => {
    void rootClass;
    return overrides;
  }, [rootClass, overrides]);

  const onPick = useCallback((outputItemClass: string) => {
    setPickingForItem(outputItemClass);
  }, []);

  const graph = useMemo(() => {
    if (!rootItem) return null;
    return buildProductionGraph(rootItem.class_name, overridesForRoot);
  }, [rootItem, overridesForRoot]);

  const flow = useMemo(() => (graph ? layout(graph, onPick) : null), [graph, onPick]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">
          생산 의존성 다이어그램
          {rootItem && (
            <>
              {": "}
              <span className="text-ficsit-orange">{displayName(rootItem.name)}</span>
            </>
          )}
        </h1>
        <p className="text-sm text-zinc-400">
          최종 아이템 하나를 만들기 위해 어떤 원료·중간품·빌딩이 필요한지 보여준다.
          기본 레시피로 시작하며, 빌딩/레시피 노드를 클릭해 다른 레시피로 바꿀 수 있다.
          분량/처리량은 표시하지 않는다.
        </p>
      </header>

      <ItemPicker
        initialSlug={slug}
        onPick={(s) => {
          setOverrides({});
          navigate(`/calc/${s}`);
        }}
      />

      {Object.keys(overrides).length > 0 && (
        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <span>적용된 레시피 변경: {Object.keys(overrides).length}개</span>
          <button onClick={() => setOverrides({})} className="chip hover:border-ficsit-orange hover:text-ficsit-orange">
            기본값으로 초기화
          </button>
        </div>
      )}

      {!rootItem ? (
        <Section title="시작" description="위 검색에서 만들고 싶은 아이템을 골라라.">
          <p className="text-sm text-zinc-400">
            예시:{" "}
            {[
              "desc-modularframe-c",
              "desc-modularframeheavy-c",
              "desc-computer-c",
              "desc-motor-c",
              "desc-spaceelevatorpart-1-c",
            ].map((s, i) => {
              const it = itemBySlug.get(s);
              if (!it) return null;
              return (
                <span key={s}>
                  {i > 0 && " · "}
                  <a href={`#/calc/${s}`}>{displayName(it.name)}</a>
                </span>
              );
            })}
          </p>
        </Section>
      ) : !flow || flow.nodes.length <= 1 ? (
        <Section title="해당 아이템은 다이어그램이 없다">
          <p className="text-sm text-zinc-300">
            <span className="chip">{CATEGORY_LABELS[rootItem.category].ko}</span>{" "}
            <strong>{displayName(rootItem.name)}</strong> 는 원자재이거나 일반 생산
            레시피가 없어 의존성 트리가 비어있다.
          </p>
        </Section>
      ) : (
        <div className="panel" style={{ height: "min(80vh, 800px)" }}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={flow.nodes}
              edges={flow.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              proOptions={{ hideAttribution: true }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag
              panOnScroll
              zoomOnScroll
              minZoom={0.15}
              maxZoom={2}
            >
              <Background gap={24} size={1} color="#27272a" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      )}

      <Section title="범례">
        <ul className="text-sm space-y-1.5">
          <li>
            <span className="inline-block align-middle w-5 h-5 mr-2 rounded-full bg-ficsit-panel border-2 border-ficsit-border" />
            아이템 (고체) — 원형
          </li>
          <li>
            <span className="inline-block align-middle w-5 h-5 mr-2 rounded-full bg-ficsit-panel border-2 border-ficsit-border ring-1 ring-cyan-400/60" />
            유체 — 원형 + cyan ring
          </li>
          <li>
            <span className="inline-block align-middle w-9 h-5 mr-2 rounded-md bg-ficsit-panel border-2 border-ficsit-border" />
            빌딩+레시피 — 라운드 사각형 (클릭하면 다른 레시피로 변경)
          </li>
          <li>
            <span className="inline-block align-middle w-5 h-5 mr-2 rounded-full bg-ficsit-panel border-2 border-ficsit-orange" />
            목표 아이템 (루트)
          </li>
          <li className="text-zinc-500">
            방향: 원자재(아래) → 최종 산물(위). 연결선의 chevron 이 흐름 방향을 가리킨다.
          </li>
        </ul>
      </Section>

      {pickingForItem && (
        <RecipePickerModal
          itemClass={pickingForItem}
          currentRecipeClass={overrides[pickingForItem] ?? pickDefaultRecipe(pickingForItem)?.class_name ?? null}
          onSelect={(recipeClass) => {
            const def = pickDefaultRecipe(pickingForItem);
            setOverrides((prev) => {
              const next = { ...prev };
              if (def && def.class_name === recipeClass) {
                delete next[pickingForItem];
              } else {
                next[pickingForItem] = recipeClass;
              }
              return next;
            });
            setPickingForItem(null);
          }}
          onClose={() => setPickingForItem(null)}
        />
      )}
    </div>
  );
}

function ItemPicker({
  initialSlug,
  onPick,
}: {
  initialSlug?: string;
  onPick: (slug: string) => void;
}) {
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const norm = q.trim().toLowerCase();
    if (!norm) return [] as typeof items;
    return items
      .filter(
        (it) =>
          it.category !== "special" &&
          (it.name.en.toLowerCase().includes(norm) ||
            (it.name.ko ?? "").toLowerCase().includes(norm)),
      )
      .slice(0, 12);
  }, [q]);

  return (
    <div className="panel p-3 space-y-2">
      <label className="block text-xs text-zinc-500 mb-1">만들고 싶은 아이템</label>
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="이름 검색 (예: 모듈식 골격, motor)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 panel px-3 py-1.5 text-sm focus:outline-none focus:border-ficsit-orange"
        />
        {initialSlug && (
          <Button onClick={() => onPick("")} variant="secondary">
            초기화
          </Button>
        )}
      </div>
      {matches.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-1">
          {matches.map((it) => (
            <li key={it.slug}>
              <button
                onClick={() => {
                  setQ("");
                  onPick(it.slug);
                }}
                className="chip hover:border-ficsit-orange hover:text-ficsit-orange"
              >
                {displayName(it.name)}
                <span className="text-zinc-500 ml-1.5">{it.name.en}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
