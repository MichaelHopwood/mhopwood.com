# Michael Hopwood — mhopwood.com

A static Astro portfolio and searchable library of 44 technical notebooks, deployed through Vercel from `master`. No Read the Docs, Sphinx, Python environment, database, or application server is required.

## Run and build

Use Node 24 and pnpm 11.25.0.

```sh
npx pnpm@11.25.0 install --frozen-lockfile
npm run dev
npm run build
npm run check
```

Production files are generated in `dist/`. `vercel.json` pins the install command, builds the site, verifies the output, and publishes `dist/`. The same static output works on other static hosts. The development command imports notes once on startup; restart it after changing a notebook or its metadata.

## Add notes

### Markdown

Create a `.md` file anywhere under `content/notes/`:

```markdown
---
title: A useful idea
slug: a-useful-idea
topic: Machine learning
summary: What the reader will learn.
status: note
featured: false
---

## Intuition

Write here. Inline math uses $x^2$; display math uses double dollars.

## Worked example

## References
```

`title`, `topic`, and `summary` are required. An explicit stable slug lets you move or rename the file without breaking links. Use `status: draft` for outlines; they are hidden from the default listing but remain publicly accessible through the draft toggle and direct links.

### Notebooks

1. Add a saved Jupyter notebook to `content/notebooks/`.
2. Add its filename and metadata to `content/notebooks.json`.
3. Build and check the site.

Notebooks are rendered without executing code. Markdown, equations, highlighted code, PNG outputs, HTML tables, and saved text output are supported. Interactive widgets are not re-executed. Every notebook remains available to download.

## Scalable organization

- Topic filters are generated from metadata.
- Full-text search covers titles, summaries, topics, and notebook text/code.
- Learning paths are ordered lists of slugs in `src/data/paths.ts`.
- Related notes come from the same topic.
- Section headings generate the table of contents.
- New notes automatically enter the library and search index on the next build.

Keep topics broad and use learning paths for teaching order. For thousands of long notes, the JSON search can be replaced with Pagefind without changing the note sources or page layout.

## Content provenance

The 44 notebooks, original figures, and legacy link mappings were imported from `MichaelHopwood/HopML` at commit `3f5b29f0771b66adf630d685222875aba052bb3f`. The notebook copies in this repository are now the source of truth for this website; future edits should be made here. The original HopML repository is unchanged.

A merge conflict in `Root finding.ipynb` involved only the execution count (3 versus 8). It was resolved to 3 without changing content or outputs. Legacy display-math delimiters are normalized when rendering. Five clear outlines/transcripts are marked as drafts. Original text, code, and citations are preserved; this migration is not a technical fact-check of every note.

The personal pages use the latest CV supplied in October 2026 and the existing portfolio. The CV lists an M.S. in Data Science & Statistics; the About page does not claim a completed PhD. The existing headshot is retained.

## Verification

`npm run check` verifies notebook-download fidelity, unique anchors, zero KaTeX parse errors, and all local links/assets across generated HTML pages. The notes library has also been browser-checked for search and learning-path filtering.

## Domain migration

The live domain previously redirected to `hopml.readthedocs.io` via Vercel. If this redirect remains after deployment, change the domain's Vercel configuration from a redirect to the production deployment. This redirect was not present in the old repository.

Legacy `/en/latest/` URLs on this domain are handled by generated redirect pages. Links on `hopml.readthedocs.io` itself require Read the Docs redirect settings; this repository cannot change another host's routing.

The old website remains recoverable in Git history at `f50c4343cee504a068a6705fb0d1613a8d552827`.
