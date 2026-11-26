# 브랜치와 배포 결함 처리

## 일반 작업

- 기본 브랜치 main은 배포 기준, develop은 개발 통합 기준이다. 작업 전 원격을 fetch하고 최신 origin/develop에서 feat/<ID>-<설명>, fix/<ID>-<설명>, docs/<ID>-<설명> 중 하나로 분기한다. ID는 제품 작업 T001, 협업 도구 H-001처럼 쓰며 하위 작업에는 -A 등 대문자 접미사를 쓸 수 있다.
- 작업 브랜치에서 develop 대상으로 PR을 연다. 릴리스 시 사용자가 정한 범위로 develop → main PR을 준비한다. 두 기준 브랜치에 직접 커밋·push하지 않는다. 이번 H-001 초기 도입은 사용자가 지정한 예외다.
- 동시에 작업하면 카드별 브랜치와 worktree를 사용하고 공유 파일 변경 순서를 조정한다. 스스로 구현한 사람이 검토하면 자체 검증으로 표시한다. PR 수락·거절·닫기·병합과 자동 병합 설정은 사용자 권한이다.
- PR의 base와 head, 실제 diff와 CI를 확인한다. [리뷰 양식](../templates/REVIEW.md)을 참고하고 [리뷰 인덱스](../reviews/INDEX.md)에 PR·검토 자료를 연결한다.

## 핫픽스

1. 사용자가 이미 배포한 버전의 결함을 핫픽스로 지정하면 HF001처럼 별도 번호의 [작업 카드](TASKS.md)를 만든다. 최신 origin/main에서 hotfix/HF001-<설명>으로 분기하고 배포 버전, 사유, 기준 main SHA를 기록한다.
2. 같은 배포 조건에서 결함을 재현하고 수정 후 결과를 evidence에 기록한다. 패치 버전을 올리고 저장소에서 사용하는 버전 파일·릴리스 문서를 함께 갱신한다. lockfile은 패키지 도구로 갱신한다.
3. 같은 hotfix 브랜치에서 main과 develop 각각에 PR을 연다. 두 PR 본문과 카드 handoff에 상호 링크, 양쪽 병합 필요, 원본 수정 SHA를 기록한다. 대상별 diff와 검증 결과를 확인하고 develop에서 준비 중인 버전을 낮추지 않는다.
4. develop에서 충돌할 때만 최신 origin/develop에서 hotfix/HF001-<설명>-develop 통합 브랜치를 만들어 원본 hotfix를 merge한다. 충돌을 해결한 develop 대상 대체 PR을 기존 PR·main PR에 연결한다. 원본에는 develop을 역병합하지 않는다. 원본에 수정이 추가되면 통합 브랜치에도 반영해 재검증한다. PR 종료와 원격 브랜치 삭제는 사용자가 한다.
5. 카드 branch는 원본 hotfix 브랜치를 유지한다. 양쪽 반영 전에는 원본 브랜치를 보존한다. 두 대상의 검증·병합과 사용자 완료 판단을 확인한 후 done으로 기록한다. 병합 뒤 카드 완료 기록은 최신 origin/develop에서 같은 HF ID의 기록 브랜치로 develop에 PR을 연다.

## 가드와 검증

Claude Code는 Node.js와 Git으로 [hook 설정](../../.claude/settings.json)의 SessionStart와 Bash PreToolUse를 실행한다. 세션 시작 시 main·develop을 fetch하고, Bash에서 브랜치 생성·push 명령을 검사한다. main·develop·claude/* 또는 작업 이름 규칙에 어긋나는 push는 차단한다. 실제 분기 기준 SHA·사용자 핫픽스 지정·PR base는 카드와 PR 검토에서 확인한다. 로컬 hook 적용 범위는 Claude Code이며 GitHub 서버 보호 규칙은 별도다.

검증 명령은 저장소 루트에서 실행한다.

```sh
node scripts/check-task-records.mjs
node --test scripts/branch-guard.test.mjs scripts/check-task-records.test.mjs
```
