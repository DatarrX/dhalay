"use strict";

const fs = require("fs");
const path = require("path");
const { minify } = require("terser");
const { languageSplitter } = require("./languageSplitter");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const CONTENT_DIRS = [path.join(ROOT, "content"), path.join(ROOT, "contents")];

function walkMarkdown(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(fullPath, found);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) found.push(fullPath);
  }
  return found;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(relativePath, value) {
  const target = path.join(DIST, relativePath);
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function removeDuplicates(files) {
  const seen = new Set();
  return files.filter((file) => {
    const relative = path.relative(ROOT, file).replace(/\\/g, "/");
    if (seen.has(relative)) return false;
    seen.add(relative);
    return true;
  });
}

async function main() {
  fs.rmSync(DIST, { recursive: true, force: true });

  const files = removeDuplicates(CONTENT_DIRS.flatMap((dir) => walkMarkdown(dir)));
  if (!files.length) throw new Error("No Markdown files found under content/ or legacy contents/");

  const pages = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const variants = languageSplitter(source, path.relative(ROOT, file).replace(/\\/g, "/"));
    pages.push(...variants);
  }

  pages.sort((a, b) => a.slug.localeCompare(b.slug));

  const manifestItems = pages.map((page) => ({
    slug: page.slug,
    lang: page.lang,
    title: page.title,
    summary: page.summary,
    tags: page.tags,
    category: page.category,
    alternateSlug: page.alternateSlug,
  }));

  const pageSize = 100;
  const manifestPages = [];
  for (let index = 0; index < manifestItems.length; index += pageSize) {
    manifestPages.push(manifestItems.slice(index, index + pageSize));
  }

  writeJson("api/v1/index.json", {
    attribution: pages[0].attribution,
    version: "v1",
    total: manifestItems.length,
    pageSize,
    pages: manifestPages.length,
    items: manifestItems,
    paginatedItems: manifestPages,
  });

  for (const page of pages) {
    writeJson(`api/v1/pages/${page.slug}.json`, page);
  }

  const ragTarget = path.join(DIST, "api/v1/rag-corpus.jsonl");
  ensureDir(path.dirname(ragTarget));
  const ragLines = pages.map((page) => JSON.stringify({
    id: page.slug,
    slug: page.slug,
    lang: page.lang,
    title: page.title,
    summary: page.summary,
    category: page.category,
    tags: page.tags,
    contributors: page.contributors,
    sources: page.sources,
    markdown: page.rawMarkdown.combined,
    attribution: page.attribution,
  }));
  fs.writeFileSync(ragTarget, `${ragLines.join("\n")}\n`, "utf8");

  ensureDir(path.join(DIST, "sdk"));
  const sdkSource = fs.readFileSync(path.join(ROOT, "src/sdk/dhalay-widget.js"), "utf8");
  const minified = await minify(sdkSource, {
    compress: { passes: 2 },
    mangle: true,
    format: { comments: false },
  });
  fs.writeFileSync(path.join(DIST, "sdk/dhalay-widget.min.js"), minified.code, "utf8");

  fs.writeFileSync(path.join(DIST, "_headers"), [
    "/*",
    "  Access-Control-Allow-Origin: *",
    "  Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=86400",
    "  X-Powered-By: DatarrX Foundation (Creators of MyanmarXiv & dhalay)",
    "  X-Data-License: CC-BY-4.0",
    "",
    "/api/v1/*.json",
    "  Content-Type: application/json; charset=utf-8",
    "",
    "/api/v1/rag-corpus.jsonl",
    "  Content-Type: application/x-ndjson; charset=utf-8",
    "",
  ].join("\n"), "utf8");

  fs.writeFileSync(path.join(DIST, "llms.txt"), [
    "# dhalay - Open Knowledge for Myanmar Cultural Heritage",
    "",
    "DatarrX Foundation (ဒေတာ-အက်စ်)",
    "Myanmar's first non-profit, open-source NLP and data research foundation.",
    "",
    "- Foundation: https://datarrx.org",
    "- MyanmarXiv: The Open Scholarly Archive for Research in Myanmar Script",
    "- dhalay: Open-source, AI/RAG-ready cultural knowledge repository",
    "- API: /api/v1/index.json",
    "- RAG corpus: /api/v1/rag-corpus.jsonl",
    "- Widget: /sdk/dhalay-widget.min.js",
    "- License: CC BY 4.0",
    "",
  ].join("\n"), "utf8");

  console.log(`Built ${pages.length} pages from ${files.length} Markdown files.`);
  console.log(`Output: ${path.relative(ROOT, DIST)}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
