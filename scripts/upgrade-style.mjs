#!/usr/bin/env node
/**
 * Upgrade existing MDX files to use Mintlify components:
 *   - YouTube standalone links → <iframe> embeds
 *   - Emoji blockquote callouts → <Note> / <Tip> / <Warning> / <Info>
 *
 * Run once after migration, or after content changes outside of a full sync.
 * Usage: node scripts/upgrade-style.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set([
  '.git', '.github', 'node_modules', 'scripts', 'images', '.mintlify',
]);

// ─── Emoji → Mintlify component ───────────────────────────────────────────

const EMOJI_TO_COMPONENT = {
  '💡': 'Tip',
  '✅': 'Info',
  '🌟': 'Tip',
  '⭐️': 'Tip',
  '⭐': 'Tip',
  '⚠️': 'Warning',
  '🚨': 'Warning',
  '❌': 'Warning',
  '⛔': 'Warning',
  '❗': 'Warning',
  'ℹ️': 'Info',
  '📝': 'Note',
  '📌': 'Note',
  '👉': 'Note',
  '🔔': 'Note',
  '💬': 'Note',
};

// Sort longest emoji first so multi-codepoint ones match before their prefix
const SORTED_EMOJIS = Object.keys(EMOJI_TO_COMPONENT).sort(
  (a, b) => b.length - a.length
);

function getLeadingEmoji(text) {
  for (const emoji of SORTED_EMOJIS) {
    if (text.startsWith(emoji)) return emoji;
  }
  return null;
}

// ─── YouTube helpers ───────────────────────────────────────────────────────

function extractYouTubeId(url) {
  // https://www.youtube.com/watch?v=VIDEO_ID[&list=LIST_ID]
  const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watchMatch) {
    const listMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
    return { videoId: watchMatch[1], listId: listMatch?.[1] ?? null };
  }
  // https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch) return { videoId: shortMatch[1], listId: null };
  return null;
}

function youtubeIframe(videoId, listId, title) {
  const src = listId
    ? `https://www.youtube.com/embed/${videoId}?list=${listId}`
    : `https://www.youtube.com/embed/${videoId}`;
  const safeTitle = (title || 'YouTube video').replace(/"/g, '&quot;');
  return (
    `<iframe\n` +
    `  width="100%"\n` +
    `  height="400"\n` +
    `  src="${src}"\n` +
    `  title="${safeTitle}"\n` +
    `  frameBorder="0"\n` +
    `  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"\n` +
    `  allowFullScreen\n` +
    `></iframe>`
  );
}

// Match a line whose entire trimmed content is a markdown link to YouTube
const YOUTUBE_LINE_RE =
  /^\[([^\]]*)\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^)]*)\)$/;

function transformYouTubeLine(line) {
  const trimmed = line.trim();
  const m = trimmed.match(YOUTUBE_LINE_RE);
  if (!m) return line;
  const extracted = extractYouTubeId(m[2]);
  if (!extracted) return line;
  // Preserve original leading whitespace
  const indent = line.match(/^(\s*)/)[1];
  return indent + youtubeIframe(extracted.videoId, extracted.listId, m[1]);
}

// ─── Per-file transformation ───────────────────────────────────────────────

function upgradeContent(content) {
  const lines = content.split('\n');
  const out = [];
  let inFrontmatter = false;
  let frontmatterSeen = false;
  let inCodeBlock = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Frontmatter ──────────────────────────────────────────────────────
    if (i === 0 && line.trim() === '---') {
      inFrontmatter = true;
      out.push(line);
      i++;
      continue;
    }
    if (inFrontmatter && line.trim() === '---') {
      inFrontmatter = false;
      frontmatterSeen = true;
      out.push(line);
      i++;
      continue;
    }
    if (inFrontmatter) {
      out.push(line);
      i++;
      continue;
    }

    // ── Code blocks ──────────────────────────────────────────────────────
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      out.push(line);
      i++;
      continue;
    }
    if (inCodeBlock) {
      out.push(line);
      i++;
      continue;
    }

    // ── Emoji blockquote callouts ────────────────────────────────────────
    // Only handle non-indented blockquotes (column 0)
    if (line.startsWith('> ') || line === '>') {
      const afterAngle = line.startsWith('> ') ? line.slice(2) : '';
      const emoji = getLeadingEmoji(afterAngle);

      if (emoji) {
        const component = EMOJI_TO_COMPONENT[emoji];
        // First line content after the emoji
        const firstContent = afterAngle.slice(emoji.length).replace(/^\s*/, '');
        const blockLines = [firstContent];
        i++;

        // Collect all continuation lines (lines starting with '>')
        while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
          blockLines.push(lines[i].startsWith('> ') ? lines[i].slice(2) : '');
          i++;
        }

        // Strip trailing blank lines
        while (blockLines.length > 0 && blockLines[blockLines.length - 1].trim() === '') {
          blockLines.pop();
        }

        // Strip trailing double-spaces (markdown hard breaks) — not needed inside components
        const cleanLines = blockLines.map((l) => l.replace(/\s{2}$/, ''));
        const body = cleanLines.join('\n');

        out.push(`<${component}>\n${body}\n</${component}>`);
        continue;
      }
    }

    // ── YouTube embeds ───────────────────────────────────────────────────
    const ytLine = transformYouTubeLine(line);
    out.push(ytLine);
    i++;
  }

  return out.join('\n');
}

// ─── File walker ───────────────────────────────────────────────────────────

function findMdxFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      results.push(...findMdxFiles(full));
    } else if (entry.endsWith('.mdx')) {
      results.push(full);
    }
  }
  return results;
}

// ─── Main ──────────────────────────────────────────────────────────────────

const files = findMdxFiles(ROOT_DIR);
let upgraded = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const result = upgradeContent(original);
  if (result !== original) {
    fs.writeFileSync(file, result, 'utf8');
    console.log(`  ✓ ${path.relative(ROOT_DIR, file)}`);
    upgraded++;
  }
}

console.log(`\nUpgraded ${upgraded} / ${files.length} files.`);
