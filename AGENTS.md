# AGENTS.md

Instructions for AI coding agents working on this project.

## Project Overview

**Para Onde Vou?** is a travel-destination quiz. The user answers 15 questions and the site shows the 3 countries that best match their answers. Recommendations come from a local scoring system (no AI, no backend, no external APIs).

- Site language: European Portuguese (pt-PT)
- Code, comments, and file names: English

## Language (strict)

The website must be **100% in European Portuguese (pt-PT)**. No English text may be visible to the user anywhere.

- All visible text: titles, questions, answer options, buttons, progress labels ("Pergunta 4 de 15"), result reasons, country descriptions and highlights, error messages, and the copied-results text
- Non-visible text that users or tools can see: `<title>`, meta description, `alt` text, `aria-label`s, placeholders, and tooltips
- `<html lang="pt-PT">`
- Use European Portuguese spelling and vocabulary, not Brazilian (for example "telemóvel", "autocarro", "pequeno-almoço", "equipa", "ecrã", "utilizador", "ficheiro"); address the user informally with "tu" (for example "Descobre o teu destino")
- Country names in Portuguese (Japão, Estados Unidos, Nova Zelândia, Emirados Árabes Unidos)
- Format numbers, currency, and durations the Portuguese way (for example `90 €`, `1,5 horas`, `1 000 €`), preferably with `Intl.NumberFormat("pt-PT")`
- Season names in Portuguese: primavera, verão, outono, inverno
- Code, comments, variable names, and file names stay in English

## Tech Stack (strict)

- Plain **HTML + CSS + JavaScript** only
- **No frameworks or libraries**: no React, Vue, Angular, jQuery, Tailwind, Bootstrap, etc.
- **No build step, no bundler, no npm dependencies**
- No backend, database, or external APIs
- Google Fonts is the only allowed external resource
- Do not use `localStorage` or `sessionStorage`; keep state in memory

If a task seems to need a framework or a package, find a plain-JS solution instead or ask first.

## Project Structure

```
/
├── index.html            # Single page, contains all screens
├── css/
│   └── styles.css        # All styles
├── js/
│   ├── app.js            # Entry point: screen flow and event handling
│   ├── questions.js      # The 15 questions and answer options (data only)
│   ├── countries.js      # The 30 countries and their ratings (data only)
│   └── scoring.js        # Matching algorithm (pure functions)
├── README.md
└── AGENTS.md
```

Keep this structure. Do not add folders or files unless needed.

## Running the Project

JavaScript files use ES modules (`<script type="module">`), which browsers block on `file://`. Use a local static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Any other static server also works (for example `npx serve`). There is nothing to install or build.

## Code Style

### HTML
- Semantic elements (`header`, `main`, `section`, `button`, `nav`)
- One `<section>` per screen (welcome, question, results); toggle visibility with a CSS class such as `hidden`
- Every interactive element must be a real `<button>` or `<a>`, never a clickable `<div>`
- Set `lang="pt-PT"` on `<html>` and include the viewport meta tag

### CSS
- One stylesheet, mobile-first (base styles for phones, `min-width` media queries for larger screens)
- Define colors, spacing, radius, and fonts as CSS variables on `:root`
- Use a BEM-like naming style (`.card`, `.card__title`, `.card--featured`)
- Design: modern and minimalist, lots of white space, a light background, one accent color, soft shadows, rounded corners, subtle transitions
- Respect `prefers-reduced-motion` for animations
- Keep contrast accessible (WCAG AA)

### JavaScript
- Modern vanilla JS: `const`/`let`, arrow functions, template literals, ES modules
- No global variables; use `import`/`export`
- Small, single-purpose functions with clear names
- `scoring.js` must contain **pure functions** (no DOM access) so it can be tested in the console
- All DOM access and event handling lives in `app.js`
- Build dynamic HTML with `createElement` or template literals and `textContent`; never insert untrusted strings with `innerHTML`
- Add short comments explaining *why*, especially in the scoring logic

## Data Rules

### `questions.js`
- Each question has: `id`, `text`, `type` (`single`, `multiple`, or `scale`), and `options`
- Each option declares the trait points it adds
- Texts must be editable without touching any other file

### `countries.js`
- Every country has a 0 to 5 rating for every trait (beach, mountain, city, rural, warm, cold, cost, distance, culture, food, adventure, nightlife, nature, safety, calm, lowMassTourism, family, romantic)
- Also include: `name`, `flag` emoji, `bestSeason`, `description` (2 sentences), `highlights` (3 items), `dailyCostEUR`, `flightFromLisbon`
- Do not leave any trait missing; the scoring depends on all of them
- Use realistic values

## Scoring Rules

- Build a user profile (0 to 5 per trait) from the answers
- Score each country by how close its ratings are to the profile
- Practical factors (budget, flight distance, climate, season) weigh more
- Traits the user rated 4 or 5 in importance weigh more
- Heavily penalize hard-limit violations (flight too long, cost far above budget)
- Output a 0 to 100% compatibility score; return the top 3
- Keep all weights in one clearly named object at the top of `scoring.js` so they are easy to tune
- Results must include 2 to 3 human-readable reasons per country, derived from the answers that contributed most

## Testing

There is no test framework. Verify changes manually:

1. Run the local server and complete the full quiz in the browser
2. Test at least three profiles and confirm the top 3 differ and make sense:
   - Budget backpacker, traveling alone
   - Couple on a high-budget romantic trip
   - Family with young children
3. Check the layout at 375px (phone) and 1280px (desktop) widths
4. Check the browser console: there must be **no errors or warnings**
5. Confirm keyboard navigation works through the whole quiz
6. Read every screen and confirm all visible text is in European Portuguese, with no English left over and no Brazilian spellings

## Do

- Keep changes small and focused on the task
- Reuse existing CSS variables and functions before adding new ones
- Keep the site working with no network connection (except fonts)
- Update `README.md` if you change the structure, commands, or features

## Don't

- Don't add frameworks, libraries, CDNs, or a build tool
- Don't add dependencies or a `package.json`
- Don't use `localStorage`/`sessionStorage`
- Don't hardcode text inside `app.js`; user-facing strings belong in the data files or `index.html`
- Don't rewrite files that aren't related to the task
- Don't remove accessibility features (focus styles, labels, semantic markup)

## Definition of Done

- The feature works in the latest Chrome, Firefox, and Safari
- It is responsive and accessible
- The console is clean
- All user-facing text is in European Portuguese (pt-PT)
- The code follows the style rules above
- Docs are updated if needed
