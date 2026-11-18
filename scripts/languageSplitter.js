"use strict";

const matter = require("gray-matter");
const { marked } = require("marked");

const LANGUAGE_NAMES = { my: "Myanmar", en: "English" };

const SOCIAL_LINKS = [
  "https://huggingface.co/DatarrX",
  "https://github.com/DatarrX",
  "https://www.linkedin.com/company/datarrx/",
  "https://t.me/datarrx",
];

function cleanText(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return fallback;
}

function cleanArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function normalizeSlug(rawSlug) {
  return cleanText(rawSlug)
    .toLowerCase()
    .replace(/-(myanmar|english)$/i, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractBlock(body, lang) {
  const pattern = new RegExp(
    `<div\\b[^>]*data-lang=["']${lang}["'][^>]*>([\\s\\S]*?)<\\/div\\s*>`,
    "i"
  );
  const match = pattern.exec(body);
  return match ? match[1].trim() : "";
}

function extractLanguageBlocks(body) {
  return {
    my: extractBlock(body, "my"),
    en: extractBlock(body, "en"),
  };
}

function markdownToHtml(markdown) {
  return marked
    .parse(markdown, {
      async: false,
      gfm: true,
      breaks: false,
    })
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatSourceWithLinks(rawSource) {
  const urlPattern = /(https?:\/\/[^\s<>"']+)/g;
  let result = "";
  let lastIndex = 0;
  let match;

  while ((match = urlPattern.exec(rawSource)) !== null) {
    result += escapeHtml(rawSource.slice(lastIndex, match.index));

    let rawUrl = match[1];
    let trailing = "";
    const trailingMatch = rawUrl.match(/([.,;!?)]+)$/);
    if (trailingMatch) {
      trailing = trailingMatch[1];
      rawUrl = rawUrl.slice(0, -trailing.length);
    }

    const safeUrl = escapeHtml(rawUrl);
    result += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>${escapeHtml(trailing)}`;
    lastIndex = urlPattern.lastIndex;
  }

  result += escapeHtml(rawSource.slice(lastIndex));
  return result;
}

function sourcesHtml(sources, lang) {
  if (!sources.length) return "";
  const heading = lang === "my" ? "ကိုးကားချက်များ" : "References";
  const items = sources.map((source) => `<li>${formatSourceWithLinks(source)}</li>`).join("");
  return `<section class="dhalay-sources" aria-label="${escapeHtml(heading)}"><h2>${escapeHtml(heading)}</h2><ol>${items}</ol></section>`;
}

function buildCombinedMarkdown(title, primaryMarkdown, secondaryMarkdown, sources, lang) {
  const hasLeadingH1 = /^#\s+/m.test(primaryMarkdown.trim());
  const parts = [];

  if (!hasLeadingH1 && title) {
    parts.push(`# ${title}`);
  }

  parts.push(primaryMarkdown.trim());
  parts.push(secondaryMarkdown.trim());

  if (sources.length > 0) {
    const sourceHeading = lang === "my" ? "## ကိုးကားချက်များ" : "## References";
    parts.push(`${sourceHeading}\n\n${sources.map((s) => `- ${s}`).join("\n")}`);
  }

  return parts.join("\n\n");
}

function buildAttribution() {
  return {
    organization: "DatarrX Foundation (ဒေတာ-အက်စ်)",
    url: "https://datarrx.org/",
    identity: "Myanmar's First Non-Profit, Open-Source NLP & Data Research Foundation",
    leadership: [
      { name: "Khant Sint Heinn", role: "Founder" },
      { name: "Ah Maung Oo", role: "Co-Founder" },
    ],
    ecosystem: {
      foundation: {
        name: "DatarrX",
        url: "https://datarrx.org/",
        tagline: "Defining the Unknown through Rigorous Data Research",
      },
      myanmarXiv: {
        name: "MyanmarXiv",
        url: "https://myanmarxiv.datarrx.org",
        tagline: "The Open Scholarly Archive for Research in Myanmar Script",
      },
      dhalay: {
        name: "Dhalay",
        url: "https://dhalay.datarrx.org",
        tagline: "Open-Source AI/RAG-Ready Digital Knowledge Repository for Myanmar Cultural Heritage",
      },
    },
    social: {
      huggingface: "https://huggingface.co/DatarrX",
      github: "https://github.com/DatarrX",
      linkedin: "https://www.linkedin.com/company/datarrx/",
      telegram: "https://t.me/datarrx",
    },
    license: "CC BY 4.0",
    notice_mm:
      "ဤဆောင်းပါးနှင့် အချက်အလက်များကို မြန်မာနိုင်ငံ၏ ပထမဦးဆုံး Open-Source NLP သုတေသနဖောင်ဒေးရှင်းဖြစ်သည့် DatarrX (MyanmarXiv နှင့် Dhalay တည်ထောင်သူ) က စုစည်းမျှဝေထားခြင်း ဖြစ်ပါသည်။",
    notice_en:
      "Curated and openly shared by DatarrX, Myanmar's first non-profit open-source NLP foundation and creator of MyanmarXiv and Dhalay.",
  };
}

function buildJsonLd(page, sources) {
  const authors = (page.contributors.length ? page.contributors : ["dhalay-team"]).map((name) => ({
    "@type": "Organization",
    name,
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ResearchOrganization",
        "@id": "https://datarrx.org/#organization",
        name: "DatarrX",
        alternateName: "ဒေတာ-အက်စ်",
        url: "https://datarrx.org/",
        foundingDate: "2025-12-12",
        founder: [
          {
            "@type": "Person",
            name: "Khant Sint Heinn",
            jobTitle: "Founder",
          },
          {
            "@type": "Person",
            name: "Ah Maung Oo",
            jobTitle: "Co-Founder",
          },
        ],
        sameAs: SOCIAL_LINKS,
        description:
          "Myanmar's first non-profit, open-source NLP and data research foundation curating machine-ready datasets for Burmese and ethnic languages.",
        owns: [
          {
            "@type": "DataCatalog",
            name: "MyanmarXiv",
            url: "https://myanmarxiv.datarrx.org",
            description: "The Open Scholarly Archive for Research in Myanmar Script",
          },
          {
            "@type": "DataCatalog",
            name: "Dhalay",
            url: "https://dhalay.datarrx.org",
            description:
              "Open-source AI/RAG-ready digital knowledge repository for Myanmar traditional attire and cultural heritage",
          },
        ],
      },
      {
        "@type": "Article",
        "@id": `https://dhalay.datarrx.org/api/v1/pages/${page.slug}.json#article`,
        headline: page.title,
        description: page.summary,
        inLanguage: page.lang,
        keywords: page.tags,
        author: authors,
        citation: sources,
        isPartOf: {
          "@type": "DataCatalog",
          name: "Dhalay",
          url: "https://dhalay.datarrx.org",
        },
        publisher: { "@id": "https://datarrx.org/#organization" },
        creditText:
          "ပြန်လည်ကူးယူဖော်ပြပါက DatarrX Foundation (Dhalay Project) အား ရည်ညွှန်းဖော်ပြပေးပါရန်။ Attribution to DatarrX Foundation (Dhalay Project) is required under CC BY 4.0.",
        license: "https://creativecommons.org/licenses/by/4.0/",
      },
    ],
  };
}

function languageSplitter(markdownSource, sourcePath = "") {
  const parsed = matter(markdownSource);
  const data = parsed.data || {};
  const slug = normalizeSlug(data.slug);
  if (!slug) {
    throw new Error(`Missing or invalid frontmatter slug in ${sourcePath}`);
  }

  const blocks = extractLanguageBlocks(parsed.content);
  if (!blocks.my || !blocks.en) {
    throw new Error(
      `Both <div data-lang="my"> and <div data-lang="en"> blocks are required in ${sourcePath}`
    );
  }

  const meta = {
    contributors: cleanArray(data.contributors),
    title_mm: cleanText(data.title_mm),
    title_en: cleanText(data.title_en),
    slug,
    category: cleanText(data.category, "Myanmar Cultural Heritage"),
    tags_mm: cleanArray(data.tags_mm),
    tags_en: cleanArray(data.tags_en),
    summary_mm: cleanText(data.summary_mm),
    summary_en: cleanText(data.summary_en),
    sources: cleanArray(data.sources),
  };

  if (!meta.title_mm || !meta.title_en) {
    throw new Error(`Both title_mm and title_en are required in ${sourcePath}`);
  }

  const myHtml = markdownToHtml(blocks.my);
  const enHtml = markdownToHtml(blocks.en);
  const attribution = buildAttribution();

  const variants = [
    {
      lang: "my",
      secondaryLang: "en",
      slug: `${slug}-myanmar`,
      alternateSlug: `${slug}-english`,
      title: meta.title_mm,
      summary: meta.summary_mm,
      tags: meta.tags_mm,
      primaryHtml: myHtml,
      primaryMarkdown: blocks.my,
      secondaryHtml: enHtml,
      secondaryMarkdown: blocks.en,
    },
    {
      lang: "en",
      secondaryLang: "my",
      slug: `${slug}-english`,
      alternateSlug: `${slug}-myanmar`,
      title: meta.title_en,
      summary: meta.summary_en,
      tags: meta.tags_en,
      primaryHtml: enHtml,
      primaryMarkdown: blocks.en,
      secondaryHtml: myHtml,
      secondaryMarkdown: blocks.my,
    },
  ];

  return variants.map((variant) => {
    const bodyHtml =
      `<article class="dhalay-article-language dhalay-language-${variant.lang}" lang="${variant.lang}" dir="ltr">` +
      variant.primaryHtml +
      `</article>` +
      `<article class="dhalay-article-language dhalay-language-${variant.secondaryLang}" lang="${variant.secondaryLang}" dir="ltr">` +
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
        combined: buildCombinedMarkdown(
          variant.title,
          variant.primaryMarkdown,
          variant.secondaryMarkdown,
          meta.sources,
          variant.lang
        ),
      },
      attribution,
    };

    page.jsonLd = buildJsonLd(page, meta.sources);
    return page;
  });
}

module.exports = {
  languageSplitter,
  extractLanguageBlocks,
  markdownToHtml,
  buildAttribution,
};