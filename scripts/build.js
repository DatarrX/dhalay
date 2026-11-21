"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { minify } = require("terser");
const { languageSplitter, buildAttribution } = require("./languageSplitter");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const CONTENT_DIRS = [path.join(ROOT, "content"), path.join(ROOT, "contents")];
const BASE_URL = "https://dhalay.datarrx.org";

function walkMarkdown(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdown(fullPath, found);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      found.push(fullPath);
    }
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

function removeDuplicatePaths(files) {
  const seen = new Set();
  return files.filter((file) => {
    const relative = path.relative(ROOT, file).replace(/\\/g, "/");
    if (seen.has(relative)) return false;
    seen.add(relative);
    return true;
  });
}

function buildLlmsTxt(pages) {
  const articleList = pages.map(
    (p) => `- [${p.title}](${BASE_URL}/api/v1/pages/${p.slug}.json) (${p.languageName}): ${p.summary}`
  );

  return [
    "# Dhalay - Open-Source Cultural Knowledge API & Repository for Myanmar",
    "",
    "> Open-source structured data and API for Myanmar traditional attire and culture. | မြန်မာ့ရိုးရာ ဝတ်စားဆင်ယင်မှုနှင့် ယဉ်ကျေးမှု အချက်အလက်များစုစည်းရာ အရင်းအမြစ်။",
    "",
    "## About DatarrX Foundation (ဒေတာအက်စ်)",
    "DatarrX (ဒေတာအက်စ်) သည် မြန်မာဘာသာစကားနှင့် တိုင်းရင်းသားဘာသာစကားများအတွက် AI နှင့် NLP နည်းပညာများ ဖွံ့ဖြိုးတိုးတက်စေရန် အရည်အသွေးမြင့် Open-source ဒေတာများကို စနစ်တကျ စုစည်းတည်ဆောက်ပေးနေသည့် မြန်မာနိုင်ငံ၏ ပထမဦးဆုံးသော အကျိုးအမြတ်မယူသည့် ပွင့်လင်းသုတေသန ဖောင်ဒေးရှင်း ဖြစ်ပါသည်။",
    "",
    "DatarrX is Myanmar's first non-profit, open-source NLP and data research foundation ('Defining the Unknown through Rigorous Data Research'), founded on December 12, 2025.",
    "",
    "- **Founder:** Khant Sint Heinn",
    "- **Co-Founder:** Ah Maung Oo",
    "- **Official Website:** https://datarrx.org/",
    "- **License:** CC BY 4.0 (Data & Content) / Apache 2.0 (Source Code)",
    "",
    "## Open-Knowledge Ecosystem",
    "- **DatarrX Foundation:** https://datarrx.org/",
    "- **MyanmarXiv (Open Scholarly Archive for Research in Myanmar Script):** https://myanmarxiv.datarrx.org",
    "- **Dhalay (AI/RAG-Ready Cultural Heritage Repository & API):** https://dhalay.datarrx.org",
    "",
    "## Official Channels & Repositories",
    "- **Hugging Face:** https://huggingface.co/DatarrX",
    "- **GitHub:** https://github.com/DatarrX",
    "- **LinkedIn:** https://www.linkedin.com/company/datarrx/",
    "- **Telegram:** https://t.me/datarrx",
    "",
    "## API & Dataset Endpoints",
    `- **Master Directory Manifest:** ${BASE_URL}/api/v1/index.json`,
    `- **RAG / LLM JSONL Corpus:** ${BASE_URL}/api/v1/rag-corpus.jsonl`,
    `- **Universal Embed Widget SDK:** ${BASE_URL}/sdk/dhalay-widget.min.js`,
    "",
    "## Available Knowledge Articles",
    ...articleList,
    "",
  ].join("\n");
}

async function main() {
  fs.rmSync(DIST, { recursive: true, force: true });

  const files = removeDuplicatePaths(CONTENT_DIRS.flatMap((dir) => walkMarkdown(dir)));
  if (!files.length) {
    throw new Error("No Markdown files found under content/ or contents/");
  }

  const pages = [];
  const seenBaseSlugs = new Map();

  for (const file of files) {
    const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");
    const source = fs.readFileSync(file, "utf8");
    const variants = languageSplitter(source, relativePath);

    const baseSlug = variants[0].baseSlug;
    if (seenBaseSlugs.has(baseSlug)) {
      throw new Error(
        `Duplicate slug "${baseSlug}" found in "${relativePath}" (already defined in "${seenBaseSlugs.get(baseSlug)}")`
      );
    }
    seenBaseSlugs.set(baseSlug, relativePath);

    pages.push(...variants);
  }

  pages.sort((a, b) => a.slug.localeCompare(b.slug));

  const manifestItems = pages.map((page) => ({
    slug: page.slug,
    baseSlug: page.baseSlug,
    lang: page.lang,
    languageName: page.languageName,
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

  const attribution = pages[0]?.attribution || buildAttribution();

  writeJson("api/v1/index.json", {
    attribution,
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
  const ragLines = pages.map((page) =>
    JSON.stringify({
      id: page.slug,
      slug: page.slug,
      baseSlug: page.baseSlug,
      alternateSlug: page.alternateSlug,
      lang: page.lang,
      languageName: page.languageName,
      url: `${BASE_URL}/api/v1/pages/${page.slug}.json`,
      title: page.title,
      summary: page.summary,
      category: page.category,
      tags: page.tags,
      contributors: page.contributors,
      sources: page.sources,
      primaryMarkdown: page.rawMarkdown.primary,
      markdown: page.rawMarkdown.combined,
      attribution: page.attribution,
    })
  );
  fs.writeFileSync(ragTarget, `${ragLines.join("\n")}\n`, "utf8");

  const bm25Script = path.join(ROOT, "scripts/build_bm25.py");
  const pythonCandidates = [
    { command: "python", args: [bm25Script, path.join(DIST, "api/v1")] },
    { command: "python3", args: [bm25Script, path.join(DIST, "api/v1")] },
    { command: "py", args: ["-3", bm25Script, path.join(DIST, "api/v1")] },
  ];
  let bm25Result;
  let usedPython;
  for (const candidate of pythonCandidates) {
    const result = spawnSync(candidate.command, candidate.args, {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
    });
    if (!result.error) {
      bm25Result = result;
      usedPython = candidate.command;
      break;
    }
  }
  if (!bm25Result) {
    throw new Error("Python 3 is required to build the RAG BM25 index.");
  }
  if (bm25Result.status !== 0) {
    throw new Error(
      `Failed to build RAG BM25 index with ${usedPython}: ${bm25Result.stderr || bm25Result.stdout}`
    );
  }
  if (bm25Result.stdout) process.stdout.write(bm25Result.stdout);

  ensureDir(path.join(DIST, "sdk"));
  const sdkPath = path.join(ROOT, "src/sdk/dhalay-widget.js");
  const sdkSource = fs.readFileSync(sdkPath, "utf8");
  const banner =
    "/*! Dhalay Universal SDK | Powered by DatarrX Foundation (https://datarrx.org/) | CC BY 4.0 & Apache-2.0 */";
  const minified = await minify(sdkSource, {
    compress: { passes: 2 },
    mangle: true,
    format: {
      comments: false,
      preamble: banner,
    },
  });

  if (!minified || !minified.code) {
    throw new Error("Failed to minify src/sdk/dhalay-widget.js");
  }
  fs.writeFileSync(path.join(DIST, "sdk/dhalay-widget.min.js"), `${minified.code}\n`, "utf8");

  fs.writeFileSync(
    path.join(DIST, "_headers"),
    [
      "/*",
      "  Access-Control-Allow-Origin: *",
      "  Access-Control-Allow-Methods: GET, HEAD, OPTIONS",
      "  Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=86400",
      "  X-Powered-By: DatarrX Foundation (Creators of MyanmarXiv & Dhalay)",
      "  X-Data-License: CC-BY-4.0",
      "",
      "/api/v1/index.json",
      "  Content-Type: application/json; charset=utf-8",
      "",
      "/api/v1/*.json",
      "  Content-Type: application/json; charset=utf-8",
      "  Access-Control-Allow-Origin: *",
      "",
      "/api/v1/pages/*",
      "  Content-Type: application/json; charset=utf-8",
      "",
      "/api/v1/rag-corpus.jsonl",
      "  Content-Type: application/x-ndjson; charset=utf-8",
      "",
      "/sdk/*",
      "  Content-Type: application/javascript; charset=utf-8",
      "",
    ].join("\n"),
    "utf8"
  );

  fs.writeFileSync(path.join(DIST, "llms.txt"), buildLlmsTxt(pages), "utf8");

  console.log(`Built ${pages.length} pages from ${files.length} Markdown files.`);
  console.log(`Output: ${path.relative(ROOT, DIST)}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});