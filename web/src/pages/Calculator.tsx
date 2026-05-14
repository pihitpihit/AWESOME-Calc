import { useCallback, useEffect, useMemo, useState } from "react";
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
import { CATEGORY_LABELS, displayName, itemBySlug } from "../lib/data";
import { buildProductionGraph, pickDefaultRecipe, type CalcGraph } from "../lib/calc";
import { nodeTypes, type RecipeFlowNodeData } from "../components/calc-nodes";
import { edgeTypes } from "../components/calc-edges";
import { Section } from "../components/Section";
import { RecipePickerModal } from "../components/RecipePickerModal";
import { ItemBrowser } from "../components/ItemBrowser";

const ITEM_NODE_W = 140;
const ITEM_NODE_H = 110;
const RECIPE_NODE_W = 220;
const RECIPE_NODE_H = 92;

function nodeSize(kind: "item" | "recipe") {
  return kind === "item"
    ? { width: ITEM_NODE_W, height: ITEM_NODE_H }
    : { width: RECIPE_NODE_W, height: RECIPE_NODE_H };
}

function layout(graph: CalcGraph, onPick: RecipeFlowNodeData["onPick"]) {
  const g = new dagre.graphlib.Graph();
  // edgesep 늘려 라인 간 간격 확보. ranker 'tight-tree' 가 layered 다이어그램에서
  // edge waypoint 품질이 안정적.
  g.setGraph({
    rankdir: "BT",
    nodesep: 48,
    ranksep: 110,
    edgesep: 20,
    marginx: 24,
    marginy: 24,
    ranker: "tight-tree",
  });
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

  const edges: Edge[] = graph.edges.map((e) => {
    // dagre 의 edge waypoint — 노드를 우회하는 라우팅.
    // ChevronEdge 가 이걸 받아 catmull-rom 곡선으로 그린다.
    const dEdge = g.edge(e.source, e.target);
    const points = dEdge?.points ?? null;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "chevron",
      zIndex: 10,
      data: { points },
    };
  });

  return { nodes, edges };
}

export function Calculator() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const rootItem = slug ? itemBySlug.get(slug) : undefined;

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [pickingForItem, setPickingForItem] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);

  // 루트 아이템이 바뀌면 overrides 초기화
  useEffect(() => {
    setOverrides({});
  }, [rootItem?.class_name]);

  const onPick = useCallback((outputItemClass: string) => {
    setPickingForItem(outputItemClass);
  }, []);

  const graph = useMemo(() => {
    if (!rootItem) return null;
    return buildProductionGraph(rootItem.class_name, overrides);
  }, [rootItem, overrides]);

  const flow = useMemo(() => (graph ? layout(graph, onPick) : null), [graph, onPick]);

  function pickRoot(s: string) {
    setBrowserOpen(false);
    navigate(s ? `/calc/${s}` : "/calc");
  }

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

      {/* 루트 미선택: 큰 ItemBrowser 인라인 */}
      {!rootItem && (
        <Section title="만들고 싶은 아이템을 골라라" description="검색 또는 카테고리 필터, 격자/목록 보기를 사용한다.">
          <ItemBrowser
            onPick={(s) => pickRoot(s)}
            excludeCategories={["special"]}
          />
        </Section>
      )}

      {/* 루트 선택: 작은 헤더 + '다른 아이템 보기' 버튼 + 모달 */}
      {rootItem && (
        <div className="panel p-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[12rem]">
            <div className="text-xs text-zinc-500">현재 선택</div>
            <div className="text-sm text-zinc-100">
              {displayName(rootItem.name)}{" "}
              <span className="text-zinc-500">{rootItem.name.en}</span>
            </div>
          </div>
          <Button onClick={() => setBrowserOpen(true)}>다른 아이템 고르기</Button>
          <Button variant="secondary" onClick={() => pickRoot("")}>
            초기화
          </Button>
        </div>
      )}

      {Object.keys(overrides).length > 0 && (
        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <span>적용된 레시피 변경: {Object.keys(overrides).length}개</span>
          <button
            onClick={() => setOverrides({})}
            className="chip hover:border-ficsit-orange hover:text-ficsit-orange"
          >
            기본값으로 초기화
          </button>
        </div>
      )}

      {!rootItem ? null : !flow || flow.nodes.length <= 1 ? (
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

      {/* 루트 선택 후, 다른 아이템 고르기 모달 */}
      {browserOpen && (
        <BrowserModal onClose={() => setBrowserOpen(false)}>
          <ItemBrowser
            onPick={(s) => pickRoot(s)}
            excludeCategories={["special"]}
            initialView="grid"
            compact
          />
        </BrowserModal>
      )}

      {pickingForItem && (
        <RecipePickerModal
          itemClass={pickingForItem}
          currentRecipeClass={
            overrides[pickingForItem] ?? pickDefaultRecipe(pickingForItem)?.class_name ?? null
          }
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

function BrowserModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="panel max-w-4xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-3 border-b border-ficsit-border flex items-center justify-between">
          <h3 className="text-base font-semibold">아이템 고르기</h3>
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-ficsit-orange"
          >
            닫기 (Esc)
          </button>
        </header>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
}
