import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";

import { displayName, itemBySlug } from "../lib/data";
import { buildProductionGraph, pickDefaultRecipe, type CalcGraph } from "../lib/calc";
import {
  nodeTypes,
  type ItemFlowNodeData,
  type RecipeFlowNodeData,
} from "../components/calc-nodes";
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

interface NodeClickHandlers {
  onPickRoot: () => void;
  onPickItem: (slug: string) => void;
  onPickRecipe: (outputItemClass: string) => void;
}

function layout(graph: CalcGraph, handlers: NodeClickHandlers) {
  const g = new dagre.graphlib.Graph();
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
    const isRoot = n.id === graph.rootId;
    if (n.kind === "item") {
      return {
        id: n.id,
        type: "itemFlow",
        position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
        data: {
          item: n.item,
          isRoot,
          onClick: isRoot
            ? () => handlers.onPickRoot()
            : () => handlers.onPickItem(n.item.slug),
        } satisfies ItemFlowNodeData,
        draggable: false,
        selectable: true,
      };
    }
    return {
      id: n.id,
      type: "recipeFlow",
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
      data: {
        recipe: n.recipe,
        outputItemClass: n.outputItemClass,
        onClick: () => handlers.onPickRecipe(n.outputItemClass),
      } satisfies RecipeFlowNodeData,
      draggable: false,
      selectable: true,
    };
  });

  const edges: Edge[] = graph.edges.map((e) => {
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

function placeholderFlow(onPickRoot: () => void) {
  return {
    nodes: [
      {
        id: "root-placeholder",
        type: "placeholderFlow",
        position: { x: 0, y: 0 },
        data: { onClick: () => onPickRoot() },
        draggable: false,
        selectable: true,
      } as Node,
    ],
    edges: [] as Edge[],
  };
}

export function Calculator() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const rootItem = slug ? itemBySlug.get(slug) : undefined;

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [pickingForItem, setPickingForItem] = useState<string | null>(null);
  const [rootPickerOpen, setRootPickerOpen] = useState(false);

  useEffect(() => {
    setOverrides({});
  }, [rootItem?.class_name]);

  const graph = useMemo(() => {
    if (!rootItem) return null;
    return buildProductionGraph(rootItem.class_name, overrides);
  }, [rootItem, overrides]);

  const handlers = useMemo<NodeClickHandlers>(
    () => ({
      onPickRoot: () => setRootPickerOpen(true),
      onPickItem: (slug: string) => navigate(`/items/${slug}`),
      onPickRecipe: (outputItemClass: string) => setPickingForItem(outputItemClass),
    }),
    [navigate],
  );

  const flow = useMemo(() => {
    if (!graph) return placeholderFlow(handlers.onPickRoot);
    return layout(graph, handlers);
  }, [graph, handlers]);

  /**
   * 노드 클릭 처리 — xyflow 가 마우스/터치 둘 다 onNodeClick 으로 묶어준다.
   * 노드 type 에 따라 분기.
   */
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === "placeholderFlow") {
        setRootPickerOpen(true);
        return;
      }
      if (node.type === "recipeFlow") {
        const d = node.data as unknown as RecipeFlowNodeData;
        setPickingForItem(d.outputItemClass);
        return;
      }
      if (node.type === "itemFlow") {
        const d = node.data as unknown as ItemFlowNodeData;
        if (d.isRoot) {
          setRootPickerOpen(true);
        } else {
          navigate(`/items/${d.item.slug}`);
        }
      }
    },
    [navigate],
  );

  function pickRoot(s: string) {
    setRootPickerOpen(false);
    navigate(s ? `/calc/${s}` : "/calc");
  }

  return (
    <div className="space-y-4 min-w-0">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold break-words">
          생산 의존성 다이어그램
          {rootItem && (
            <>
              {": "}
              <span className="text-ficsit-orange">{displayName(rootItem.name)}</span>
            </>
          )}
        </h1>
        <p className="text-sm text-zinc-400 break-words">
          {rootItem
            ? "최종 산물 노드를 눌러 다른 아이템으로 변경. 빌딩+레시피 노드를 눌러 대체 레시피 선택."
            : "가운데 점선 노드를 눌러 만들고 싶은 아이템을 선택하라."}
        </p>
      </header>

      {Object.keys(overrides).length > 0 && (
        <div className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
          <span>적용된 레시피 변경: {Object.keys(overrides).length}개</span>
          <button
            onClick={() => setOverrides({})}
            className="chip hover:border-ficsit-orange hover:text-ficsit-orange"
          >
            기본값으로 초기화
          </button>
        </div>
      )}

      <div
        className="panel w-full min-w-0 overflow-hidden"
        style={{ height: "min(75vh, 800px)" }}
      >
        <ReactFlowProvider>
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            nodesFocusable={false}
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

      <Section title="범례">
        <ul className="text-sm space-y-1.5 min-w-0">
          <li>
            <span className="inline-block align-middle w-5 h-5 mr-2 rounded-full bg-ficsit-panel border-2 border-dashed border-ficsit-orange" />
            <strong>비어있는 루트</strong> — 눌러서 만들 아이템 선택
          </li>
          <li>
            <span className="inline-block align-middle w-5 h-5 mr-2 rounded-full bg-ficsit-panel border-2 border-ficsit-orange" />
            목표 아이템 (루트) — 눌러서 다른 아이템으로 변경
          </li>
          <li>
            <span className="inline-block align-middle w-5 h-5 mr-2 rounded-full bg-ficsit-panel border-2 border-ficsit-border" />
            아이템 (고체) — 눌러서 해당 아이템 상세
          </li>
          <li>
            <span className="inline-block align-middle w-5 h-5 mr-2 rounded-full bg-ficsit-panel border-2 border-ficsit-border ring-1 ring-cyan-400/60" />
            유체 — 동일, 옆에 cyan 링
          </li>
          <li>
            <span className="inline-block align-middle w-9 h-5 mr-2 rounded-md bg-ficsit-panel border-2 border-ficsit-border" />
            빌딩+레시피 — 눌러서 대체 레시피 선택
          </li>
          <li className="text-zinc-500">
            방향: 원자재(아래) → 최종 산물(위). 라인의 흐름이 진행 방향.
          </li>
        </ul>
      </Section>

      {rootPickerOpen && (
        <BrowserModal onClose={() => setRootPickerOpen(false)}>
          <ItemBrowser
            onPick={(s) => pickRoot(s)}
            excludeCategories={["special"]}
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
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="panel w-full max-w-4xl my-4 sm:my-8 min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-3 border-b border-ficsit-border flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold truncate">아이템 고르기</h3>
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-ficsit-orange shrink-0"
          >
            닫기 (Esc)
          </button>
        </header>
        <div className="p-3 min-w-0">{children}</div>
      </div>
    </div>
  );
}
