#!/usr/bin/env python3

import json
import math
import re
import sys
from collections import Counter
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
DEFAULT_OUTPUT_DIR = ROOT / "dist" / "api" / "v1"

sys.path.insert(0, str(SCRIPT_DIR))
from syllable_breaker import tokenize as syllable_tokenize


ENGLISH_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "in", "on", "to", "for",
    "is", "are", "was", "were", "with", "by", "from", "that", "this",
}
HEADING_RE = re.compile(r"^#{2,3}\s+(.+?)\s*$")
BURMESE_RE = re.compile(r"[\u1000-\u109f\uaa60-\uaa7f]")


def tokenize(text):
    tokens = []
    cursor = 0
    for match in re.finditer(r"[A-Za-z0-9]+|[^\x00-\x7f]+", text):
        english_part = match.group(0)
        if english_part.isascii():
            lower = english_part.lower()
            if lower not in ENGLISH_STOPWORDS:
                tokens.append(lower)
        else:
            segment = "".join(
                char for char in english_part
                if BURMESE_RE.match(char) or char.isspace()
            )
            syllables = [
                syl.strip() for syl in syllable_tokenize(segment)
                if syl.strip() and BURMESE_RE.search(syl)
            ]
            tokens.extend(syllables)
            tokens.extend(
                f"{syllables[i]}_{syllables[i + 1]}"
                for i in range(len(syllables) - 1)
            )
    return tokens


def split_heading_chunks(markdown, slug):
    lines = markdown.strip().splitlines()
    chunks = []
    preamble = []
    heading = ""
    chunk_lines = []

    for line in lines:
        match = HEADING_RE.match(line)
        if match:
            if preamble:
                text = "\n".join(preamble).strip()
                if text:
                    chunks.append({"heading": "", "text": text})
                preamble = []
            if chunk_lines:
                chunks.append({"heading": heading, "text": "\n".join(chunk_lines).strip()})
            heading = match.group(1).strip()
            chunk_lines = [line]
            continue

        if chunk_lines:
            chunk_lines.append(line)
        else:
            preamble.append(line)

    if chunk_lines:
        chunks.append({"heading": heading, "text": "\n".join(chunk_lines).strip()})
    elif preamble:
        text = "\n".join(preamble).strip()
        if text:
            chunks.append({"heading": "", "text": text})

    if not chunks:
        chunks.append({"heading": "", "text": markdown.strip()})

    return chunks


def build_chunks(output_dir):
    chunks = []
    for page_path in sorted((output_dir / "pages").glob("*.json")):
        with page_path.open("r", encoding="utf-8") as handle:
            page = json.load(handle)

        split_chunks = split_heading_chunks(page["rawMarkdown"]["primary"], page["slug"])
        for index, split_chunk in enumerate(split_chunks):
            chunks.append({
                "id": f"{page['slug']}#c{index}",
                "slug": page["slug"],
                "baseSlug": page["baseSlug"],
                "lang": page["lang"],
                "title": page["title"],
                "heading": split_chunk["heading"],
                "category": page["category"],
                "sources": page["sources"],
                "text": split_chunk["text"],
            })
    return chunks


def build_index(chunks):
    k1 = 1.5
    b = 0.75
    document_terms = []
    document_frequency = Counter()

    for chunk in chunks:
        tf = Counter(tokenize(chunk["text"]))
        document_terms.append(tf)
        document_frequency.update(tf.keys())

    total_docs = len(document_terms)
    avgdl = (
        sum(sum(tf.values()) for tf in document_terms) / total_docs
        if total_docs
        else 0.0
    )

    idf = {}
    for term, frequency in document_frequency.items():
        idf[term] = math.log1p((total_docs - frequency + 0.5) / (frequency + 0.5))

    docs = []
    for chunk, tf in zip(chunks, document_terms):
        docs.append({
            "id": chunk["id"],
            "len": sum(tf.values()),
            "tf": dict(sorted(tf.items())),
        })

    return {
        "k1": k1,
        "b": b,
        "totalDocs": total_docs,
        "avgdl": avgdl,
        "idf": dict(sorted(idf.items())),
        "docs": docs,
        "chunks": chunks,
    }


def main():
    output_dir = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_OUTPUT_DIR
    chunks = build_chunks(output_dir)
    index = build_index(chunks)

    chunks_path = output_dir / "rag-chunks.json"
    index_path = output_dir / "rag-bm25.json"
    chunks_path.write_text(json.dumps(chunks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Built {len(chunks)} RAG chunks and BM25 index.")


if __name__ == "__main__":
    main()
