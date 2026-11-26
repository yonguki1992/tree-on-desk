# Tree on Desk 프로젝트 지침

## 제품 범위

작업 중 모니터 한구석에 두는 데스크톱 크리스마스 트리 위젯이다. 기획서 v1.1 초안은 오너먼트 자유 배치, 조명과 테마 전환, 로컬 프리셋과 JSON 공유를 제안한다. 제품 작업은 용욱님이 채택한 범위로 카드를 만든다.

## 스택과 모듈 경계

초안의 대상은 Windows와 macOS다. Electron, React, TypeScript를 사용하고 Main이 창과 저장 상태를 관리하며 Renderer가 트리와 편집 화면을 그리는 구조를 제안한다. 앱 구현과 빌드 명령은 첫 제품 카드에서 확정한다.

## 하네스 검증과 업데이트

저장소 루트에서 아래 명령을 실행한다.

```sh
node scripts/check-task-records.mjs
node --test scripts/check-task-records.test.mjs scripts/branch-guard.test.mjs
```

[공통 하네스 저장소](https://github.com/yonguki1992/private-harness-boilerplate)의 체크아웃에서 `python3 harness.py status <프로젝트 경로>`로 설치 버전과 공통 파일을 확인한다. 새 버전을 반영할 때는 작업 브랜치에서 `update`를 실행한 뒤 같은 검사를 반복한다. 설치한 원본 커밋은 [.harness-revision](../.harness-revision)에 기록한다.
