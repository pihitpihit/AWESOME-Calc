import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";

import { displayName, iconUrl, itemByClass, items, recipes } from "../lib/data";
import type { Item, Recipe } from "../types/data";

// ── Constants ────────────────────────────────────────────────────────────────

const RECIPE_W = 260;
const RECIPE_H = 80;
const SOURCE_W = 160;
const SOURCE_H = 52;

const SAM_INGREDIENT = "Desc_SAMIngot_C";

/** 빈 컨테이너 (언패키지 패턴 매칭에 사용). */
const CONTAINER_CLASSES = new Set(["Desc_FluidCanister_C", "Desc_GasTank_C"]);

/**
 * 언패키지 레시피 판정.
 * 패키저에서 "포장된 X" 를 분해해 X + 빈 캐니스터/가스 탱크를 출력하는 레시피.
 * 이름 기반(가장 안전) + 패턴 기반(이름 변동 대비 백업).
 */
function isUnpackagingRecipe(r: Recipe): boolean {
  if (r.name.en.startsWith("Unpackage")) return true;
  if (r.ingredients.length !== 1 || r.products.length !== 2) return false;
  return r.products.some((p) => CONTAINER_CLASSES.has(p.item));
}

/** 휴대용 채광기 — 장비 숨김 시 예외 처리. */
const PORTABLE_MINER_CLASS = "BP_ItemDescriptorPortableMiner_C";

/**
 * 사용자 정책으로 자동 가능 출발점에 추가하는 채집형 (Power Slug 3종).
 * Power Shard 라인의 cycle 을 풀기 위함.
 * 외계 잔해 / 머서 구체 / 소머슬룹 등 그 외 채집물은 비자동 출발점으로 유지.
 */
const FORCE_AUTOMATABLE: Set<string> = new Set([
  "Desc_Crystal_C", // Blue Power Slug
  "Desc_Crystal_mk2_C", // Yellow Power Slug
  "Desc_Crystal_mk3_C", // Purple Power Slug
]);

/**
 * 자동화 가능 아이템 집합 계산 (fixed-point reachability).
 *
 * 출발점:
 *   - 채굴 raw (모든 raw 카테고리)
 *   - 사용자 명시 자동 가능 채집형 (Power Slug 3 종)
 *
 * 비자동 출발점 (자동 set 진입 못함):
 *   - biomass 채집물 (잎/나무/균사체/열매/베리/베이컨)
 *   - 외계 잔해 (Hatcher/Hog/Spitter/Stinger Remains) — 몹 처치 수동
 *   - 머서 구체, 소머슬룹, FICSIT 쿠폰 등
 *   - 작업대 전용 레시피
 *
 * 전파:
 *   - 자동 빌딩(produced_in 비어있지 않음) + 모든 ingredient 자동 → 산물 자동
 *
 * 산물 기준 자동 여부 (isAutomatableRecipe) — 같은 산물의 다른 자동 라인이 있으면 OK.
 */
function computeAutomatableItems(filteredRecipes: Recipe[]): Set<string> {
  const auto = new Set<string>();
  for (const it of items) {
    if (it.category === "raw") {
      auto.add(it.class_name);
    } else if (FORCE_AUTOMATABLE.has(it.class_name)) {
      auto.add(it.class_name);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of filteredRecipes) {
      if (r.produced_in.length === 0) continue; // 작업대 전용
      const allAuto = r.ingredients.every((ing) => auto.has(ing.item));
      if (!allAuto) continue;
      for (const p of r.products) {
        if (!auto.has(p.item)) {
          auto.add(p.item);
          changed = true;
        }
      }
    }
  }
  return auto;
}

/**
 * 레시피의 산물이 자동 가능한 경로가 하나라도 있는지 (= autoItems 에 포함).
 *
 * 사용자 정의: 같은 산물을 만드는 자동 가능한 대체 레시피가 존재하면, 그 산물 자체는
 * 자동화 가능. 따라서 비자동 강조/숨김 대상에서 제외한다.
 * 예: Fabric 기본 레시피(균사체 사용, 비자동)는 Polyester Fabric(자동) 덕분에
 *     직물 자체는 자동 가능 → 빨강 강조 안 함.
 *
 * 결과: "이 레시피로는 자동 불가지만 산물은 다른 라인으로 자동 가능"한 케이스는
 * 자동 가능으로 본다. 진짜 비자동 라인 = 모든 산물이 autoItems 밖.
 */
function isAutomatableRecipe(r: Recipe, autoItems: Set<string>): boolean {
  if (r.products.length === 0) return true;
  return r.products.every((p) => autoItems.has(p.item));
}

/**
 * 장비 레시피 판정. equipment 카테고리의 산물을 만드는 레시피.
 * 휴대용 채광기는 숨김 대상에서 제외 (현장 채굴 도구로 유틸리티가 크다).
 */
function isHidableEquipmentRecipe(r: Recipe): boolean {
  return r.products.some((p) => {
    if (p.item === PORTABLE_MINER_CLASS) return false;
    const item = itemByClass.get(p.item);
    return item?.category === "equipment";
  });
}

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

/** 활성 노드의 outgoing 엣지 (active → other) 색상. 오렌지. */
const OUTGOING_COLOR = "#fa9549";
/** 활성 노드의 incoming 엣지 (other → active) 색상. 시안. */
const INCOMING_COLOR = "#22d3ee";

export function DependencyMap() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [hideUnpackaging, setHideUnpackaging] = useState(true);
  const [hideEquipment, setHideEquipment] = useState(true);
  const [automationMode, setAutomationMode] = useState<AutomationMode>("show");
  // 토글 조합 시 layout 재계산 (~1초). 대체 레시피 묶어보기는 항상 켜진 상태.
  const flow = useMemo(
    () => buildAndLayout({ hideUnpackaging, hideEquipment, automationMode }),
    [hideUnpackaging, hideEquipment, automationMode],
  );

  // 토글로 layout 이 바뀌면 새 그래프가 viewport 밖일 수 있어 자동 fit.
  // 첫 마운트는 defaultViewport 가 처리하므로 skip.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfRef = useRef<ReactFlowInstance<any, any> | null>(null);
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const t = setTimeout(
      () => rfRef.current?.fitView({ padding: 0.1, minZoom: 0.12, maxZoom: 0.6 }),
      150,
    );
    return () => clearTimeout(t);
  }, [hideUnpackaging, hideEquipment, automationMode]);

  /**
   * 전체화면 모드 부수효과:
   *   - body 의 스크롤 잠금 (배경 페이지가 우연히 스크롤되는 것 방지)
   *   - Esc 키로 해제
   */
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isFullscreen]);

  /** 노드 클릭 = 활성/비활성 토글. */
  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  }, []);

  /** 빈 캔버스 클릭 = 모두 해제. */
  const onPaneClick = useCallback(() => setActiveIds(new Set()), []);

  /**
   * 활성 노드와 그 인접 엣지의 시각 강조 적용.
   *   - 활성 노드: 노드 컴포넌트에 isActive=true 전달, z-index 상승
   *   - outgoing(active→타) 엣지: 오렌지, 굵게, animated, z-index 상승
   *   - incoming(타→active) 엣지: 시안, 굵게, z-index 상승
   *   - 양쪽 다 활성: 오렌지+굵게+animated (outgoing 스타일 우선)
   */
  const styledNodes = useMemo(
    () =>
      flow.nodes.map((n) => ({
        ...n,
        zIndex: activeIds.has(n.id) ? 100 : 0,
        data: { ...n.data, isActive: activeIds.has(n.id) },
      })),
    [flow.nodes, activeIds],
  );

  const styledEdges = useMemo(
    () =>
      flow.edges.map((e) => {
        const sourceActive = activeIds.has(e.source);
        const targetActive = activeIds.has(e.target);
        if (sourceActive && targetActive) {
          return {
            ...e,
            style: { stroke: OUTGOING_COLOR, strokeWidth: 3 },
            animated: true,
            zIndex: 50,
          };
        }
        if (sourceActive) {
          return {
            ...e,
            style: { stroke: OUTGOING_COLOR, strokeWidth: 2.5 },
            animated: true,
            zIndex: 20,
          };
        }
        if (targetActive) {
          return {
            ...e,
            style: { stroke: INCOMING_COLOR, strokeWidth: 2.5, strokeDasharray: "6 4" },
            animated: false,
            zIndex: 20,
          };
        }
        return e;
      }),
    [flow.edges, activeIds],
  );

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-ficsit-dark flex flex-col" : "min-w-0"}>
      {!isFullscreen && (
        <div className="sticky top-12 z-20 bg-ficsit-dark py-3 space-y-2 border-b border-ficsit-border">
          <header>
            <h1 className="text-2xl font-bold">전체 의존성 지도</h1>
            <p className="text-sm text-zinc-400">
              모든 레시피의 입력 → 출력 관계를 한 캔버스에서. 드래그로 이동, 휠로 확대/축소.
              <span className="text-zinc-600 ml-2">
                · 노드 클릭으로 강조/해제, 빈 캔버스 클릭으로 모두 해제
                · {flow.recipeCount}개 레시피 / {flow.sourceCount}개 원천
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
              <span className="inline-block w-3 h-3 rounded-sm border-l-[3px] border-amber-500/70 bg-gradient-to-br from-amber-950/60 to-ficsit-panel" />
              최종 산물 (재료로 안 쓰임)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-ficsit-orange bg-ficsit-dark" />
              원천 (채굴 · 채집)
            </span>
            <span className="text-zinc-700">|</span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="22" height="6" aria-hidden>
                <line x1="0" y1="3" x2="22" y2="3" stroke={OUTGOING_COLOR} strokeWidth="2.5" />
              </svg>
              나가는 (활성 → 다른 노드)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="22" height="6" aria-hidden>
                <line x1="0" y1="3" x2="22" y2="3" stroke={INCOMING_COLOR} strokeWidth="2.5" strokeDasharray="6 4" />
              </svg>
              들어오는 (다른 노드 → 활성)
            </span>
            {activeIds.size > 0 && (
              <button
                onClick={() => setActiveIds(new Set())}
                className="text-zinc-500 hover:text-ficsit-orange underline ml-auto"
              >
                {activeIds.size}개 활성 · 모두 해제
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={
          isFullscreen
            ? "flex-1 min-h-0 w-full bg-ficsit-panel"
            : "panel w-full min-w-0 overflow-hidden mt-3"
        }
        style={isFullscreen ? undefined : { height: "calc(100vh - 220px)", minHeight: 500 }}
      >
        <ReactFlowProvider>
          <ReactFlow
            nodes={styledNodes}
            edges={styledEdges}
            nodeTypes={NODE_TYPES}
            defaultViewport={{ x: 40, y: 40, zoom: 0.6 }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            elementsSelectable={false}
            onInit={(rf) => (rfRef.current = rf)}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            panOnDrag
            panOnScroll
            zoomOnScroll
          >
            <Background gap={32} size={1} color="#27272a" />
            <Controls showInteractive={false} />
            <Panel position="top-right" className="flex gap-2">
              <button
                onClick={() => setHideUnpackaging(!hideUnpackaging)}
                title={
                  hideUnpackaging
                    ? "언패키지 레시피 다시 표시"
                    : "포장된 제품 분해(언패키지) 레시피 숨김"
                }
                className={[
                  "chip backdrop-blur",
                  hideUnpackaging
                    ? "border-ficsit-orange text-ficsit-orange bg-ficsit-orange/15"
                    : "bg-ficsit-panel/90 hover:border-ficsit-orange hover:text-ficsit-orange",
                ].join(" ")}
              >
                📦 {hideUnpackaging ? "언패키지 표시" : "언패키지 숨김"}
              </button>
              <button
                onClick={() => setHideEquipment(!hideEquipment)}
                title={
                  hideEquipment
                    ? "장비 레시피 다시 표시"
                    : "장비 레시피 숨김 (휴대용 채광기 제외)"
                }
                className={[
                  "chip backdrop-blur",
                  hideEquipment
                    ? "border-ficsit-orange text-ficsit-orange bg-ficsit-orange/15"
                    : "bg-ficsit-panel/90 hover:border-ficsit-orange hover:text-ficsit-orange",
                ].join(" ")}
              >
                🛠️ {hideEquipment ? "장비 표시" : "장비 숨김"}
              </button>
              <button
                onClick={() =>
                  setAutomationMode((m) =>
                    m === "show" ? "highlight" : m === "highlight" ? "hide" : "show",
                  )
                }
                title="자동화 불가 라인 (채집/잔해/슬러그 원료 또는 작업대 전용): 표시 → 강조 → 숨김 순환"
                className={[
                  "chip backdrop-blur",
                  automationMode === "show"
                    ? "bg-ficsit-panel/90 hover:border-ficsit-orange hover:text-ficsit-orange"
                    : "border-red-500/70 text-red-300 bg-red-500/15",
                ].join(" ")}
              >
                ⚙️ 자동불가:{" "}
                {automationMode === "show"
                  ? "표시"
                  : automationMode === "highlight"
                    ? "강조"
                    : "숨김"}
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "일반 모드로 (Esc)" : "전체화면 모드"}
                className="chip hover:border-ficsit-orange hover:text-ficsit-orange bg-ficsit-panel/90 backdrop-blur"
              >
                {isFullscreen ? "↙ 일반 모드 (Esc)" : "⤢ 전체화면"}
              </button>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

// ── Custom Nodes ─────────────────────────────────────────────────────────────

function SourceNode({
  data,
}: {
  data: { item: Item; isActive?: boolean; isNonAutomatable?: boolean };
}) {
  const { item, isActive, isNonAutomatable } = data;
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-full bg-ficsit-dark border-2 px-2 py-1 cursor-pointer transition-shadow",
        // 비자동 source 는 빨강 테두리, 일반 원천은 오렌지
        isNonAutomatable ? "border-red-500" : "border-ficsit-orange",
        isActive
          ? "ring-2 ring-ficsit-orange shadow-lg shadow-ficsit-orange/40"
          : "",
      ].join(" ")}
      style={{ width: SOURCE_W, height: SOURCE_H }}
      title={
        isNonAutomatable
          ? `${item.name.en} (자동화 불가 — 채집/잔해/슬러그)`
          : item.name.en
      }
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
    </div>
  );
}

function RecipeNode({
  data,
}: {
  data: {
    recipe: Recipe;
    isActive?: boolean;
    isTerminal?: boolean;
    isNonAutomatable?: boolean;
  };
}) {
  const { recipe: r, isActive, isTerminal, isNonAutomatable } = data;
  const product = r.products[0] ? itemByClass.get(r.products[0].item) : undefined;
  const label = buildingShort(r.produced_in[0]);

  // 우선순위: 자동화 불가 강조 > 최종 산물 강조 > 일반.
  // 비자동 = 빨강 그라데이션 + 좌측 빨강 stripe.
  const bgClass = isNonAutomatable
    ? "bg-gradient-to-br from-red-950/60 to-ficsit-panel border-l-[6px] !border-l-red-500/70"
    : isTerminal
      ? "bg-gradient-to-br from-amber-950/60 to-ficsit-panel border-l-[6px] !border-l-amber-500/70"
      : "bg-ficsit-panel";

  let tooltip = displayName(r.name);
  if (isNonAutomatable) tooltip += " (자동화 불가)";
  else if (isTerminal) tooltip += " (최종 산물 — 다른 레시피의 재료로 안 쓰임)";

  return (
    <div
      className={[
        "flex gap-2 rounded-lg p-2 border-2 shadow-md cursor-pointer transition-shadow",
        bgClass,
        r.alternate ? "border-cyan-400/70" : "border-zinc-500",
        isActive ? "ring-2 ring-ficsit-orange shadow-lg shadow-ficsit-orange/40" : "",
      ].join(" ")}
      style={{ width: RECIPE_W, height: RECIPE_H }}
      title={tooltip}
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
    </div>
  );
}

/**
 * 동일 산물 그룹의 배경 노드.
 * dagre compound graph 가 계산한 cluster bbox 를 받아서 점선 박스 + 산물 이름 표시.
 * pointer-events 없음 — 클릭은 그 위에 있는 RecipeNode 가 받음.
 */
function ClusterNode({
  data,
}: {
  data: { productClass: string; width: number; height: number; count: number };
}) {
  const product = itemByClass.get(data.productClass);
  const label = product ? displayName(product.name) : data.productClass;
  return (
    <div
      className="relative rounded-xl border-2 border-dashed border-ficsit-orange/35 bg-ficsit-orange/[0.04] pointer-events-none"
      style={{ width: data.width, height: data.height }}
    >
      <div className="text-[10px] text-ficsit-orange/80 px-2 py-0.5 font-medium truncate">
        {label} · {data.count}개 레시피
      </div>
      {/* 클러스터의 산물이 다른 레시피의 ingredient 로 쓰일 때 엣지 시작점 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-ficsit-orange/40 !border-0"
      />
    </div>
  );
}

const NODE_TYPES = {
  depSource: SourceNode,
  depRecipe: RecipeNode,
  depCluster: ClusterNode,
};

// ── Graph Construction ───────────────────────────────────────────────────────

interface DepNode {
  id: string;
  kind: "source" | "recipe";
  item?: Item;
  recipe?: Recipe;
  /** recipe 노드 한정: 모든 산물이 어떤 레시피의 ingredient 로도 안 쓰이면 true (최종 산물). */
  terminal?: boolean;
  /** 자동화 불가 — 채집/잔해/슬러그 source 거나, 비자동 ingredient 사용 / 작업대 전용 recipe. */
  nonAutomatable?: boolean;
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
type AutomationMode = "show" | "highlight" | "hide";

function buildAndLayout(
  opts: {
    hideUnpackaging?: boolean;
    hideEquipment?: boolean;
    automationMode?: AutomationMode;
  } = {},
) {
  const {
    hideUnpackaging = false,
    hideEquipment = false,
    automationMode = "show",
  } = opts;
  const baseFiltered = recipes.filter((r) => {
    if (r.for_building) return false;
    const isSamSynthesis =
      r.produced_in.some((b) => b.includes("Converter")) &&
      r.ingredients.some((i) => i.item === SAM_INGREDIENT);
    if (isSamSynthesis) return false;
    if (hideUnpackaging && isUnpackagingRecipe(r)) return false;
    if (hideEquipment && isHidableEquipmentRecipe(r)) return false;
    return true;
  });

  // 자동화 가능 집합은 base 기준으로 한 번 계산 (hide 모드여도 판정 기준은 동일).
  const autoItems = computeAutomatableItems(baseFiltered);
  const filtered =
    automationMode === "hide"
      ? baseFiltered.filter((r) => isAutomatableRecipe(r, autoItems))
      : baseFiltered;

  // 필터링된 레시피 중 어떤 것이라도 생산하는 item class
  const producedClasses = new Set<string>();
  for (const r of filtered) {
    for (const p of r.products) producedClasses.add(p.item);
  }

  // 어떤 레시피의 ingredient 로 등장하는 item class 집합
  const usedAsIngredient = new Set<string>();
  for (const r of filtered) {
    for (const ing of r.ingredients) usedAsIngredient.add(ing.item);
  }

  // 원천: ingredient 로 등장하지만 어떤 필터링 레시피도 생산하지 않음
  const sourceClasses = new Set<string>();
  for (const cn of usedAsIngredient) {
    if (!producedClasses.has(cn)) sourceClasses.add(cn);
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
    if (!it) continue;
    // 자동화 가능 set 에 없는 source = 비자동 (raw 가 아니거나 자동 생산 라인 없음)
    const nonAutomatable = !autoItems.has(cn);
    nodes.push({ id: `src:${cn}`, kind: "source", item: it, nonAutomatable });
  }
  for (const r of filtered) {
    const terminal = r.products.length > 0 && r.products.every((p) => !usedAsIngredient.has(p.item));
    const nonAutomatable = !isAutomatableRecipe(r, autoItems);
    nodes.push({
      id: `rec:${r.class_name}`,
      kind: "recipe",
      recipe: r,
      terminal,
      nonAutomatable,
    });
  }

  // 동일 메인 산물(첫 번째 product) 을 가진 레시피 2 개 이상을 한 그룹으로 묶는다.
  // 항상 활성 — 동일 산물 비교를 기본 표시 방식으로 사용.
  const groups: { productClass: string; recipeIds: string[] }[] = [];
  {
    const byMainProduct = new Map<string, string[]>();
    for (const r of filtered) {
      if (r.products.length === 0) continue;
      const mp = r.products[0].item;
      const arr = byMainProduct.get(mp) ?? [];
      arr.push(`rec:${r.class_name}`);
      byMainProduct.set(mp, arr);
    }
    for (const [productClass, recipeIds] of byMainProduct) {
      if (recipeIds.length >= 2) groups.push({ productClass, recipeIds });
    }
  }

  // 그룹화된 산물 class 와 멤버 → 자기 그룹 cycle 방지에 사용
  const groupedProducts = new Set<string>(groups.map((g) => g.productClass));
  const memberToGroup = new Map<string, string>(); // recipe id → productClass
  for (const g of groups) for (const rid of g.recipeIds) memberToGroup.set(rid, g.productClass);

  const edges: DepEdge[] = [];
  for (const r of filtered) {
    const targetId = `rec:${r.class_name}`;
    const seen = new Set<string>();
    for (const ing of r.ingredients) {
      let srcId: string | undefined;
      if (sourceClasses.has(ing.item)) {
        srcId = `src:${ing.item}`;
      } else if (groupedProducts.has(ing.item)) {
        // 묶음(클러스터) 에서 엣지가 나가도록 cluster 노드를 source 로.
        // 단, target 이 같은 그룹 멤버면 자기 그룹 cycle 이므로 primary producer 로 fallback.
        const targetGroup = memberToGroup.get(targetId);
        if (targetGroup === ing.item) {
          srcId = primaryProducerByItem.get(ing.item);
        } else {
          srcId = `cluster:${ing.item}`;
        }
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

  return layout({ nodes, edges, groups, automationMode });
}

interface DepGroup {
  productClass: string;
  recipeIds: string[];
}

function layout(graph: {
  nodes: DepNode[];
  edges: DepEdge[];
  groups: DepGroup[];
  automationMode: AutomationMode;
}) {
  const highlightNonAuto = graph.automationMode === "highlight";
  const grouping = graph.groups.length > 0;
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

  // 그룹 anchor 선택 (기본 레시피 우선 또는 첫 멤버) — size 확장에 사용
  const VERTICAL_GAP_LAYOUT = 8;
  const CLUSTER_PAD = 6;
  const CLUSTER_LABEL_H = 18;
  const groupAnchorSize = new Map<string, { width: number; height: number }>();
  const anchorIds = new Set<string>();
  for (const grp of graph.groups) {
    if (grp.recipeIds.length < 2) continue;
    const anchor =
      grp.recipeIds.find((id) => {
        const r = recipes.find((rr) => rr.class_name === id.replace(/^rec:/, ""));
        return r && !r.alternate;
      }) ?? grp.recipeIds[0];
    const totalStack =
      grp.recipeIds.length * RECIPE_H + (grp.recipeIds.length - 1) * VERTICAL_GAP_LAYOUT;
    // cluster 박스 전체 size — label + padding 포함. dagre 가 이 영역 통째로 예약.
    groupAnchorSize.set(anchor, {
      width: RECIPE_W + 2 * CLUSTER_PAD,
      height: totalStack + CLUSTER_LABEL_H + 2 * CLUSTER_PAD,
    });
    anchorIds.add(anchor);
  }

  for (const n of graph.nodes) {
    let size;
    if (n.kind === "source") {
      size = { width: SOURCE_W, height: SOURCE_H };
    } else if (groupAnchorSize.has(n.id)) {
      // anchor 멤버: cluster 박스 영역 통째 size 로 등록 → dagre 가 다른 노드를
      // 그 영역 (label + padding 포함) 밖에 배치하므로 cluster 박스끼리도 안 겹침.
      size = groupAnchorSize.get(n.id)!;
    } else {
      size = { width: RECIPE_W, height: RECIPE_H };
    }
    g.setNode(n.id, size);
  }
  // dagre 는 cluster 가상 노드를 모름. edge.source 가 cluster:X 인 경우
  // 그 그룹의 첫 멤버 (anchor) 로 대신 layout. ReactFlow edges 배열의 source 는
  // cluster:X 로 유지되어 시각적으로는 cluster Handle 에서 출발.
  const groupAnchorByProduct = new Map<string, string>();
  for (const grp of graph.groups) {
    if (grp.recipeIds.length > 0) groupAnchorByProduct.set(grp.productClass, grp.recipeIds[0]);
  }
  for (const e of graph.edges) {
    let dagreSrc = e.source;
    if (e.source.startsWith("cluster:")) {
      const productClass = e.source.slice("cluster:".length);
      const anchor = groupAnchorByProduct.get(productClass);
      if (anchor) dagreSrc = anchor;
    }
    g.setEdge(dagreSrc, e.target);
  }
  // 그룹핑: 그룹 멤버 간 invisible chain edge 로 가깝게 두도록 dagre 에 힌트.
  // 약한 weight 만 주고, 정확한 수직 정렬은 layout 후 후처리로 강제.
  if (grouping) {
    for (const grp of graph.groups) {
      for (let i = 0; i < grp.recipeIds.length - 1; i++) {
        g.setEdge(grp.recipeIds[i], grp.recipeIds[i + 1], { weight: 5 });
      }
    }
  }
  dagre.layout(g);

  // 그룹 후처리: 멤버들의 x 를 anchor 에 맞춰 align, y 는 anchor center 중심 균등 스택.
  // dagre 가 anchor 를 큰 영역으로 layout 했으니 그 center 를 그룹 vertical 중심으로 사용.
  // 동시에 anchor 노드의 dagre height 을 실제 RECIPE_H 로 복원 → cluster bbox 가 정확해짐.
  if (grouping) {
    const VERTICAL_GAP = 8;
    // source y 헬퍼 — cluster source 면 cluster anchor 의 y 사용
    function srcY(srcId: string): number | null {
      if (srcId.startsWith("cluster:")) {
        const productClass = srcId.slice("cluster:".length);
        const anchor = groupAnchorByProduct.get(productClass);
        if (!anchor) return null;
        return g.node(anchor)?.y ?? null;
      }
      return g.node(srcId)?.y ?? null;
    }

    for (const grp of graph.groups) {
      const members = grp.recipeIds
        .map((id) => ({ id, n: g.node(id) }))
        .filter((m) => m.n);
      if (members.length < 2) continue;
      const anchorMember =
        members.find((m) => anchorIds.has(m.id)) ?? members[0];
      const anchorX = anchorMember.n.x;
      const stackCenterY = anchorMember.n.y + CLUSTER_LABEL_H / 2;
      const total = members.length * RECIPE_H + (members.length - 1) * VERTICAL_GAP;

      // 각 멤버의 incoming source y 평균 → stack 순서 결정.
      // 1:1 직결 케이스(예: 황색 슬러그 → Power Shard (2))가 직선이 되도록.
      const memberSrcY = new Map<string, number>();
      for (const m of members) {
        const ys: number[] = [];
        for (const e of graph.edges) {
          if (e.target !== m.id) continue;
          const y = srcY(e.source);
          if (y !== null) ys.push(y);
        }
        if (ys.length > 0) {
          memberSrcY.set(m.id, ys.reduce((s, y) => s + y, 0) / ys.length);
        }
      }
      members.sort((a, b) => {
        const ya = memberSrcY.get(a.id);
        const yb = memberSrcY.get(b.id);
        if (ya !== undefined && yb !== undefined) return ya - yb;
        if (ya !== undefined) return -1;
        if (yb !== undefined) return 1;
        return 0;
      });

      let cursor = stackCenterY - total / 2 + RECIPE_H / 2;
      for (const m of members) {
        m.n.x = anchorX;
        m.n.y = cursor;
        m.n.width = RECIPE_W;
        m.n.height = RECIPE_H;
        cursor += RECIPE_H + VERTICAL_GAP;
      }
    }
  }

  // 1:1 직결 source 후처리 — out-degree 1 인 source (예: 황색 파워 슬러그) 를
  // 자신의 유일한 target 옆에 정렬해서 edge 가 수평 직선이 되도록.
  // 여러 source 가 한 column 에 stack 되어도 각자 다른 target y 라 충돌 없음.
  {
    const outDegree = new Map<string, number>();
    for (const e of graph.edges) {
      if (!e.source.startsWith("src:")) continue;
      outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
    }
    const HORIZONTAL_GAP = 40;
    for (const e of graph.edges) {
      if (!e.source.startsWith("src:")) continue;
      if (outDegree.get(e.source) !== 1) continue;
      const src = g.node(e.source);
      const tgt = g.node(e.target);
      if (!src || !tgt) continue;
      src.x = tgt.x - RECIPE_W / 2 - HORIZONTAL_GAP - SOURCE_W / 2;
      src.y = tgt.y;
    }
  }

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
      data:
        n.kind === "source"
          ? {
              item: n.item,
              isNonAutomatable: highlightNonAuto && n.nonAutomatable,
            }
          : {
              recipe: n.recipe,
              isTerminal: n.terminal,
              isNonAutomatable: highlightNonAuto && n.nonAutomatable,
            },
      draggable: false,
      selectable: false,
      zIndex: 1,
    };
  });

  // 그룹핑: 멤버 위치의 bounding box 로 클러스터 배경 노드 생성.
  if (grouping) {
    const LABEL_H = 18;
    const PAD = 6;
    for (const grp of graph.groups) {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const rid of grp.recipeIds) {
        const cn = g.node(rid);
        if (!cn) continue;
        minX = Math.min(minX, cn.x - cn.width / 2);
        maxX = Math.max(maxX, cn.x + cn.width / 2);
        minY = Math.min(minY, cn.y - cn.height / 2);
        maxY = Math.max(maxY, cn.y + cn.height / 2);
      }
      if (minX === Infinity) continue;
      const x = minX - PAD;
      const y = minY - LABEL_H - PAD;
      const w = maxX - minX + 2 * PAD;
      const h = maxY - minY + LABEL_H + 2 * PAD;
      nodes.unshift({
        id: `cluster:${grp.productClass}`,
        type: "depCluster",
        position: { x, y },
        data: {
          productClass: grp.productClass,
          width: w,
          height: h,
          count: grp.recipeIds.length,
        },
        draggable: false,
        selectable: false,
        zIndex: -10,
      });
    }
  }

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    pathOptions: { borderRadius: 28 },
    style: { stroke: "#3f3f46", strokeWidth: 1 },
    animated: false,
  }));

  const sourceCount = graph.nodes.filter((n) => n.kind === "source").length;
  const recipeCount = graph.nodes.filter((n) => n.kind === "recipe").length;

  return { nodes, edges, sourceCount, recipeCount };
}
