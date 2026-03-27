#!/usr/bin/env node
/**
 * Notion → Mintlify sync script
 *
 * - Traverses child_page AND link_to_page blocks (Notion uses link_to_page
 *   extensively as a "table of contents" pattern)
 * - Downloads images locally
 * - Resolves cross-page links to local paths in mint.json navigation
 * - Auto-flattens a single wrapper section (e.g. "Outline")
 * - Updates mint.json navigation after every sync
 *
 * Env vars (reusing existing GitHub secrets):
 *   DOCU_NOTION_INTEGRATION_TOKEN  — Notion integration token
 *   DOCU_NOTION_SAMPLE_ROOT_PAGE   — Root Notion page ID
 */

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const NOTION_TOKEN = process.env.DOCU_NOTION_INTEGRATION_TOKEN;
const ROOT_PAGE_ID = process.env.DOCU_NOTION_SAMPLE_ROOT_PAGE;

if (!NOTION_TOKEN || !ROOT_PAGE_ID) {
  console.error(
    'Missing env vars: DOCU_NOTION_INTEGRATION_TOKEN, DOCU_NOTION_SAMPLE_ROOT_PAGE'
  );
  process.exit(1);
}

const IMAGES_DIR = path.join(ROOT_DIR, 'images', 'notion');
const notion = new Client({ auth: NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

// ─── Global state ─────────────────────────────────────────────────────────

/** Notion page IDs already queued or written (prevents infinite loops) */
const visited = new Set();

/** pageId → { navPath, title } — used for cross-page link resolution */
const pageInfoMap = new Map();

/** Absolute paths of MDX files written during this run */
const writtenFiles = [];

// ─── Utility ──────────────────────────────────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Normalise a Notion page ID to the dashed UUID format */
function normaliseId(id) {
  const raw = id.replace(/-/g, '');
  return raw.replace(
    /^([a-f0-9]{8})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{12})$/i,
    '$1-$2-$3-$4-$5'
  );
}

// ─── Image handling ────────────────────────────────────────────────────────

async function downloadImage(imageUrl) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const cleanUrl = imageUrl.split('?')[0];
  const ext = path.extname(cleanUrl) || '.png';
  const hash = crypto.createHash('md5').update(imageUrl).digest('hex').slice(0, 12);
  const filename = `${hash}${ext}`;
  const localPath = path.join(IMAGES_DIR, filename);
  if (fs.existsSync(localPath)) return `/images/notion/${filename}`;

  return new Promise((resolve) => {
    const proto = imageUrl.startsWith('https') ? https : http;
    const file = fs.createWriteStream(localPath);
    proto
      .get(imageUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlink(localPath, () => {});
          downloadImage(res.headers.location).then(resolve);
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(`/images/notion/${filename}`);
        });
      })
      .on('error', () => {
        file.close();
        fs.unlink(localPath, () => {});
        console.warn(`  Warning: could not download ${imageUrl}`);
        resolve(imageUrl);
      });
  });
}

n2m.setCustomTransformer('image', async (block) => {
  const { image } = block;
  const url = image.type === 'external' ? image.external.url : image.file?.url;
  if (!url) return '';
  const localPath = await downloadImage(url);
  const caption = image.caption?.map((c) => c.plain_text).join('') || '';
  return `![${caption}](${localPath})`;
});

// ─── Callout → Mintlify component ─────────────────────────────────────────

const CALLOUT_EMOJI_MAP = {
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

function richTextToMd(richText = []) {
  return richText.map((r) => {
    let t = r.plain_text || '';
    if (r.annotations?.code) t = `\`${t}\``;
    if (r.annotations?.bold) t = `**${t}**`;
    if (r.annotations?.italic) t = `_${t}_`;
    if (r.href) t = `[${t}](${r.href})`;
    return t;
  }).join('');
}

n2m.setCustomTransformer('callout', async (block) => {
  const { callout } = block;
  const icon = callout.icon?.emoji || '';
  const component = CALLOUT_EMOJI_MAP[icon] || 'Note';
  const text = richTextToMd(callout.rich_text).trim();
  if (!text) return '';
  return `<${component}>\n${text}\n</${component}>`;
});

// ─── YouTube embed ─────────────────────────────────────────────────────────

n2m.setCustomTransformer('video', async (block) => {
  const { video } = block;
  const url = video.type === 'external' ? video.external.url : video.file?.url;
  if (!url) return '';
  const caption = video.caption?.map((c) => c.plain_text).join('') || 'Video';

  const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  const videoId = watchMatch?.[1] ?? shortMatch?.[1];
  if (!videoId) return `[${caption}](${url})`;

  const listId = url.match(/[?&]list=([A-Za-z0-9_-]+)/)?.[1];
  const src = listId
    ? `https://www.youtube.com/embed/${videoId}?list=${listId}`
    : `https://www.youtube.com/embed/${videoId}`;
  const safeCaption = caption.replace(/"/g, '&quot;');

  return (
    `<iframe\n` +
    `  width="100%"\n` +
    `  height="400"\n` +
    `  src="${src}"\n` +
    `  title="${safeCaption}"\n` +
    `  frameBorder="0"\n` +
    `  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"\n` +
    `  allowFullScreen\n` +
    `></iframe>`
  );
});

// ─── Notion API helpers ────────────────────────────────────────────────────

async function getPageTitle(pageId) {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const titleProp = Object.values(page.properties || {}).find(
      (p) => p.type === 'title'
    );
    return titleProp?.title?.[0]?.plain_text?.trim() || 'Untitled';
  } catch {
    return 'Untitled';
  }
}

/**
 * Return all child page references for a block, following BOTH:
 *   - child_page blocks (native Notion children)
 *   - link_to_page blocks (Notion's "mention a page" pattern, used as TOC)
 */
async function collectPageRefs(blockId) {
  const refs = [];
  const seen = new Set();
  let cursor;

  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    await sleep(350);

    for (const block of res.results) {
      if (block.type === 'child_page') {
        const id = block.id;
        if (!seen.has(id)) {
          seen.add(id);
          refs.push({ pageId: id, title: block.child_page.title || 'Untitled' });
        }
      } else if (
        block.type === 'link_to_page' &&
        block.link_to_page?.type === 'page_id'
      ) {
        const id = normaliseId(block.link_to_page.page_id);
        if (!seen.has(id)) {
          seen.add(id);
          const title = await getPageTitle(id);
          await sleep(350);
          refs.push({ pageId: id, title });
        }
      }
    }

    cursor = res.next_cursor;
  } while (cursor);

  return refs;
}

// ─── Page writing ──────────────────────────────────────────────────────────

async function writePage(pageId, filePath, title) {
  console.log(`  → ${path.relative(ROOT_DIR, filePath)}`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const mdBlocks = await n2m.pageToMarkdown(pageId);
  const { parent: content } = n2m.toMarkdownString(mdBlocks);
  await sleep(350);

  const safeTitle = title.replace(/"/g, '\\"');
  const mdx = `---\ntitle: "${safeTitle}"\n---\n\n${content}\n`;
  fs.writeFileSync(filePath, mdx, 'utf8');
  writtenFiles.push(filePath);
}

// ─── Recursive sync ────────────────────────────────────────────────────────

/**
 * Sync a single Notion page into outputDir.
 * Returns a Mintlify navigation item (string path or group object), or null.
 */
async function syncPage(pageId, title, outputDir) {
  if (visited.has(pageId)) {
    const info = pageInfoMap.get(pageId);
    return info?.navPath ?? null;
  }
  visited.add(pageId);

  const slug = slugify(title);
  const childRefs = await collectPageRefs(pageId);

  if (childRefs.length > 0) {
    // Section — recurse into a subdirectory
    console.log(`\n[section] ${title}`);
    const subDir = path.join(outputDir, slug);
    fs.mkdirSync(subDir, { recursive: true });

    const subPages = [];
    for (const ref of childRefs) {
      const result = await syncPage(ref.pageId, ref.title, subDir);
      if (result != null) subPages.push(result);
    }

    return subPages.length > 0 ? { group: title, pages: subPages } : null;
  } else {
    // Leaf page — write MDX
    const filePath = path.join(outputDir, `${slug}.mdx`);
    const navPath = path
      .relative(ROOT_DIR, filePath)
      .replace(/\.mdx$/, '')
      .replace(/\\/g, '/');

    pageInfoMap.set(pageId, { navPath, title });
    await writePage(pageId, filePath, title);
    return navPath;
  }
}

// ─── Post-process: resolve cross-page links ────────────────────────────────

function resolveLinks(content) {
  let result = content;

  // 1. [link_to_page](https://www.notion.so/UUID)
  result = result.replace(
    /\[link_to_page\]\(https?:\/\/www\.notion\.so\/([a-f0-9-]{32,36})\)/gi,
    (_, rawId) => {
      const id = normaliseId(rawId);
      const info = pageInfoMap.get(id);
      return info
        ? `[${info.title}](/${info.navPath})`
        : `[View page](https://www.notion.so/${rawId})`;
    }
  );

  // 2. [text](https://www.notion.so/...UUID) — full notion.so URLs with title slug
  result = result.replace(
    /\[([^\]]+)\]\(https?:\/\/www\.notion\.so\/[^)]*?([a-f0-9]{32})[^)]*\)/gi,
    (match, text, rawId) => {
      const id = normaliseId(rawId);
      const info = pageInfoMap.get(id);
      return info ? `[${text}](/${info.navPath})` : match;
    }
  );

  // 3. [text](https://docs.fluxbuilder.com/UUID) — old site UUID links
  result = result.replace(
    /\[([^\]]+)\]\(https?:\/\/docs\.fluxbuilder\.com\/([a-f0-9-]{32,36})\)/gi,
    (match, text, rawId) => {
      const id = normaliseId(rawId);
      const info = pageInfoMap.get(id);
      return info ? `[${text}](/${info.navPath})` : match;
    }
  );

  // 4. [text](/UUID) — relative Notion short URLs (32 hex chars, no dashes)
  result = result.replace(
    /\[([^\]]+)\]\(\/([a-f0-9]{32})\)/gi,
    (match, text, rawId) => {
      const id = normaliseId(rawId);
      const info = pageInfoMap.get(id);
      return info ? `[${text}](/${info.navPath})` : match;
    }
  );

  return result;
}

function postProcessLinks() {
  let fixed = 0;
  for (const filePath of writtenFiles) {
    const original = fs.readFileSync(filePath, 'utf8');
    const resolved = resolveLinks(original);
    if (resolved !== original) {
      fs.writeFileSync(filePath, resolved, 'utf8');
      fixed++;
    }
  }
  if (fixed > 0) console.log(`\nResolved cross-page links in ${fixed} file(s).`);
}

// ─── Workspace cleanup ─────────────────────────────────────────────────────

/** Remove previously synced MDX files and directories from the repo root */
function cleanPreviousSync() {
  const KEEP_DIRS = new Set([
    '.git', '.github', 'node_modules', 'static', 'src',
    'i18n', 'scripts', 'css', 'images', '.mintlify',
  ]);
  const KEEP_FILES = new Set([
    'mint.json', 'package.json', 'package-lock.json',
    '.gitignore', 'CNAME', '.htaccess', 'README.md',
  ]);

  for (const entry of fs.readdirSync(ROOT_DIR)) {
    const p = path.join(ROOT_DIR, entry);
    const stat = fs.statSync(p);

    if (stat.isDirectory() && !KEEP_DIRS.has(entry)) {
      fs.rmSync(p, { recursive: true, force: true });
    } else if (
      stat.isFile() &&
      entry.endsWith('.mdx') &&
      !KEEP_FILES.has(entry)
    ) {
      fs.unlinkSync(p);
    }
  }
}

// ─── mint.json ─────────────────────────────────────────────────────────────

function updateMintNavigation(navigation) {
  const mintPath = path.join(ROOT_DIR, 'mint.json');
  const mint = JSON.parse(fs.readFileSync(mintPath, 'utf8'));
  mint.navigation = navigation;
  fs.writeFileSync(mintPath, JSON.stringify(mint, null, 2) + '\n', 'utf8');
  console.log('\nmint.json navigation updated.');
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('Notion → Mintlify sync starting…\n');

  cleanPreviousSync();

  // Top-level children of root page
  let topRefs = await collectPageRefs(ROOT_PAGE_ID);
  console.log(`Found ${topRefs.length} top-level page(s).`);

  // Auto-flatten a single wrapper section (e.g. "Outline")
  if (topRefs.length === 1) {
    const { pageId, title } = topRefs[0];
    const inner = await collectPageRefs(pageId);
    if (inner.length > 0) {
      console.log(`Auto-flattening wrapper: "${title}"\n`);
      visited.add(pageId); // don't sync wrapper as a page
      topRefs = inner;
    }
  }

  const navigation = [];
  for (const ref of topRefs) {
    const result = await syncPage(ref.pageId, ref.title, ROOT_DIR);
    if (result == null) continue;
    // Top-level navigation must be group objects, not bare strings
    if (typeof result === 'string') {
      navigation.push({ group: ref.title, pages: [result] });
    } else {
      navigation.push(result);
    }
  }

  postProcessLinks();
  updateMintNavigation(navigation);
  console.log('\nSync complete!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
