# `data/` — Satisfactory 정적 DB

AWESOME-Calc 가 사용하는 정적 게임 데이터.
CLI와 앱 양쪽이 동일한 파일을 읽도록 단일 원천을 둔다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `items.yaml`   | 177개 아이템 (원자재·부품·유체·연료·탄약·장비·핵·바이오·특수·주괴) |
| `recipes.yaml` | 825개 레시피 (기본 + 대체, 빌딩 건축 레시피 포함) |
| `icons/*.png`  | 아이템 64×64 아이콘 (177개) |

## 데이터 출처

1. **영문 명칭 / 수치 / 레시피 / 스키매틱**
   [`greeny/SatisfactoryTools`](https://github.com/greeny/SatisfactoryTools)
   리포지토리의 `data/data.json` (게임 `Docs.json` 파생).
   `cli/sources/data.json` 에 캐시되어 있으며, 라이센스는 원본 저장소를 따른다.

2. **아이콘**
   동일 저장소의 `www/assets/images/items/<slug>_64.png` (1MB,
   원본은 게임 패키지에서 `umodel` 로 추출된 자산).

3. **한국어 명칭**
   `cli/i18n/ko.yaml` 에서 수동 큐레이션.
   - 가능한 한 게임 내 공식 한국어 표기를 따랐다 (Coffee Stain / Crowdin 베이스).
   - 일부는 커뮤니티 표준 / 직역이며, 실제 게임 표기와 다를 수 있다.
   - 누락된 항목은 추후 보강 (현 상태: 아이템 0건 누락, 레시피 약 775건 누락 — 대부분 대체 레시피의 한글 명).

## 버전 가정

- 타겟: **Satisfactory v1.1**
- 실제 상위 데이터 (`data.json`) 는 v1.0+ (Quantum Encoder, Time Crystal,
  Excited Photonic Matter, Ficsonium, Alien Power Augmenter 등 v1.0 컨텐츠 포함)
- 샌드박스 환경 제약으로 v1.1 전용 변경분 (마이너 패치 수치 조정, 신규 알트
  레시피 등) 은 일부 누락될 수 있다. 추후 갱신 정책은 아래 참고.

## 스키마

### `items.yaml`

```yaml
items:
  - class_name: Desc_IronIngot_C    # 게임 내부 안정 ID
    slug: desc-ironingot-c           # 아이콘 파일명에 사용
    name:
      en: Iron Ingot
      ko: 철 주괴
    category: ingot                  # raw|ingot|part|fluid|fuel|ammo|equipment|nuclear|biomass|special
    stack_size: 100
    sink_points: 2
    energy_value_mj: null            # 연료일 때 MJ
    radioactive_decay: null
    is_fluid: false
    description_en: "Used for crafting the most basic parts."
    icon: icons/desc-ironingot-c_64.png
    produced_by:                     # 이 아이템을 만드는 레시피 (대체 포함)
      - { recipe: Recipe_IngotIron_C, alternate: false, amount: 1.0 }
      - { recipe: Recipe_Alternate_PureIronIngot_C, alternate: true, amount: 13.0 }
    consumed_in:                     # 이 아이템을 사용하는 레시피 (대체 포함)
      - { recipe: Recipe_IronPlate_C, alternate: false, amount: 3.0 }
      - { recipe: Recipe_IronRod_C,  alternate: false, amount: 1.0 }
```

### `recipes.yaml`

```yaml
recipes:
  - class_name: Recipe_Alternate_PureIronIngot_C
    slug: recipe-alternate-pureironingot-c
    name:
      en: "Alternate: Pure Iron Ingot"
      ko: "대체: 순수 철 주괴"
    alternate: true
    for_building: false              # 빌딩 건축 레시피 여부
    in_hand: false                   # 손 제작 가능 여부
    in_workshop: false               # 작업대 제작
    in_machine: true                 # 머신 제작
    time_seconds: 12.0
    produced_in: [ Desc_OilRefinery_C ]
    ingredients:
      - { item: Desc_OreIron_C, amount: 7.0 }
      - { item: Desc_Water_C,   amount: 4.0 }
    products:
      - { item: Desc_IronIngot_C, amount: 13.0 }
    unlock:
      source: alternate              # milestone|mam|alternate|tutorial|default|other
      schematic_class: Schematic_Alternate_PureIronIngot_C
      schematic_name: "Alternate: Pure Iron Ingot"
      en: "Hard Drive: Alternate: Pure Iron Ingot"
      ko: "하드 드라이브: Alternate: Pure Iron Ingot"
      # tier: <int>                  # milestone 일 때만
```

## 재생성 / 갱신

```bash
# 1) 상위 데이터를 새로 받고 (변경 시):
curl -sL https://raw.githubusercontent.com/greeny/SatisfactoryTools/dev/data/data.json \
  -o cli/sources/data.json

# 2) 한국어 보강이 필요하면 cli/i18n/ko.yaml 편집

# 3) 빌드
python3 cli/src/awesome_calc/build_db.py
```

빌드 스크립트는 `data/items.yaml`, `data/recipes.yaml` 을 덮어쓴다.
아이콘 갱신이 필요하면 `cli/sources/` 옆에 별도 스크립트로 다운로드해
`data/icons/` 에 복사한다.

## 알려진 한계

- v1.1 정확한 패치 수치는 확인되지 않았다. 게임 패치 노트와 다른 값이
  발견되면 `data.json` 갱신 후 재빌드.
- 일부 알트 레시피의 한국어 명칭은 미번역. `Alternate: <영문>` 형식으로
  남아 있어 영어로도 식별 가능.
- 빌딩(`buildings`/`generators`/`miners`) 자체의 메타데이터는 현재
  YAML 에 포함하지 않았다. 필요해지면 별도 `buildings.yaml` 로 추가.
- 가상 아이템 `special__power`, `special__sinkPoint` 는 솔버 편의용
  노드로 `category: special` 로 분류했다.
