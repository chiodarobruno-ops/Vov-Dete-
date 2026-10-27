# Para Onde Vou? 🌍

A minimalist travel-destination finder. Answer 15 questions about how you like to travel and get the **3 countries** that best match your answers, each with a compatibility score and the reasons behind it.

Everything runs in the browser: no backend, no database, no external APIs, and no AI. Recommendations come from a transparent, editable scoring system.

## Features

- 15-question quiz, one question per screen, with a progress bar and a back button
- Scoring algorithm that matches your profile against 30 countries
- Top 3 results with a compatibility percentage and "why it matches you" explanations
- Per-country details: highlights, best season, average daily cost, and flight time from Lisbon
- "Copy my results" and "Retake the quiz" actions
- Responsive, mobile-first, minimalist design
- Site language: European Portuguese

## Tech Stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- JavaScript and plain CSS
- No runtime dependencies beyond React

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm (included with Node.js)

### Installation

```bash
# Clone the repository
git clone <your-repository-url>
cd para-onde-vou

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open the local address shown in the terminal (usually `http://localhost:5173`).

### Production build

```bash
npm run build      # creates the optimized build in /dist
npm run preview    # previews the production build locally
```

## Project Structure

```
src/
├── components/
│   ├── Welcome.jsx        # Landing screen
│   ├── Question.jsx       # Single quiz question
│   ├── ProgressBar.jsx    # "Question 4 of 15" indicator
│   ├── Results.jsx        # Top 3 results screen
│   └── CountryCard.jsx    # Result card for one country
├── data/
│   ├── questions.js       # The 15 questions and their answer options
│   └── countries.js       # The 30 countries and their ratings
├── utils/
│   └── scoring.js         # Matching algorithm
├── App.jsx
├── main.jsx
└── styles/
```

## How It Works

1. Each answer adds points to a set of **traits** (beach, mountain, city, culture, food, adventure, nightlife, nature, safety, and more).
2. The answers are combined into a **user profile** with a 0 to 5 value per trait.
3. Every country has its own 0 to 5 rating for the same traits, plus cost, distance from Lisbon, and best seasons.
4. `scoring.js` measures how close the profile is to each country. Practical factors (budget, flight distance, climate, season) weigh more, and traits you rated 4 or 5 in importance weigh more too.
5. Countries that break a hard limit, such as a flight longer than you accept or a cost far above your budget, are heavily penalized.
6. The result is converted to a 0 to 100% compatibility score, and the top 3 are shown.

## Customization

| I want to... | Edit this file |
| --- | --- |
| Change question texts or answer options | `src/data/questions.js` |
| Add, remove, or adjust countries | `src/data/countries.js` |
| Change how much each factor matters | `src/utils/scoring.js` |
| Change colors, fonts, or spacing | `src/styles/` |

### Adding a country

Add a new object to `src/data/countries.js` with a rating from 0 to 5 for every trait:

```js
{
  name: "Portugal",
  flag: "🇵🇹",
  traits: { beach: 5, mountain: 2, city: 4, culture: 4, food: 5 /* ... */ },
  bestSeason: ["spring", "summer", "autumn"],
  description: "Short two-sentence description.",
  highlights: ["Highlight 1", "Highlight 2", "Highlight 3"],
  dailyCostEUR: 90,
  flightFromLisbon: "—"
}
```

The exact field names are defined in `countries.js`, so copy an existing entry as a template.

## Deployment

The site is fully static, so it can be hosted for free.

**Vercel**
1. Push the project to GitHub.
2. Import the repository on [vercel.com](https://vercel.com).
3. Use the default Vite settings and deploy.

**Netlify**
1. Push the project to GitHub.
2. Import the repository on [netlify.com](https://netlify.com).
3. Set the build command to `npm run build` and the publish directory to `dist`.

## Testing the Recommendations

A quick sanity check is to complete the quiz as three different profiles and confirm the results differ and make sense:

- A budget backpacker traveling alone
- A couple on a high-budget romantic trip
- A family with young children

## Roadmap Ideas

- Filter results by continent
- Share results on social media
- English version of the site
- Add more countries and finer-grained traits

## License

Add your license here (for example, MIT).
