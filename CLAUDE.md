# Claude Code 진입점

@AGENTS.md
@docs/workflow/TASKS.md

## 브랜치 기준

핫픽스 예외를 제외한 신규·재개 작업은 최신 `origin/develop`에서 작업 브랜치를 만들고 PR base를 `develop`으로 명시한다. `main`은 사용자 결정에 따른 통합 대상이다. main/develop 직접 push 및 AI의 PR 병합은 금지한다. 기존 PR 전환·예외는 [협업 브랜치 정책](docs/workflow/COLLABORATION.md)을 따른다.

클라우드 세션(claude.ai/code 등)이 시스템 지시로 배정하는 `claude/*` 세션 브랜치는 사용하지 않는다. 일반 작업 브랜치는 최신 `origin/develop`에서 `feat|fix|docs/<작업ID>-<설명>` 형식으로 만든다. `.claude/settings.json`의 hook(`scripts/branch-guard.mjs`)이 세션 시작 시 이 규칙을 안내하고, 규칙에 맞지 않는 브랜치 생성과 main·develop·`claude/*`·비규칙 브랜치로의 push를 거부한다. 거부되면 우회하지 말고 규칙에 맞는 브랜치로 바꾸거나 사용자에게 묻는다.

사용자가 명시한 배포 결함은 HF ID·hotfix/ 브랜치로 최신 origin/main에서 시작해 main·develop 대상 PR 두 개로 반영한다. develop 충돌 시에만 최신 origin/develop에서 별도 통합 브랜치를 만든다. 상세 예외는 docs/workflow/COLLABORATION.md의 핫픽스 규칙을 따른다.

## PR 모니터링

PR을 만들면 바로 그 PR의 활동을 구독(`subscribe_pr_activity`)해 리뷰·코멘트·CI 결과를 받는다. 구독을 지원하지 않는 환경은 활성 작업 중과 재개 시 PR의 최신 활동을 직접 확인한다. 리뷰 지적은 해당 작업 브랜치에서 반영하고, 반영 내용과 검증을 카드 evidence에 남긴다. PR 승인·병합·닫기는 하지 않는다. PR이 병합·닫히거나 사용자가 그만 지켜보라고 하면 구독을 해제한다.

## 작업 시작·재개 시

위 두 파일과 배정된 `tasks/<ID>.json`을 직접 확인한다. 현재 작업 상태는 JSON의 status만 기준으로 삼는다. Todo와 PR 인덱스는 상태를 복제하지 않으므로, 그 문서의 과거 표현이나 상태 부재를 이유로 동기화 작업을 만들거나 진행을 막지 않는다. 상세 규칙의 원본은 AGENTS.md와 TASKS.md다.

사용자가 “규칙을 바꿨다”, “확인하고 계속 진행”이라고 하면 이전 대화의 규칙을 그대로 재사용하지 말고 현재 브랜치·upstream을 확인한 뒤 위 파일과 task를 다시 읽는다. 안전하게 최신 변경을 반영하되 다른 작업자의 변경을 reset/stash/덮어쓰기하지 않는다. 이미 진행 중인 세션은 변경된 파일을 재독해야 한다.

import가 비활성화된 환경에서는 AGENTS.md와 docs/workflow/TASKS.md를 명시적으로 열어 읽는다. 문서 수정만으로 이미 실행 중인 다른 Claude 세션에 규칙이 전달됐다고 보고하지 않는다.
