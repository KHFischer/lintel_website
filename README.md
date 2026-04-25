# lintelstandard.com

Static marketing site for Lintel Standard, Inc. Served from this repository via GitHub Pages, custom domain `lintelstandard.com` (see `CNAME`).

## Stack

Static HTML, vanilla CSS, minimal vanilla JS. No framework. No build step beyond a small markdown→HTML conversion for articles (`scripts/build-articles.js`). Pages render with JavaScript disabled.

## Local development

From the repository root:

```bash
live-server
```

Or with the standard library:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy

GitHub Pages serves the repository root from `main`. Push to `main` to publish.

## Repository layout

```
.
├── CNAME                  # custom domain (lintelstandard.com)
├── index.html             # /
├── about/index.html       # /about
├── technology/index.html  # /technology
├── writing/index.html     # /writing
├── writing/<slug>/...     # individual articles
├── trust/index.html       # /trust  (noindex)
├── contact/index.html     # /contact
├── 404.html
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── css/
│   │   ├── colors_and_type.css   # design tokens — do not edit
│   │   └── site.css              # project styles
│   ├── articles/    # markdown sources for the articles
│   ├── diagrams/    # SVG diagrams
│   ├── fonts/inter/ # Inter variable font
│   ├── compressed/  # web-sized images
│   ├── full_size/   # large source images (not linked from pages)
│   ├── favicon/     # favicons + manifest
│   └── headshot/    # founder headshot
└── scripts/
    └── build-articles.js   # markdown → article HTML pages
```

The design system (`Lintel Standard Design System/`) and page specifications (`page_specs.md`, `positioning_identity.md`) live one directory up, outside this repo.
