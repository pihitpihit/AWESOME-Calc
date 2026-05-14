# AWESOME-Calc

PC 게임 *Satisfactory*를 위한 헬퍼. 공장 설계 시 자주 마주치는 계산 — 레시피 트리 전개, 자원 수지, 처리량 밸런싱 등 — 을 보조한다.

> **🌐 Reference Site**: [pihitpihit.github.io/AWESOME-Calc](https://pihitpihit.github.io/AWESOME-Calc/) — 위키형 아이템·레시피 브라우저

---

## 비전

게임 플레이 중 "이 라인에 컨스트럭터 몇 대가 필요하지?", "이 빌딩을 짓는 데 자원이 얼마나 필요하지?" 같은 계산을 빠르게 답해주는 도구. iPad 위에서 직관적으로 다룰 수 있는 UI를 1차 목표로 한다.

## 구조

프로젝트는 세 부분으로 나뉜다.

```
+---------------------------+   +-----------------------------+   +----------------------+
|  app (iPad, 추후)         |   |  cli (Python)               |   |  web (reference)     |
|  TS + RN/native (TBD)     |   |  prototyping & test 자동화  |   |  React + Vite        |
+-------------+-------------+   +--------------+--------------+   +-----------+----------+
              |                                |                              |
              |       공유 정적 DB (data/items.yaml, recipes.yaml, icons/)    |
              +----------------+---------------+------------------+-----------+
                               |                                  |
                      +--------v--------+                +--------v--------+
                      |  cli/build_db.py|                | GitHub Actions  |
                      |  (재생성 스크립트)|                | → GitHub Pages  |
                      +-----------------+                +-----------------+
```

- **CLI**: 도메인 로직과 계산 알고리즘을 빠르게 프로토타이핑하고 회귀 테스트로 굳히는 자리. 정적 DB 빌드도 담당.
- **앱**: CLI에서 검증된 로직을 iPad에서 실제로 쓸 수 있는 형태로 감싼 자리. *기술 스택은 미정 (아래 ‘앱’ 섹션 참고).*
- **web**: 정적 위키형 레퍼런스 사이트. 브라우저로 아이템·레시피를 수동 탐색.
- **data/**: 세 파트가 같은 YAML 을 바라보도록 단일 원천.

도메인 모델은 CLI에서 먼저 정의·검증하고, 앱은 동일한 모델을 TypeScript로 옮긴다.

---

## CLI (`cli/`)

- **언어**: Python 3.11+
- **플랫폼**: macOS / Linux / Windows
- **현재 책임**: 정적 DB 빌드 (`cli/src/awesome_calc/build_db.py`).
- **앞으로**:
  - 레시피 그래프 / 처리량 솔버
  - 시나리오 회귀 테스트
  - 데이터 정규화 파이프라인

자세한 정적 DB 명세는 [`data/README.md`](./data/README.md) 참고.

## Web reference (`web/`)

- **스택**: Vite + React 18 + TypeScript + Tailwind
- **UI 라이브러리**: [`pihitpihit/plastic`](https://github.com/pihitpihit/plastic) (Button, Card, Accordion 등)
- **데이터 소스**: 빌드 시 `data/items.yaml`, `data/recipes.yaml`, `data/icons/*` 를 인라인.
- **배포**: GitHub Actions → GitHub Pages — `main` 브랜치 푸시 시 자동.
- **URL**: <https://pihitpihit.github.io/AWESOME-Calc/>

### 로컬 실행

```bash
cd web
npm install        # plastic 은 github:pihitpihit/plastic 에서 설치
npm run dev        # http://localhost:5173/
npm run build      # 정적 빌드 → web/dist/
npm run preview    # 로컬 프리뷰
```

`npm run build` 는 `prebuild` 단계에서 `data/icons` 를 `web/public/icons` 로 동기화한다.

## 앱 (`app/`, 미작업)

- **언어**: TypeScript (확정)
- **타겟**: iPad (1순위). iPhone 부수, Android 비목표.
- **UI 전략 — 결정 대기**:
  - `pihitpihit/plastic` 은 **React-Web** 라이브러리이므로, RN 앱에서 그대로 쓸 수 없다.
  - 옵션 (a): React Native + react-native-web 으로 plastic 일부 재사용
  - 옵션 (b): Expo + 네이티브 Skia/RN 컴포넌트 자체 구축
  - 옵션 (c): 웹뷰 기반 (web reference 를 PWA 로 강화) — 가장 빠른 길
- **상태/저장**: Zustand + AsyncStorage 우선 검토
- **앱이 책임지는 것**: iPad 인터랙션 최적화, 사용자 시나리오, 도메인 로직 포팅

> 사전 조사에서 plastic 을 RN 으로 가정했으나, 실제로는 React-Web 라이브러리임이 확인되어 앱 스택은 보류.

## 도메인 / 데이터 (`data/`)

- 형식: YAML (사람이 읽기 쉽고 git diff 친화적).
- 내용: **177 아이템 + 825 레시피 + 177 아이콘** (Satisfactory v1.0+ 기준).
- 출처: [`greeny/SatisfactoryTools`](https://github.com/greeny/SatisfactoryTools) 의 `data.json` 을 정규화. 한국어는 수동 큐레이션 (`cli/i18n/ko.yaml`).
- 자세한 스키마와 갱신 절차: [`data/README.md`](./data/README.md)

---

## 디렉토리 구조

```
AWESOME-Calc/
├── README.md
├── .github/workflows/deploy-web.yml
├── cli/                ← Python: DB 빌드 + (앞으로) 솔버
│   ├── i18n/ko.yaml
│   ├── sources/data.json   (greeny/SatisfactoryTools 캐시)
│   └── src/awesome_calc/build_db.py
├── data/               ← 공유 정적 DB
│   ├── items.yaml
│   ├── recipes.yaml
│   ├── icons/*.png
│   └── README.md
├── web/                ← Vite + React + plastic 위키형 레퍼런스
│   ├── package.json
│   ├── src/{pages,components,lib,types}/
│   └── scripts/sync-icons.mjs
└── app/                ← (미작업) iPad 앱
```

---

## 로드맵

1. **Phase 0 — 기초** ✅ 도메인 모델 초안, 게임 데이터 수집·정규화
2. **Phase 1 — Web Reference** ✅ 위키형 브라우저 + GH Pages 배포
3. **Phase 2 — CLI 솔버**: 단일 아이템 처리량 계산, 레시피 트리, 자원 수지
4. **Phase 3 — 앱 스택 결정** & MVP: 단순 계산 화면 1개
5. **Phase 4 — 앱 확장**: 공장 저장, 결과 시각화, iPad 인터랙션 최적화

---

## 비목표

- 멀티플레이 / 서버 백엔드
- Android 지원
- 세이브 파일 파싱 등 게임과의 직접 연동 (장기 검토)
- 클라우드 동기화
