# 🎄 데스크톱 크리스마스 트리 위젯 기획서 (v1.1)

모니터 한구석에 띄워두고 소소하게 꾸미는 개발자용 순수 토이 데스크톱 위젯.

---

## 1. 프로젝트 개요

* **목표:** 작업에 방해되지 않으면서 크리스마스 분위기를 낼 수 있는 초경량 바탕화면 트리 위젯 제작
* **핵심 콘셉트:** 복잡한 연동 없이 오너먼트 꾸미기, 조명 변경, 테마 전환에 집중한 심플한 토이 위젯
* **타깃 환경:** Windows / macOS 데스크톱 (Electron 기반, 포터블 배포 지원)

---

## 2. 핵심 기능 명세

### 2.1 위젯 기본 동작
* **투명 창 & 클릭 투과:** 테두리 없는 투명 창 위에 트리만 렌더링하며, 트리 외의 빈 공간은 마우스 클릭이 뒤로 통과됨.
* **위치 이동 & 상태 자동 저장:** 드래그로 원하는 모니터 위치에 배치 가능하며, 창 위치·크기·테마·조명·오너먼트 배치를 로컬에 저장해 재실행 시 그대로 복원.

### 2.2 공통 컨텍스트 메뉴
트리 위 직접 우클릭 및 시스템 트레이 아이콘 우클릭 시 동일한 메뉴 제공.
* **오꾸 (오너먼트 꾸미기):** 별도 편집 모달 창 열기
* **조명:** `켜기 (ON)` / `깜빡임 (Blinking)` / `끄기 (OFF)`
* **테마:** `픽셀 아트 (Pixel)` / `벡터 일러스트 (Vector)`
* **크기:** `작게 (SM)` / `보통 (MD)` / `크게 (LG)`
* **항상 위에 표시 (Always on Top):** 토글
* **위치 잠금 (Lock):** 토글 (잠금 해제 시에만 트리 드래그 이동 가능)
* **사용법 다시 보기:** 온보딩 가이드 다시 열기
* **종료**

### 2.3 '오꾸' (오너먼트 꾸미기) 전용 모달
* **독립 윈도우 구조:** 투명 트리 창 테두리에 모달이 잘리지 않도록 별도 편집 창으로 실행. `적용` 시 바탕화면 트리에 즉시 반영.
* **자유 배치 & 삭제:** 미리보기 트리 위에 원하는 위치로 오너먼트를 자유롭게 드래그 배치. 우클릭 또는 트리 바깥으로 드래그하여 삭제, `전체 비우기` 지원.
* **프리셋 관리:**
  * 기본 제공 추천 프리셋 불러오기 (꾸미기 귀찮은 유저용)
  * 나만의 커스텀 프리셋 저장 / 불러오기
  * **프리셋 공유:** JSON 문자열 `복사 / 붙여넣기`를 통해 동료와 트리 세팅 공유

### 2.4 온보딩 가이드 (최초 실행)
* **풀스크린 Dim + 중앙 스와이퍼 카드:** 최초 실행 시 주 모니터 전체를 반투명 어두운 배경(`rgba(0, 0, 0, 0.6)`)으로 덮고 중앙에 3장짜리 스와이퍼 카드 표시. (멀티 모니터 및 OS 배율 차이에 따른 레이아웃 깨짐 방지)
* **슬라이드 구성 (3 Slides):**
  1. **위치 이동 & 잠금:** 드래그로 원하는 모니터 구석에 배치하고, 작업 시 방해되지 않게 위치 잠금 가능 안내
  2. **우클릭 메뉴 & 오꾸:** 트리 또는 트레이 아이콘 우클릭으로 오꾸 모달, 조명(ON/Blinking/OFF), 픽셀·벡터 테마 전환 안내
  3. **프리셋 & 동료 공유:** 추천 프리셋 적용 및 JSON 복붙을 통한 동료 공유 안내 (`시작하기` 버튼으로 종료)
* **편의 조작:** 상단 `건너뛰기(Skip)` 버튼, `ESC` 키 닫기, 키보드 좌우 화살표(`←` / `→`) 페이지 이동, 하단 페이지 인디케이터(점 3개) 제공.
* **노출 제어:** `hasSeenOnboarding` 플래그를 저장해 최초 1회만 자동 표시하며, 이후 컨텍스트 메뉴의 `사용법 다시 보기`로 언제든 재실행 가능.

### 2.5 그래픽 & 데이터 설계 원칙
* **상대 좌표계 (`0.0 ~ 1.0`):** 오너먼트 위치를 절대 픽셀이 아닌 트리 크기 대비 비율로 저장해, 위젯 크기 변경이나 테마 전환 시에도 위치 유지.
* **에셋 1:1 매핑:** 오너먼트 ID(예: `star_gold`, `ball_red`, `sock`)를 공통으로 관리하고, 선택한 테마에 따라 픽셀 PNG / 벡터 SVG만 교체 렌더링.

---

## 3. 제외 항목 (Out of Scope)

* Git 커밋, 파일 저장, AI 에이전트 사용량 연동 등 외부 활동 감지 기능
* 전역 키보드 후킹 (키로거 보안 경고 및 백신 오탐 방지)
* 가챠/뽑기 시스템, 회원가입 및 서버 동기화
* 배경음악 및 효과음 (사무실 환경 고려)

---

## 4. 기술 스택 및 아키텍처

### 4.1 기술 스택
* **프레임워크:** Electron + React + TypeScript (`electron-vite`)
* **로컬 저장소:** `electron-store`
* **빌드 및 배포:** `electron-builder` (포터블 실행 파일 지원)

### 4.2 윈도우 & 프로세스 구조
Main 프로세스가 상태의 단일 진실 공급원(Single Source of Truth) 역할을 담당.
* **TreeWindow (위젯 본체):** `transparent: true`, `frame: false`, `skipTaskbar: true`. 평소 클릭 투과(`setIgnoreMouseEvents(true, { forward: true })`) 유지.
* **EditorWindow ('오꾸' 모달):** 메뉴에서 '오꾸' 선택 시 생성되는 일반 창. 해시 라우팅(`#/editor`)으로 동일 Renderer 번들 재사용.
* **OnboardingWindow (온보딩 가이드):** 최초 실행 또는 '사용법 다시 보기' 선택 시 생성. 주 모니터 작업 영역(`screen.getPrimaryDisplay().workArea`) 크기에 맞춰 `transparent: true`, `frame: false`, `alwaysOnTop: true`로 띄우며 해시 라우팅(`#/onboarding`) 사용.
* **공통 컴포넌트:** `TreeCanvas.tsx`를 `WidgetPage`와 `EditorPage`에서 공용으로 사용하여 동일한 비율과 그래픽 보장.

### 4.3 프로젝트 폴더 구조
```text
xmas-tree-widget/
├── src/
│   ├── main/
│   │   ├── index.ts          # 앱 진입점, 창 생성 및 라이프사이클
│   │   ├── windows.ts        # Tree / Editor / Onboarding 윈도우 생성 관리
│   │   ├── trayAndMenu.ts    # 트레이 아이콘 + 공통 컨텍스트 메뉴
│   │   ├── ipc.ts            # 상태 동기화, 클릭 투과 토글, 드래그 처리
│   │   └── store.ts          # electron-store 스키마 및 기본값
│   ├── preload/
│   │   └── index.ts          # contextBridge로 안전한 window.api 노출
│   ├── shared/
│   │   ├── types.ts          # Main/Renderer 공용 타입 정의
│   │   ├── ornaments.ts      # 오너먼트 마스터 목록 (ID, 이름, 기본 크기)
│   │   └── presets.ts        # 기본 제공 추천 프리셋 데이터
│   └── renderer/
│       └── src/
│           ├── assets/
│           │   ├── pixel/    # 픽셀 아트 트리/전구/오너먼트 PNG
│           │   └── vector/   # 벡터 일러스트 트리/전구/오너먼트 SVG
│           ├── components/
│           │   ├── TreeCanvas.tsx      # 트리 + 전구 + 오너먼트 공통 렌더러
│           │   └── LightLayer.tsx      # ON/OFF/Blinking 애니메이션 레이어
│           ├── pages/
│           │   ├── WidgetPage.tsx      # 바탕화면 투명 트리 화면
│           │   ├── EditorPage.tsx      # 오꾸 모달 (팔레트 + 드래그 + 프리셋)
│           │   └── OnboardingPage.tsx  # 풀스크린 Dim + 3장 스와이퍼 가이드
│           └── App.tsx
```

### 4.4 핵심 데이터 스키마 (`src/shared/types.ts`)
```ts
export type ThemeType = 'pixel' | 'vector';
export type LightMode = 'on' | 'blinking' | 'off';
export type WidgetSize = 'sm' | 'md' | 'lg'; // 예: 200px, 280px, 360px

export interface PlacedOrnament {
  instanceId: string;   // 배치된 개별 아이템 UUID
  ornamentId: string;   // 에셋 매핑 ID (예: 'star_gold', 'ball_red', 'sock')
  x: number;            // 0.0 ~ 1.0 (트리 너비 대비 상대 X 좌표)
  y: number;            // 0.0 ~ 1.0 (트리 높이 대비 상대 Y 좌표)
  scale?: number;       // 기본 1.0
}

export interface TreePreset {
  id: string;
  name: string;
  ornaments: PlacedOrnament[];
}

export interface WidgetState {
  theme: ThemeType;
  lightMode: LightMode;
  size: WidgetSize;
  alwaysOnTop: boolean;
  locked: boolean;
  hasSeenOnboarding: boolean;
  position: { x: number; y: number } | null;
  ornaments: PlacedOrnament[];
  customPresets: TreePreset[];
}
```

---

## 5. 구현 시 주의사항

1. **투명 창 드래그 이동:** CSS `-webkit-app-region: drag` 사용 시 우클릭 및 `mouseenter` 이벤트가 무시되는 이슈가 있으므로, `locked === false` 상태에서 `mousedown → mousemove` 델타 값을 Main 프로세스로 전달해 `win.setPosition()`으로 직접 이동 처리.
2. **프리셋 공유 검증:** JSON 붙여넣기 시 잘못된 포맷이나 존재하지 않는 `ornamentId`로 인한 크래시를 막기 위해 좌표 범위(`0~1`) 및 ID 유효성 검증 파서 적용.