import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTaskRecordPolicy } from './check-task-records.mjs';

function valid() {
  return {
    'docs/TODO.md': '# 목표와 우선순위\n\n| 작업 카드 | 우선순위 | 목표 |\n| --- | --- | --- |\n| [H-001](../tasks/H-001.json) | P0 | 앱 기반 |\n',
    'docs/reviews/INDEX.md': '# PR 링크\n\n| PR | task | 변경 주제 | 검토 자료 |\n| --- | --- | --- | --- |\n| [#4](https://github.com/example/repo/pull/4) | H-001 | 앱 기반 | [기록](review/H-001.md) |\n',
    'CLAUDE.md': '# 진입점\n\n@AGENTS.md\n@docs/workflow/TASKS.md\n',
  };
}

test('plan and PR links do not require duplicated status or history updates', () => {
  const files = valid();
  files['docs/handoffs/old.md'] = 'H-001은 review. Todo 상태를 함께 갱신한다.';
  files['docs/reviews/old.md'] = '과거 검토: 사용자 판단 대기';
  files['tasks/H-001.json'] = JSON.stringify({ status: 'done' });
  assert.deepEqual(validateTaskRecordPolicy(files), []);
});

test('task state changes alone leave both indexes valid', () => {
  const files = valid();
  for (const status of ['todo', 'in_progress', 'review', 'blocked', 'done']) {
    files['tasks/H-001.json'] = JSON.stringify({ status });
    assert.deepEqual(validateTaskRecordPolicy(files), []);
  }
});

test('rejects current-status columns in either index', () => {
  for (const path of ['docs/TODO.md', 'docs/reviews/INDEX.md']) {
    for (const label of ['상태', '현재 상태', '진행 상태', '완료 여부', '사용자 결정', 'Status', 'Completed']) {
      const files = valid();
      files[path] += `| ID | ${label} |\n| --- | --- |\n`;
      assert.ok(validateTaskRecordPolicy(files).length, `${path}: ${label}`);
    }
  }
});

test('rejects copied statuses even under an unrelated table header', () => {
  for (const state of ['done', '`review`', 'blocked', 'in_progress', 'awaiting-user', '사용자 검토 대기', '병합 완료']) {
    const files = valid();
    files['docs/TODO.md'] += `| H-001 | P0 | ${state} |\n`;
    assert.ok(validateTaskRecordPolicy(files).length, state);
  }
});

test('rejects unchecked and checked completion lists in indexes', () => {
  for (const path of ['docs/TODO.md', 'docs/reviews/INDEX.md']) {
    for (const line of ['- [ ] 앱 기반', '- [x] 앱 기반', '* [X] 앱 기반', '1. [x] 앱 기반']) {
      const files = valid(); files[path] += `${line}\n`;
      assert.ok(validateTaskRecordPolicy(files).length, line);
    }
  }
});

test('rejects copied status in task list items', () => {
  const files = valid();
  files['docs/reviews/INDEX.md'] += '\n- H-001: done\n';
  assert.ok(validateTaskRecordPolicy(files).length);
});

test('requires both active Claude imports', () => {
  for (const content of ['@AGENTS.md', '@docs/workflow/TASKS.md', '`@AGENTS.md`\n`@docs/workflow/TASKS.md`']) {
    const files = valid(); files['CLAUDE.md'] = content;
    assert.ok(validateTaskRecordPolicy(files).length);
  }
});

test('missing indexes fail instead of passing silently', () => {
  const files = valid(); delete files['docs/TODO.md'];
  assert.ok(validateTaskRecordPolicy(files).length);
});

test('accepts CRLF and rule explanations outside status tables', () => {
  const files = valid();
  files['docs/TODO.md'] += '\n현재 상태는 JSON을 확인하며 review에서 done으로 바뀌어도 이 목록을 수정하지 않는다.\n';
  for (const key of Object.keys(files)) files[key] = files[key].replaceAll('\n', '\r\n');
  assert.deepEqual(validateTaskRecordPolicy(files), []);
});

test('HF links are valid but copied hotfix statuses are rejected in both indexes', () => {
  for (const path of ['docs/TODO.md', 'docs/reviews/INDEX.md']) {
    const files = valid();
    files[path] += '\n- [HF001](../tasks/HF001.json) 잠금 회수 복구\n';
    assert.deepEqual(validateTaskRecordPolicy(files), []);
    for (const status of ['done', 'review', '진행 중', '병합 완료']) {
      const invalid = { ...files, [path]: files[path] + `- [HF001](../tasks/HF001.json) ${status}\n` };
      assert.ok(validateTaskRecordPolicy(invalid).length, `${path}: ${status}`);
    }
  }
});
