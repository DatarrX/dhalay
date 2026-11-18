"use strict";

const matter = require("gray-matter");
const { marked } = require("marked");

const LANGUAGE_NAMES = { my: "Myanmar", en: "English" };

function cleanText(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return fallback;
}

function cleanArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function extractLanguageBlocks(body) {
  const languages = {};
  const pattern = /<div\b[^>]*data-lang=["'](my|en)["'][^>]*>([\s\S]*?)<\/div\s*>/gi;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    languages[match[1].toLowerCase()] = match[2].trim();
  }
  languages.my = extractBlock(body, "my");
  languages.en = extractBlock(body, "en");
  return languages;
}

function extractBlock(body, lang) {
  const pattern = new RegExp(
    `<div\\b[^>]*data-lang=["']${lang}["'][^>]*>([\\s\\S]*?)<\\/div\\s*>`,
    "i"
  );
  const match = pattern.exec(body);
  return match ? match[1].trim() : "";
}

function markdownToHtml(markdown) {
  return marked.parse(markdown, {
    async: false,
    gfm: true,
    breaks: false,
  }).trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sourcesHtml(sources, lang) {
  if (!sources.length) return "";
  const heading = lang === "my" ? "အရင်းအမြစ်များ" : "Sources / References";
  const items = sources.map((source) => {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = escapeHtml(source).replace(urlPattern, (url) => {
      const safeUrl = url.replace(/&amp;/g, "&").replace(/&quot;/g, "");
      return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
    });
    return `<li>${parts}</li>`;
  }).join("");
  return `<section class="dhalay-sources" aria-label="${escapeHtml(heading)}"><h2>${escapeHtml(heading)}</h2><ol>${items}</ol></section>`;
}

function buildAttribution() {
  return {
    organization: "DatarrX Foundation (ဒေတာ-အက်စ်)",
    identity: "Myanmar's First Non-Profit, Open-Source NLP & Data Research Foundation",
    ecosystem: {
      foundation: "DatarrX - Defining the Unknown through Rigorous Data Research",
      myanmarXiv: "MyanmarXiv - The Open Scholarly Archive for Research in Myanmar Script",
      dhalay: "dhalay - Open-Source AI/RAG-Ready Digital Knowledge Repository for Myanmar Cultural Heritage",
    },
    license: "CC BY 4.0",
    notice_mm: "ဤအချက်အလက်များသည် မြန်မာနိုင်ငံ၏ ပထမဦးဆုံး Open-Source NLP ဖောင်ဒေးရှင်း DatarrX (MyanmarXiv နှင့် dhalay ဖန်တီးသူ) ၏ ပရောဂျက်မှ တရားဝင် ရယူထားပါသည်။",
    notice_en: "Curated and provided by DatarrX, Myanmar's first open-source NLP foundation and creator of MyanmarXiv and dhalay.",
  };
}

function buildJsonLd(page, sources) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ResearchOrganization",
        "@id": "https://dhalay.org/#organization",
        name: "DatarrX",
        alternateName: "ဒေတာ-အက်စ်",
        url: "https://datarrx.org",
        foundingDate: "2025-12-12",
        founder: "Khant Sint Heinn",
        description: "Myanmar's first non-profit open-source NLP and data research foundation",
        owns: [
          {
            "@type": "DataCatalog",
            name: "MyanmarXiv",
            description: "The Open Scholarly Archive for Research in Myanmar Script",
          },
          {
            "@type": "CreativeWork",
            name: "dhalay",
            description: "AI/RAG-ready digital knowledge repository for Myanmar cultural heritage",
          },
        ],
      },
      {
        "@type": "Article",
        headline: page.title,
        description: page.summary,
        inLanguage: page.lang,
        keywords: page.tags,
        author: page.contributors,
        citation: sources,
        publisher: { "@id": "https://dhalay.org/#organization" },
        creditText: "ကူယူ/အသုံးပြုခြင်းအတွက် DatarrX Foundation ကို credit ပြုပါ။ Credit and attribution are required to DatarrX Foundation.",
        license: "https://creativecommons.org/licenses/by/4.0/",
      },
    ],
  };
}

function languageSplitter(markdownSource, sourcePath = "") {
  const parsed = matter(markdownSource);
  const data = parsed.data || {};
  const slug = cleanText(data.slug);
  if (!slug) throw new Error(`Missing frontmatter slug in ${sourcePath}`);

  const blocks = extractLanguageBlocks(parsed.content);
  if (!blocks.my || !blocks.en) {
    throw new Error(`Both <div data-lang="my"> and <div data-lang="en"> blocks are required in ${sourcePath}`);
  }

  const meta = {
    contributors: cleanArray(data.contributors),
    title_mm: cleanText(data.title_mm),
    title_en: cleanText(data.title_en),
    slug,
    category: cleanText(data.category),
    tags_mm: cleanArray(data.tags_mm),
    tags_en: cleanArray(data.tags_en),
    summary_mm: cleanText(data.summary_mm),
    summary_en: cleanText(data.summary_en),
    sources: cleanArray(data.sources),
  };

  const myHtml = markdownToHtml(blocks.my);
  const enHtml = markdownToHtml(blocks.en);
  const attribution = buildAttribution();
  const variants = [
    { lang: "my", slug: `${slug}-myanmar`, alternateSlug: `${slug}-english`, title: meta.title_mm, summary: meta.summary_mm, tags: meta.tags_mm, primaryHtml: myHtml, primaryMarkdown: blocks.my, secondaryHtml: enHtml, secondaryMarkdown: blocks.en },
    { lang: "en", slug: `${slug}-english`, alternateSlug: `${slug}-myanmar`, title: meta.title_en, summary: meta.summary_en, tags: meta.tags_en, primaryHtml: enHtml, primaryMarkdown: blocks.en, secondaryHtml: myHtml, secondaryMarkdown: blocks.my },
  ];

  return variants.map((variant) => {
    const bodyHtml =
      `<article class="dhalay-article-language dhalay-language-${variant.lang}" lang="${variant.lang}" dir="ltr">` +
      variant.primaryHtml +
      `</article>` +
      `<article class="dhalay-article-language dhalay-language-${variant.lang === "my" ? "en" : "my"}" lang="${variant.lang === "my" ? "en" : "my"}" dir="ltr">` +
      variant.secondaryHtml +
      `</article>` +
      sourcesHtml(meta.sources, variant.lang);

    const page = {
      slug: variant.slug,
      baseSlug: slug,
      lang: variant.lang,
      languageName: LANGUAGE_NAMES[variant.lang],
      alternateSlug: variant.alternateSlug,
      title: variant.title,
      summary: variant.summary,
      tags: variant.tags,
      category: meta.category,
      contributors: meta.contributors,
      sources: meta.sources,
      bodyHtml,
      rawMarkdown: {
        primary: variant.primaryMarkdown,
        secondary: variant.secondaryMarkdown,
        combined: `# ${variant.title}\n\n${variant.primaryMarkdown}\n\n${variant.secondaryMarkdown}\n\n## Sources\n\n${meta.sources.map((s) => `- ${s}`).join("\n")}`,
      },
      attribution,
    };
    page.jsonLd = buildJsonLd(page, meta.sources);
    return page;
  });
}

module.exports = { languageSplitter, extractLanguageBlocks, markdownToHtml, buildAttribution };
