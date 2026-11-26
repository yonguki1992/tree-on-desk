// Claude Code hook. 클라우드 세션이 배정하는 claude/* 세션 브랜치 대신
// 저장소 브랜치 규칙(docs/workflow/COLLABORATION.md)을 따르도록 강제한다.
//   session-start : origin/main·develop을 받고 규칙 안내를 세션 컨텍스트에 넣는다(stdout).
//   pre-tool-use  : Bash 명령의 브랜치 생성·push를 검사해 위반이면 exit 2로 거부한다(stderr가 Claude에 전달됨).
// 셸을 완전히 해석하지 않는 안전장치다. eval·변수로 조립한 명령 등은 잡지 못한다.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ALLOWED_BRANCH = /^(?:(?:feat|fix|docs)\/(?:H-\d{3}|T\d{3})(?:-[A-Z])?(?:-[a-z0-9][a-z0-9.-]*)?|hotfix\/HF\d{3}(?:-[a-z0-9][a-z0-9.-]*)?)$/;
const PROTECTED_BRANCH = /^(?:main|develop|claude\/.+)$/;
const RULE = '일반 작업 브랜치는 최신 origin/develop에서 feat|fix|docs/<작업ID>-<설명> 형식으로 만든다(예: feat/T001-widget). '
  + '핫픽스는 사용자 지시가 있을 때 최신 origin/main에서 hotfix/HF<번호>-<설명> 형식으로 만든다. '
  + '같은 hotfix 브랜치로 main·develop 대상 PR을 연다. develop 충돌 시에만 최신 origin/develop에서 같은 HF ID의 -develop 통합 브랜치를 만들어 hotfix를 merge한다. '
  + 'main·develop·claude/* 세션 브랜치에는 push하지 않는다. 근거: CLAUDE.md, docs/workflow/COLLABORATION.md';

/**
 * 따옴표를 고려해 명령을 단순 명령 단위(토큰 배열)로 나눈다.
 * 리다이렉션(2>&1, >file, &>file)과 대상은 버리고 heredoc 본문은 건너뛴다.
 */
export function splitCommands(command) {
  const commands = [];
  let words = [];
  let word = null;
  let quote = null;
  let dropNext = false;
  const heredocs = [];
  const endWord = () => {
    if (word !== null) { if (dropNext) dropNext = false; else words.push(word); }
    word = null;
  };
  const endCommand = () => { endWord(); dropNext = false; if (words.length) commands.push(words); words = []; };
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    if (!quote && (ch === '<' || ch === '>' || (ch === '&' && command[i + 1] === '>'))) {
      if (word !== null && /^\d+$/.test(word)) word = null; else endWord();
      let op = '';
      while (i < command.length && '<>&|'.includes(command[i]) && op.length < 3) op += command[i++];
      if (op === '<<' || op === '<<-') {
        while (command[i] === ' ' || command[i] === '\t') i += 1;
        let delimiter = '';
        while (i < command.length && !/[\s;&|()<>]/.test(command[i])) delimiter += command[i++];
        heredocs.push({ delimiter: delimiter.replace(/['"\\]/g, ''), strip: op === '<<-' });
      } else {
        dropNext = true;
      }
      i -= 1;
      continue;
    }
    if (!quote && ch === '\n' && heredocs.length) {
      endCommand();
      let start = i + 1;
      for (const { delimiter, strip } of heredocs.splice(0)) {
        while (start < command.length) {
          const end = command.indexOf('\n', start) === -1 ? command.length : command.indexOf('\n', start);
          const line = command.slice(start, end);
          start = end + 1;
          if ((strip ? line.replace(/^\t+/, '') : line) === delimiter) break;
        }
      }
      i = start - 1;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && i + 1 < command.length) word += command[++i];
      else word += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      word ??= '';
    } else if (ch === '\\' && i + 1 < command.length) {
      word = (word ?? '') + command[++i];
    } else if (/\s/.test(ch)) {
      if (ch === '\n') endCommand(); else endWord();
    } else if (';&|()'.includes(ch)) {
      endCommand();
    } else {
      word = (word ?? '') + ch;
    }
  }
  endCommand();
  return commands;
}

const GIT_GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);

/** 단순 명령에서 git 하위 명령과 인자, -C 경로를 찾는다. git 명령이 아니면 null. */
function parseGit(words) {
  let i = 0;
  while (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) i += 1;
  if (['sudo', 'command', 'exec', 'env', 'time'].includes(words[i])) i += 1;
  if (!/(?:^|\/)git(?:\.exe)?$/.test(words[i] ?? '')) return null;
  i += 1;
  let dir = null;
  while (i < words.length && words[i].startsWith('-')) {
    if (words[i] === '-C') dir = words[i + 1];
    if (GIT_GLOBAL_WITH_VALUE.has(words[i])) i += 2; else i += 1;
  }
  return { sub: words[i], args: words.slice(i + 1), dir };
}

function createdBranches(sub, args) {
  const names = [];
  const valueAfter = flags => args.forEach((arg, i) => { if (flags.includes(arg) && args[i + 1]) names.push(args[i + 1]); });
  if (sub === 'checkout') valueAfter(['-b', '-B', '--orphan']);
  if (sub === 'switch') {
    valueAfter(['-c', '-C', '--create', '--force-create', '--orphan']);
    for (const arg of args) {
      const m = /^--(?:create|force-create|orphan)=(.+)$/.exec(arg);
      if (m) names.push(m[1]);
    }
  }
  if (sub === 'worktree' && args[0] === 'add') valueAfter(['-b', '-B']);
  if (sub === 'branch') {
    const info = ['-d', '-D', '--delete', '-l', '--list', '-a', '--all', '-r', '--remotes', '-v', '-vv', '--verbose',
      '--show-current', '--contains', '--no-contains', '--merged', '--no-merged', '-u', '--set-upstream-to',
      '--unset-upstream', '--edit-description', '--points-at', '--format', '--sort', '--column'];
    if (args.some(arg => info.includes(arg) || /^--(?:set-upstream-to|format|sort|contains|merged|points-at)=/.test(arg))) return names;
    const positional = args.filter(arg => !arg.startsWith('-'));
    if (args.some(arg => ['-m', '-M', '-c', '-C', '--move', '--copy'].includes(arg))) {
      if (positional.length) names.push(positional[positional.length - 1]);
    } else if (positional.length) {
      names.push(positional[0]);
    }
  }
  return names;
}

const PUSH_WITH_VALUE = new Set(['--repo', '-o', '--push-option', '--receive-pack', '--exec', '--signed']);

function pushTargets(args, currentBranch) {
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (['--all', '--mirror', '--branches'].includes(arg)) return { error: `git push ${arg}는 여러 브랜치를 한꺼번에 push하므로 사용하지 않는다.` };
    if (PUSH_WITH_VALUE.has(arg)) { i += 1; continue; }
    if (!arg.startsWith('-')) positional.push(arg);
  }
  const refspecs = positional.slice(1);
  if (!refspecs.length) return { targets: [currentBranch()] };
  const targets = [];
  for (const spec of refspecs) {
    const raw = spec.replace(/^\+/, '');
    if (raw.startsWith(':')) return { error: '원격 브랜치 삭제(git push origin :branch)는 사용자가 직접 수행한다.' };
    let dst = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw;
    if (dst.startsWith('refs/tags/')) continue;
    if (dst === 'HEAD' || dst === '@') dst = currentBranch();
    targets.push(dst.replace(/^refs\/heads\//, ''));
  }
  return { targets };
}

/**
 * Bash 명령 문자열을 검사해 위반 사유 목록을 돌려준다(빈 배열이면 허용).
 * currentBranch(dir)는 해당 디렉터리의 현재 브랜치 이름을 돌려준다.
 */
export function checkCommand(command, currentBranch, depth = 0) {
  const problems = [];
  let cwd = null;
  for (const words of splitCommands(command)) {
    if (words[0] === 'cd' && words[1]) { cwd = cwd && !words[1].startsWith('/') ? resolve(cwd, words[1]) : words[1]; continue; }
    const shellIndex = words.findIndex(w => /(?:^|\/)(?:ba|z)?sh$/.test(w));
    if (shellIndex >= 0 && depth < 2) {
      const c = words.indexOf('-c', shellIndex);
      if (c >= 0 && words[c + 1]) problems.push(...checkCommand(words[c + 1], currentBranch, depth + 1));
      continue;
    }
    const git = parseGit(words);
    if (!git) continue;
    const dir = git.dir ? (cwd ? resolve(cwd, git.dir) : git.dir) : cwd;
    for (const name of createdBranches(git.sub, git.args)) {
      if (!ALLOWED_BRANCH.test(name)) problems.push(`브랜치 이름 '${name}'이 저장소 규칙에 맞지 않는다.`);
    }
    if (git.sub === 'push') {
      if (git.args.includes('--delete') || git.args.includes('-d')) {
        problems.push('원격 브랜치 삭제(git push --delete)는 사용자가 직접 수행한다.');
        continue;
      }
      const { error, targets = [] } = pushTargets(git.args, () => currentBranch(dir));
      if (error) problems.push(error);
      for (const target of targets) {
        if (!target) problems.push('push 대상 브랜치를 확인할 수 없다.');
        else if (PROTECTED_BRANCH.test(target)) problems.push(`'${target}'에는 push하지 않는다.`);
        else if (!ALLOWED_BRANCH.test(target)) problems.push(`push 대상 '${target}'이 저장소 브랜치 규칙에 맞지 않는다.`);
      }
    }
  }
  return problems;
}

function git(args, cwd, timeout = 5000) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function branchAt(baseDir) {
  return dir => {
    try { return git(['rev-parse', '--abbrev-ref', 'HEAD'], dir ? resolve(baseDir, dir) : baseDir); } catch { return ''; }
  };
}

export function sessionStartMessage(branch, developSha, mainSha = '') {
  const lines = ['[branch-guard] Tree on Desk 작업 브랜치와 PR 대상을 확인한다.'];
  if (!ALLOWED_BRANCH.test(branch)) {
    lines.push(`현재 브랜치 '${branch || '알 수 없음'}'은 작업 브랜치가 아니다. 여기서 커밋·push하지 않는다.`);
  }
  lines.push(RULE);
  lines.push(developSha ? `origin/develop 최신: ${developSha}.` : 'origin/develop을 받지 못했다. 작업 전에 git fetch origin develop을 다시 시도한다.');
  lines.push(mainSha ? `origin/main 최신: ${mainSha}.` : 'origin/main을 받지 못했다. 핫픽스 작업 전에 git fetch origin main을 다시 시도한다.');
  lines.push(branch.startsWith('hotfix/')
    ? '핫픽스 구현 PR base는 main·develop, 충돌 해결용 통합 PR base는 develop이다. 병합 후 기록 PR도 develop 대상이다. 카드 handoff에서 브랜치 역할과 기준 SHA를 확인한다.'
    : '일반 작업 PR base는 develop으로 명시한다.');
  return lines.join('\n');
}

/** 두 기준 조회와 현재 브랜치 조회가 30초 hook 제한 안에 끝나도록 제한한다. fetch 실패 시 오래된 SHA는 숨긴다. */
export function refreshBaseSha(baseDir, branch, runGit = git) {
  try {
    runGit(['fetch', '--quiet', 'origin', branch], baseDir, 8000);
    return runGit(['rev-parse', '--short', `origin/${branch}`], baseDir, 2000);
  } catch {
    return '';
  }
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function main(mode) {
  const input = JSON.parse((await readStdin()) || '{}');
  const baseDir = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (mode === 'session-start') {
    const developSha = refreshBaseSha(baseDir, 'develop');
    const mainSha = refreshBaseSha(baseDir, 'main');
    console.log(sessionStartMessage(branchAt(baseDir)(null), developSha, mainSha));
    return;
  }
  if (mode === 'pre-tool-use') {
    const command = input.tool_input?.command;
    if (typeof command !== 'string') return;
    const problems = checkCommand(command, branchAt(baseDir));
    if (problems.length) {
      console.error(`[branch-guard] 명령을 거부했다.\n- ${problems.join('\n- ')}\n${RULE}`);
      process.exitCode = 2;
    }
    return;
  }
  throw new Error(`unknown mode: ${mode}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch(error => {
    // hook 자체 오류로 작업을 막지 않는다(exit 1은 비차단 오류).
    console.error(`[branch-guard] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
