# Task 기록 규칙


## 위치와 형식

- 루트 `tasks/<ID>.json`에 작업 하나당 파일 하나를 둔다. 예: `tasks/T001.json`.
- `docs/templates/TASK.json`을 복사한다. UTF-8, 2칸 들여쓰기, strict JSON을 사용한다.
- 아래 10개 필드만 사용하며 중첩 카드·별도 schema_version·priority·context 객체를 만들지 않는다.

| 필드 | 타입 | 내용 |
| --- | --- | --- |
| id | string | 파일명과 동일한 작업 ID |
| title | string | 작업 제목 |
| status | string | todo / in_progress / blocked / review / done |
| owner | string | yonguki1992 / codex / claude 중 담당자 한 명; 미배정 todo만 빈 문자열 |
| branch | string | 작업 브랜치; 미착수 todo는 빈 문자열 |
| dependsOn | string[] | 선행 작업 ID, 존재하는 파일만 참조, 순환 금지 |
| scope | string[] | 변경 범위·경로 |
| acceptance | string[] | 완료 조건 |
| evidence | string[] | 실제 검증 결과·미실행 이유·근거 |
| handoff | string | 다음 행동·차단 사유·PR/스냅샷·관련 결정 및 범위 밖 사항 |

`review`는 구현·검증 후 사용자 판단 대기다. `done`은 사용자 완료 판단 및 필요한 PR 병합을 확인한 작업만 사용한다. 이 변경은 기존에 확인한 완료 상태를 보존하며 새로운 완료 판단을 자동화하지 않는다.

핫픽스 ID는 `HF<숫자3자리>`(예 `HF001`)이며 하이픈 없이 일반 H-·T 작업과 별도 번호로 관리한다. 카드 필드는 동일하다. branch는 원본 hotfix 브랜치, handoff는 기준 main SHA·배포 버전·사유·main/develop PR 및 필요 시 통합 브랜치를 기록한다. 두 대상의 검증·병합 확인 후 완료 기록을 남긴다. 상세 절차는 [협업 핫픽스 규칙](COLLABORATION.md)을 따른다.

## 상태·계획·검토 기록의 구분 — 2026-10-29

| 기록 | 역할 | 수정 시점 |
| --- | --- | --- |
| tasks/<ID>.json | 현재 상태의 유일한 기준. 담당·의존성·검증·인계 | 해당 작업 진행·상태 전환·근거 변경 |
| docs/TODO.md | 목표·우선순위·진행 순서·task 링크 | 계획·우선순위·카드 링크 변경 |
| docs/reviews/INDEX.md | PR 및 검토 문서 링크 | 새 PR/검토 자료 등록·링크 변경 |
| 개별 리뷰·스냅샷 | 작성일·commit 기준의 검토/인계 이력 | 새 검토·인계 시 작성; 과거 상태 동기화 금지 |

`status`가 review에서 done으로 바뀔 때는 해당 JSON만 수정한다. Todo와 PR 인덱스에 상태 열·완료 체크박스를 두거나 “사용자 판단 대기/병합 완료”를 현재 현황으로 복사하지 않는다. 새 PR 등록과 새 스냅샷 작성은 별도의 링크·근거 기록이며 상태 동기화가 아니다.

예: H-001/T003이 JSON에서 done인 경우, Markdown이 갱신되지 않았다는 이유로 이를 미완료로 판단하거나 정리 PR을 만들지 않는다. 다음 작업의 실제 dependsOn·검증·사용자 지시를 확인해 진행한다. 단, JSON끼리의 모순·실제 구현/PR 증거 충돌은 무시하지 말고 해당 카드를 확인한다. 병합 사실만으로 완료 조건까지 자동 충족됐다고 단정하지 않는다.

이 규칙은 과거의 “Todo와 JSON 상태를 맞춘다” 지시를 대체한다. 오래된 스냅샷과 완료 작업의 evidence에 남은 정합성 검사 기록은 당시 사실로 보존한다. 해당 문장을 현재 지시로 사용하지 않는다.

## 의존성과 작업 선택

부모와 별도로 인수할 작업은 파일을 나눈다. 의존 작업의 현재 status는 JSON에서 읽는다. 카드가 없는 계획은 상태를 추정하지 않고 착수·배정 시 카드를 만든다.

역할 분담·docs/handoffs 경로는 기존 프로젝트 규칙을 유지한다. 핫픽스 예외를 제외한 일반 작업은 최신 develop에서 작업 브랜치를 만들고 develop 대상 PR로 제안한다. 일반 작업 카드 branch는 실제 작업 브랜치, handoff는 base=develop·기준 SHA를 기록한다. main 반영 및 기존 PR 전환은 [협업 브랜치 정책](COLLABORATION.md)을 따른다. 작업 범위가 바뀌지 않으면 Todo나 PR 인덱스를 수정하지 않는다. 상태 조회만을 이유로 기록 정리 작업을 추가하지 않는다.

## Claude·Codex 규칙 재확인

새 작업·재개·규칙 변경 통보 후에는 AGENTS.md와 이 문서, 담당 카드를 읽는다. CLAUDE.md는 이 두 규칙 파일을 import한다. 안전한 최신화로 새 규칙을 가져온 이후 재독해야 기존 세션에도 적용된다. Codex가 다른 실행 세션의 컨텍스트를 자동 수정할 수 있다고 가정하지 않는다.

## 검증

JSON의 10개 키·타입·파일명·상태·의존성 등은 카드 자체를 검증한다. Todo와 JSON의 상태 일치를 검사하지 않는다. `node scripts/check-task-records.mjs`는 Todo와 PR 인덱스의 상태 복제·완료 체크박스 재도입 및 Claude 규칙 import 누락을 검사한다. 회귀 검사는 `node --test scripts/check-task-records.test.mjs`로 실행하며 CI에도 연결한다. 이 검사는 문서 구조를 확인할 뿐 Claude의 응답을 보장하지 않는다.
