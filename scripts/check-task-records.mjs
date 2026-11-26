import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const INDEXES = ['docs/TODO.md', 'docs/reviews/INDEX.md'];
const STATES = /\b(?:todo|in_progress|in-progress|in-review|awaiting-user|review|done|blocked|cancelled)\b/i;
const LIVE_DECISIONS = /검토\s*대기|판단\s*대기|병합\s*완료|진행\s*중|완료됨/;
const STATUS_HEADER = /^(?:현재\s*)?(?:상태|작업\s*상태|진행\s*상태|완료\s*여부|사용자\s*결정|status|state|done|completed|completion)$/i;

function visibleText(line) {
  // Link destinations are identifiers, not copied statuses (e.g. /review/).
  return line.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*]/g, '')
    .replace(/(?<![A-Za-z0-9])_+|_+(?![A-Za-z0-9])/g, '');
}

export function validateTaskRecordPolicy(files) {
  const errors = [];
  for (const path of INDEXES) {
    if (typeof files[path] !== 'string') {
      errors.push(`${path}: required index is missing`);
      continue;
    }
    const lines = files[path].split(/\r?\n/);
    let fence = false;
    for (const [index, raw] of lines.entries()) {
      if (/^\s*(```|~~~)/.test(raw)) { fence = !fence; continue; }
      if (fence) continue;
      const line = visibleText(raw);
      const at = `${path}:${index + 1}`;
      if (/^\s*(?:(?:[-*+]|\d+[.)])\s+)?\[[ xX]\]/.test(raw)) {
        errors.push(`${at}: completion checkboxes belong in task evidence, not indexes`);
      }
      if (/^\s*\|/.test(line)) {
        const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
        if (cells.some(cell => STATUS_HEADER.test(cell))) {
          errors.push(`${at}: current status/decision column is forbidden`);
        } else if (cells.some(cell => STATES.test(cell) || LIVE_DECISIONS.test(cell))) {
          errors.push(`${at}: do not copy current task/PR status into table cells`);
        }
      } else if (/^\s*(?:[-*+]|\d+[.)])\s+.*\b(?:HF\d{3}|H-\d{3}|T\d{3}(?:-[A-Z])?)\b/.test(line)
          && (STATES.test(line) || LIVE_DECISIONS.test(line))) {
        errors.push(`${at}: do not copy current task status into list items`);
      }
    }
  }
  const claude = files['CLAUDE.md'];
  for (const path of ['AGENTS.md', 'docs/workflow/TASKS.md']) {
    if (typeof claude !== 'string' || !claude.split(/\r?\n/).some(line => line.trim() === `@${path}`)) {
      errors.push(`CLAUDE.md: missing active @${path} import`);
    }
  }
  return errors;
}

async function main() {
  const root = new URL('../', import.meta.url);
  const files = {};
  for (const path of [...INDEXES, 'CLAUDE.md']) {
    files[path] = await readFile(new URL(path, root), 'utf8');
  }
  const errors = validateTaskRecordPolicy(files);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: indexes contain no live status copies; Claude imports the current rules.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
