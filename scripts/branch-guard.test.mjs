import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLOWED_BRANCH, checkCommand, sessionStartMessage, splitCommands } from './branch-guard.mjs';

const on = branch => () => branch;
const ok = (command, branch = 'docs/H-019-branch-guard') => assert.deepEqual(checkCommand(command, on(branch)), [], command);
const blocked = (command, branch = 'docs/H-019-branch-guard') => assert.notDeepEqual(checkCommand(command, on(branch)), [], command);

test('branch pattern follows existing task branches', () => {
  for (const name of ['feat/T007-N-partner-prompt', 'fix/T007-R-fever-flare-opacity', 'docs/T006-F-restore-point-mastery',
    'docs/H-004-A', 'feat/H-014-B-tray-0.2']) assert.match(name, ALLOWED_BRANCH);
  for (const name of ['claude/affectionate-turing-oioi06', 'main', 'develop', 'feat/branch-guard', 'chore/H-019-x',
    'docs/H-19-x', 'feat/T007-N-Partner']) assert.doesNotMatch(name, ALLOWED_BRANCH);
});

test('splits compound commands and keeps quoted text together', () => {
  assert.deepEqual(splitCommands('cd "a b" && git push -u origin x; echo "1;2"'),
    [['cd', 'a b'], ['git', 'push', '-u', 'origin', 'x'], ['echo', '1;2']]);
});

test('drops redirections and skips heredoc bodies', () => {
  assert.deepEqual(splitCommands('git push -u origin x 2>&1 | tail -2'), [['git', 'push', '-u', 'origin', 'x'], ['tail', '-2']]);
  assert.deepEqual(splitCommands('git push origin x >/dev/null 2> err.log &>all.log'), [['git', 'push', 'origin', 'x']]);
  assert.deepEqual(splitCommands("cat > f <<'EOF'\ngit push origin main\nEOF\ngit status"), [['cat'], ['git', 'status']]);
  assert.deepEqual(splitCommands('git commit -F - <<EOF\nmsg; git push origin develop\nEOF'), [['git', 'commit', '-F', '-']]);
});

test('allows rule-following branch creation and push', () => {
  ok('git fetch origin develop && git checkout -b docs/H-019-branch-guard origin/develop');
  ok('git switch -c feat/T008-stats origin/develop');
  ok('git switch --create=fix/T007-R-x');
  ok('git worktree add -b feat/T009-a ../wt origin/develop');
  ok('git branch fix/T005-B-cap origin/develop');
  ok('git push -u origin docs/H-019-branch-guard');
  ok('git push -u origin HEAD');
  ok('git push');
  ok('git push origin refs/tags/v0.2.0');
  ok('git -C ../other push origin HEAD:feat/T008-x');
  ok('git push -u origin docs/H-019-branch-guard 2>&1 | tail -2');
});

test('rejects session or non-conforming branch creation', () => {
  blocked('git checkout -b claude/affectionate-turing-oioi06');
  blocked('git checkout -B my-work origin/develop');
  blocked('git switch -c feature/T008-x');
  blocked('git switch --create=claude/x');
  blocked('git worktree add -b tmp ../wt');
  blocked('git branch claude/new');
  blocked('git branch -m docs/H-019-x claude/x');
});

test('ignores read-only branch commands', () => {
  ok('git branch -a && git branch --show-current && git branch -D old-thing');
  ok('git checkout develop && git switch main');
  ok('git log --oneline -3 origin/develop');
});

test('rejects pushes to protected or non-conforming branches', () => {
  blocked('git push -u origin claude/affectionate-turing-oioi06');
  blocked('git push origin develop');
  blocked('git push origin HEAD:main');
  blocked('git push --force origin +refs/heads/develop');
  blocked('git push', 'claude/affectionate-turing-oioi06');
  blocked('git push -u origin HEAD', 'develop');
  blocked('git push origin HEAD:random-name');
  blocked('git push --all origin');
  blocked('git push origin --delete docs/H-019-branch-guard');
  blocked('git push', '');
});

test('looks through shell wrappers, env prefixes and later segments', () => {
  blocked('npm test && GIT_TRACE=1 git push origin develop');
  blocked('bash -c "git push origin claude/x"');
  blocked('cd /repo\ngit checkout -b wip');
  blocked("cat <<'EOF' > m\nnote\nEOF\ngit push origin main 2>&1");
});

test('session start message flags the harness session branch', () => {
  const message = sessionStartMessage('claude/affectionate-turing-oioi06', 'bf13418');
  assert.match(message, /claude\/affectionate-turing-oioi06/);
  assert.match(message, /bf13418/);
  assert.doesNotMatch(sessionStartMessage('docs/H-019-branch-guard', 'bf13418'), /작업 브랜치가 아니다/);
  assert.match(sessionStartMessage('main', ''), /git fetch origin develop/);
});

test('hotfix branches allow creation and push while retaining protected targets', () => {
  for (const name of ['hotfix/HF001-pack-reclaim-recovery', 'hotfix/HF001-pack-reclaim-recovery-develop', 'hotfix/HF001']) {
    assert.match(name, ALLOWED_BRANCH);
    ok(`git switch -c ${name} origin/main`);
    ok(`git checkout -b ${name} origin/main`);
    ok(`git worktree add -b ${name} ../hotfix origin/main`);
    ok(`git push -u origin ${name}`);
    ok('git push -u origin HEAD', name);
    ok('git push', name);
    for (const target of ['main', 'develop', 'claude/x']) blocked(`git push origin HEAD:${target}`, name);
    blocked(`git push origin --delete ${name}`, name);
    blocked(`git push origin :${name}`, name);
  }
  ok('git switch -c hotfix/HF001-pack-reclaim-recovery-develop origin/develop');
  for (const name of ['hotfix/HF-001-x', 'hotfix/H-027-x', 'fix/HF001-x', 'hotfix/main', 'hotfix/HF01-x']) {
    assert.doesNotMatch(name, ALLOWED_BRANCH);
    blocked(`git switch -c ${name} origin/main`);
    blocked(`git push origin ${name}`);
  }
});

test('session guidance distinguishes hotfix targets and reports missing bases', () => {
  for (const branch of ['hotfix/HF001-x', 'hotfix/HF001-x-develop']) {
    const message = sessionStartMessage(branch, 'dev123', 'main456');
    assert.doesNotMatch(message, /작업 브랜치가 아니다/);
    assert.match(message, /origin\/main 최신: main456/);
    assert.match(message, /origin\/develop 최신: dev123/);
    assert.match(message, /핫픽스 구현 PR base는 main·develop/);
    assert.match(message, /통합 PR base는 develop/);
    assert.doesNotMatch(message, /일반 작업 PR base는 develop으로 명시/);
  }
  assert.match(sessionStartMessage('docs/H-028-x', 'dev123', 'main456'), /일반 작업 PR base는 develop/);
  const failed = sessionStartMessage('hotfix/HF001-x', '', '');
  assert.match(failed, /git fetch origin main/);
  assert.match(failed, /git fetch origin develop/);
  assert.doesNotMatch(failed, /최신:/);
});

test('failed fetch never reports an old remote-tracking SHA as current', async () => {
  const { refreshBaseSha } = await import('./branch-guard.mjs');
  for (const branch of ['main', 'develop']) {
    const calls = [];
    assert.equal(refreshBaseSha('/repo', branch, (args) => {
      calls.push(args);
      if (args[0] === 'fetch') throw new Error('offline');
      return 'stale';
    }), '');
    assert.deepEqual(calls, [['fetch', '--quiet', 'origin', branch]]);
    const success = [];
    assert.equal(refreshBaseSha('/repo', branch, (args, cwd, timeout) => {
      assert.equal(cwd, '/repo');
      assert.equal(timeout, args[0] === 'fetch' ? 8000 : 2000);
      success.push(args);
      return args[0] === 'fetch' ? '' : 'fresh';
    }), 'fresh');
    assert.deepEqual(success, [['fetch', '--quiet', 'origin', branch], ['rev-parse', '--short', `origin/${branch}`]]);
  }
});
