# Dhalay

**Open-source structured data and API for Myanmar traditional attire and culture. | မြန်မာ့ရိုးရာ ဝတ်စားဆင်ယင်မှုနှင့် ယဉ်ကျေးမှု အချက်အလက်များစုစည်းရာ အရင်းအမြစ်။**

**Dhalay** is a free, static, bilingual knowledge API and embeddable widget for Myanmar's traditional attire, textile history, and cultural heritage. Each Markdown article compiles into dual-language JSON endpoints, a universal web widget, and an AI/RAG-ready corpus.

## How It Works

Every `.md` file in `content/` automatically builds into two language-prioritized routes:

| Source Slug | Generated API Route | Content Order |
|---|---|---|
| `luntaya-kyogyi-acheik-meaning` | `/api/v1/pages/luntaya-kyogyi-acheik-meaning-myanmar.json` | Burmese first, English second |
| `luntaya-kyogyi-acheik-meaning` | `/api/v1/pages/luntaya-kyogyi-acheik-meaning-english.json` | English first, Burmese second |

## Quick Start: REST API

### 1. Fetch the Master Directory

```javascript
const res = await fetch("https://YOUR-DOMAIN/api/v1/index.json");
const directory = await res.json();
console.log(directory.items);
```

### 2. Fetch a Single Page

```javascript
const res = await fetch(
  "https://YOUR-DOMAIN/api/v1/pages/luntaya-kyogyi-acheik-meaning-myanmar.json"
);
const page = await res.json();
```

Each page response includes `slug`, `lang`, `alternateSlug`, `title`, `summary`, `tags`, `category`, `contributors`, `sources`, `bodyHtml`, and `rawMarkdown`.

## Quick Start: Universal Widget

### Google Blogger & HTML Websites

Drop the script and mount container into any HTML page or Blogger template:

```html
<script src="https://YOUR-DOMAIN/sdk/dhalay-widget.min.js" defer></script>
<div
  data-dhalay-slug="luntaya-kyogyi-acheik-meaning-myanmar"
  data-dhalay-api="https://YOUR-DOMAIN/api/v1"
></div>
```

If `data-dhalay-slug` is omitted, the widget automatically resolves the slug from:
1. A URL path ending in `-myanmar` or `-english`
2. A query parameter (`?dhalay=luntaya-kyogyi-acheik-meaning-myanmar`)
3. A URL hash (`#/luntaya-kyogyi-acheik-meaning-myanmar`)
4. A searchable bilingual directory if no slug is present in the URL

### Astro

```javascript
export async function getStaticPaths() {
  const base = "https://YOUR-DOMAIN/api/v1";
  const index = await fetch(`${base}/index.json`).then((r) => r.json());

  return Promise.all(
    index.items.map(async (item) => {
      const page = await fetch(`${base}/pages/${item.slug}.json`).then((r) => r.json());
      return { params: { slug: item.slug }, props: { page } };
    })
  );
}
```

### Next.js (App Router)

```javascript
export async function generateStaticParams() {
  const index = await fetch("https://YOUR-DOMAIN/api/v1/index.json", {
    cache: "force-cache",
  }).then((r) => r.json());

  return index.items.map((item) => ({ slug: item.slug }));
}
```

## AI, RAG & NLP Corpus

Download the complete dataset in JSON Lines format:

```bash
curl -O https://YOUR-DOMAIN/api/v1/rag-corpus.jsonl
```

```python
import json
from urllib.request import urlopen

url = "https://YOUR-DOMAIN/api/v1/rag-corpus.jsonl"
with urlopen(url) as response:
    records = [json.loads(line) for line in response if line.strip()]

print(records[0]["slug"], records[0]["title"])
```

## Contributing Content

Add Markdown files under `content/<folder>/<file>.md` (for example, `content/ID_1-100/1.md`) using the standard bilingual template:

```markdown
---
contributors: ["dhalay-team"]
title_mm: "မြန်မာခေါင်းစဉ်"
title_en: "English Title"
slug: "your-base-slug"
category: "Myanmar Traditional Textiles"
tags_mm: ["တဂ်"]
tags_en: ["Tag"]
summary_mm: "မြန်မာအကျဉ်းချုပ်"
summary_en: "English summary"
sources:
  - "Author. (Year). Title. Publisher."
---

<div data-lang="my">

# မြန်မာခေါင်းစဉ်

မြန်မာဘာသာဖြင့် ရေးသားထားသော အကြောင်းအရာ။

</div>

<div data-lang="en">

# English Title

English content goes here.

</div>
```

- Keep `slug` unique and URL-safe without `-myanmar` or `-english` suffixes (the build script appends them automatically).
- Both `<div data-lang="my">` and `<div data-lang="en">` blocks are required.

## Local Build & Deployment

```bash
npm install
npm run build
```

All static endpoints and the SDK are generated in `dist/`. To deploy on **Cloudflare Pages**:
- **Framework preset:** `None`
- **Build command:** `npm run build`
- **Build output directory:** `dist`

## License

Content is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Code is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). An open-knowledge initiative by [DatarrX](https://datarrx.org/).