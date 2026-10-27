// scoring.js — Pure scoring algorithm. No DOM access, no side effects.
// All weights are gathered in one object at the top for easy tuning.

// ─────────────────────────────────────────────────────────────────────────────
// WEIGHTS — adjust these values to tune the algorithm behaviour.
// Each value represents the maximum points a country can earn in that category.
// Hard filters (continent, flightHours) can zero out the entire score.
// ─────────────────────────────────────────────────────────────────────────────
const WEIGHTS = {
  // Practical filters — these are the most decisive factors for a traveller.
  budget:        25,  // Over-budget countries are heavily penalised.
  temperature:   20,  // Temperature mismatch kills satisfaction quickly.
  continent:     20,  // Hard filter: wrong continent → score = 0.
  flightHours:   15,  // Hard filter: too far → score = 0.

  // Destination planning
  destination:   15,  // Type of destination (beach, city, etc.) match.
  stayDuration:  15,  // Penalises heavily if the trip is too short for the country.
  rain:          10,  // Rain tolerance matters a lot for beach/sun seekers.

  // Personal fit — Q14 interests have double contribution weight.
  interests:     20,  // What the user wants to experience (double-weighted in Q14).
  companion:      8,  // Family vs couple vs solo vs friends.
  pace:           8,  // Relaxed vs active rhythm.
  safety:         8,  // Safety requirements.
  travelStyle:    5,  // Single base vs multi-city vs road trip.
  popularity:     5,  // Tourist vs off-the-beaten-path preference.
};

// Sum of all weights = maximum possible raw score (used for normalisation).
const MAX_SCORE = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clamp a number between min and max.
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format a number as Portuguese currency: "1 400 €"
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Format a temperature: "26 °C"
 */
export function formatTemp(temp) {
  return `${Math.round(temp)} °C`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HARD FILTER — eliminates countries before any scoring begins.
// Returns true if the country passes all hard filters.
// ─────────────────────────────────────────────────────────────────────────────
function passesHardFilters(country, profile) {
  // Filter 1: Continent — if user said "tanto faz", skip this filter.
  if (!profile.continents.includes('tanto faz')) {
    if (!profile.continents.includes(country.continent)) {
      return false;
    }
  }

  // Filter 2: Flight duration — the user's maximum is an absolute limit.
  if (country.flightHours > profile.maxFlightHours) {
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING FUNCTIONS — one per category.
// Each function returns a raw score from 0 to its respective WEIGHT maximum.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Destination type: how well the country's landscape matches what the user wants.
 */
function scoreDestination(country, profile) {
  // country.destination has ratings 0-5 for each type.
  const typeScore = (country.destination[profile.destinationType] ?? 0) / 5;
  return typeScore * WEIGHTS.destination;
}

/**
 * Popularity preference: how well the country's tourist level matches
 * the user's preference (classico / equilibrado / escondido).
 */
function scorePopularity(country, profile) {
  const pop = country.popularity; // 0 = hidden, 5 = very touristy
  let match;

  if (profile.touristLevel === 'classico') {
    // User wants famous, popular places — reward high popularity.
    match = pop / 5;
  } else if (profile.touristLevel === 'equilibrado') {
    // User wants a balance — reward mid-range (2-4), penalise extremes.
    match = 1 - Math.abs(pop - 3) / 3;
  } else {
    // User wants off-the-beaten-path — reward low popularity.
    match = (5 - pop) / 5;
  }

  return clamp(match, 0, 1) * WEIGHTS.popularity;
}

/**
 * Temperature: how close the country's average temperature in the chosen season
 * is to the user's preferred temperature.
 * Uses a gaussian-like decay: perfect match = full points, >15 °C difference = 0.
 */
function scoreTemperature(country, profile) {
  const countryTemp = country.avgTemp[profile.season];
  const userTemp    = profile.tempPreference; // numeric midpoint of their band
  const diff = Math.abs(countryTemp - userTemp);

  let fraction;
  if (diff <= 3)       fraction = 1.0;   // Almost perfect
  else if (diff <= 6)  fraction = 0.75;
  else if (diff <= 10) fraction = 0.40;
  else if (diff <= 15) fraction = 0.15;
  else                 fraction = 0.0;   // Too different — no points

  return fraction * WEIGHTS.temperature;
}

/**
 * Rain tolerance: how well the country's rainfall in the chosen season
 * matches the user's tolerance.
 * country.rain[season] is 0 (very dry) to 5 (very rainy).
 */
function scoreRain(country, profile) {
  const rain = country.rain[profile.season]; // 0-5
  let fraction;

  if (profile.rainTolerance === 'sol') {
    // Wants guaranteed sun — strongly penalise rain.
    if (rain <= 1)      fraction = 1.0;
    else if (rain === 2) fraction = 0.5;
    else if (rain === 3) fraction = 0.2;
    else                fraction = 0.0;
  } else if (profile.rainTolerance === 'alguma') {
    // Accepts some rain — moderate penalty only for very rainy destinations.
    if (rain <= 3)      fraction = 1.0;
    else if (rain === 4) fraction = 0.6;
    else                fraction = 0.3;
  } else {
    // Doesn't mind rain — full points always.
    fraction = 1.0;
  }

  return fraction * WEIGHTS.rain;
}

/**
 * Budget: estimates total trip cost and compares with the user's budget.
 * estimatedCost = flight cost + (days × daily cost at chosen accommodation level).
 * Returns both the score and the estimated cost for display in results.
 */
function scoreBudget(country, profile) {
  const flightCost = country.flightCost;
  const dailyCost  = country.dailyCost[profile.accommodation];
  const estimated  = flightCost + profile.tripDays * dailyCost;
  const budget     = profile.budget;

  let fraction;
  if (estimated <= budget * 0.60) {
    // Well within budget — great value, slight bonus.
    fraction = 1.0;
  } else if (estimated <= budget * 0.85) {
    // Comfortably within budget.
    fraction = 0.90;
  } else if (estimated <= budget) {
    // Just within budget.
    fraction = 0.75;
  } else if (estimated <= budget * 1.20) {
    // Slightly over budget — significant penalty.
    fraction = 0.35;
  } else if (estimated <= budget * 1.50) {
    // Clearly over budget — heavy penalty.
    fraction = 0.10;
  } else {
    // Way over budget — near-zero score.
    fraction = 0.0;
  }

  return { score: fraction * WEIGHTS.budget, estimatedCost: estimated };
}

/**
 * Stay duration: how well the trip duration matches the country's ideal range.
 * Penalises heavily for trips that are too short (e.g., 3 days in Japan = terrible fit).
 * Applies moderate penalty for very long trips in compact destinations.
 */
function scoreStayDuration(country, profile) {
  const { min: idealMin, max: idealMax } = country.idealDays;
  const days = profile.tripDays;
  let fraction;

  if (days < idealMin) {
    // Trip too short for this country — penalise proportionally.
    // Example: Japan needs 8 days min; 3-day trip → 3/8 = 0.375
    fraction = (days / idealMin) * 0.7; // cap penalty so it's not always zero
  } else if (days > idealMax) {
    // Trip longer than ideal — mild penalty (the country might feel repetitive).
    const excess = days - idealMax;
    fraction = Math.max(0.5, 1 - excess * 0.04);
  } else {
    // Within the ideal range — full points.
    fraction = 1.0;
  }

  return clamp(fraction, 0, 1) * WEIGHTS.stayDuration;
}

/**
 * Travel style: prefers staying in one place vs multi-city vs road trip.
 * Matches against the country's range of ideal days as a proxy for complexity.
 * Wide range = suitable for road trips; narrow range = best as a single base.
 */
function scoreTravelStyle(country, profile) {
  const range = country.idealDays.max - country.idealDays.min;

  // Proxy: countries with a wide ideal range (≥10 days) suit multi-city/road trips.
  let fraction;
  if (profile.travelStyle === 'fixo') {
    // Prefers a single base — rewards compact countries (small range).
    fraction = range <= 5 ? 1.0 : range <= 10 ? 0.7 : 0.4;
  } else if (profile.travelStyle === 'dois-tres') {
    fraction = range >= 4 && range <= 14 ? 1.0 : 0.6;
  } else {
    // Road trip lover — rewards countries with lots of ground to cover.
    fraction = range >= 10 ? 1.0 : range >= 5 ? 0.7 : 0.4;
  }

  return fraction * WEIGHTS.travelStyle;
}

/**
 * Interests: sums the country's scores for the interests the user selected.
 * These are the user's Q14 choices — the most personally expressive answers.
 * Each selected interest contributes equally to the total.
 */
function scoreInterests(country, profile) {
  if (!profile.interests || profile.interests.length === 0) return 0;

  const total = profile.interests.reduce((sum, interest) => {
    return sum + (country.interests[interest] ?? 0);
  }, 0);

  // Normalise: max possible = 5 × number of interests selected.
  const maxPossible = 5 * profile.interests.length;
  return (total / maxPossible) * WEIGHTS.interests;
}

/**
 * Companion: how suitable the country is for the type of travel companion.
 * Uses the country's family, romantic, safety, and nightlife attributes.
 */
function scoreCompanion(country, profile) {
  let fraction;

  switch (profile.companion) {
    case 'familia':
      // Family needs safety + family-friendliness.
      fraction = (country.family * 0.6 + country.safety * 0.4) / 5;
      break;
    case 'casal':
      // Couples prioritise romance and safety.
      fraction = (country.romantic * 0.7 + country.safety * 0.3) / 5;
      break;
    case 'sozinho':
      // Solo travellers need safety above all.
      fraction = country.safety / 5;
      break;
    case 'amigos':
      // Groups of friends care about nightlife and activity.
      fraction = (country.interests.vidaNoturna * 0.5 + country.safety * 0.3 + country.interests.aventura * 0.2) / 5;
      break;
    default:
      fraction = 0.5;
  }

  return clamp(fraction, 0, 1) * WEIGHTS.companion;
}

/**
 * Pace: how well the country's rhythm matches the user's preferred pace.
 * country.relaxed is 0 (very active) to 5 (very laid-back).
 */
function scorePace(country, profile) {
  const relaxed = country.relaxed; // 0-5
  let fraction;

  if (profile.pace === 'relaxar') {
    // Wants to chill — rewards high relaxed score.
    fraction = relaxed / 5;
  } else if (profile.pace === 'equilibrado') {
    // Wants balance — rewards mid-range relaxed.
    fraction = 1 - Math.abs(relaxed - 2.5) / 2.5;
  } else {
    // Very active — rewards low relaxed score (busy, stimulating places).
    fraction = (5 - relaxed) / 5;
  }

  return clamp(fraction, 0, 1) * WEIGHTS.pace;
}

/**
 * Safety: matches the user's safety requirement against the country's safety score.
 * country.safety is 0 (very unsafe) to 5 (very safe).
 */
function scoreSafety(country, profile) {
  const safety = country.safety; // 0-5
  let fraction;

  if (profile.safetyNeed === 'maximo') {
    // Only very safe countries are acceptable.
    if (safety >= 5)      fraction = 1.0;
    else if (safety === 4) fraction = 0.6;
    else if (safety === 3) fraction = 0.2;
    else                  fraction = 0.0;
  } else if (profile.safetyNeed === 'bom') {
    // Good safety is expected.
    if (safety >= 4)      fraction = 1.0;
    else if (safety === 3) fraction = 0.7;
    else if (safety === 2) fraction = 0.3;
    else                  fraction = 0.0;
  } else {
    // Accepts some adventure — all countries get some points.
    fraction = Math.max(0.3, safety / 5);
  }

  return fraction * WEIGHTS.safety;
}

// ─────────────────────────────────────────────────────────────────────────────
// REASON GENERATION
// Produces 2-3 human-readable sentences explaining why this country fits.
// Takes the scoring breakdowns and picks the top contributors.
// ─────────────────────────────────────────────────────────────────────────────
function generateReasons(country, profile, breakdown) {
  const reasons = [];

  // Temperature reason — always feels concrete and useful.
  const countryTemp = country.avgTemp[profile.season];
  const seasonPT = { primavera: 'primavera', verão: 'verão', outono: 'outono', inverno: 'inverno' }[profile.season];
  reasons.push(
    `Em ${seasonPT}, a temperatura média é de ${formatTemp(countryTemp)} — ${Math.abs(countryTemp - profile.tempPreference) <= 5 ? 'exatamente o que procuras' : 'dentro da tua preferência'}.`
  );

  // Budget reason — most tangible piece of info for the traveller.
  const estimated = breakdown.estimatedCost;
  const daysLabel = profile.tripDays === 1 ? '1 dia' : `${profile.tripDays} dias`;
  if (estimated <= profile.budget) {
    reasons.push(
      `Cabe confortavelmente no teu orçamento: custo estimado de ${formatCurrency(estimated)} para ${daysLabel} (${profile.accommodation === 'economico' ? 'alojamento económico' : profile.accommodation === 'medio' ? 'hotel 3 estrelas' : profile.accommodation === 'confortavel' ? 'hotel 4 estrelas' : 'luxo'}).`
    );
  } else {
    reasons.push(
      `O custo estimado é de ${formatCurrency(estimated)} para ${daysLabel} — ligeiramente acima do teu orçamento, mas pode valer a pena.`
    );
  }

  // Interest-based reason — pick the top matching interest.
  if (profile.interests && profile.interests.length > 0) {
    const interestLabels = {
      cultura:     'cultura e história',
      gastronomia: 'gastronomia',
      aventura:    'aventura e desporto',
      vidaNoturna: 'vida noturna',
      natureza:    'natureza',
      compras:     'compras',
      bemEstar:    'bem-estar',
    };
    const topInterest = profile.interests
      .map(k => ({ key: k, score: country.interests[k] ?? 0 }))
      .sort((a, b) => b.score - a.score)[0];

    if (topInterest && topInterest.score >= 4) {
      reasons.push(
        `Excelente para ${interestLabels[topInterest.key]} — nota ${topInterest.score}/5 nesta categoria.`
      );
    }
  }

  // Companion-specific reason — only if score is high.
  if (breakdown.companionScore >= WEIGHTS.companion * 0.7) {
    const companionReasons = {
      familia: 'Muito adequado para famílias — seguro e com infraestrutura para todas as idades.',
      casal:   'Um dos destinos mais românticos — perfeito para uma viagem a dois.',
      sozinho: 'Seguro e fácil de navegar em solitário — ideal para viajantes independentes.',
      amigos:  'Ótimo para grupos — animação, atividades e opções para todos os gostos.',
    };
    if (companionReasons[profile.companion]) {
      reasons.push(companionReasons[profile.companion]);
    }
  }

  // Return at most 3 reasons (the most informative).
  return reasons.slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — rankCountries
// Takes a user profile and the full countries array.
// Returns all countries sorted by score desc, with reasons for the top results.
// ─────────────────────────────────────────────────────────────────────────────
export function rankCountries(userProfile, countries) {
  const results = countries.map((country, index) => {
    // Step 1: Hard filters — if a country fails, it gets score 0.
    if (!passesHardFilters(country, userProfile)) {
      return { country, score: 0, percentage: 0, reasons: [], estimatedCost: 0, index };
    }

    // Step 2: Calculate each category score.
    const budgetResult = scoreBudget(country, userProfile);

    const breakdown = {
      destinationScore:  scoreDestination(country, userProfile),
      popularityScore:   scorePopularity(country, userProfile),
      temperatureScore:  scoreTemperature(country, userProfile),
      rainScore:         scoreRain(country, userProfile),
      budgetScore:       budgetResult.score,
      stayScore:         scoreStayDuration(country, userProfile),
      styleScore:        scoreTravelStyle(country, userProfile),
      interestScore:     scoreInterests(country, userProfile),
      companionScore:    scoreCompanion(country, userProfile),
      paceScore:         scorePace(country, userProfile),
      safetyScore:       scoreSafety(country, userProfile),
      estimatedCost:     budgetResult.estimatedCost,
    };

    // Step 3: Sum all scores.
    const rawScore =
      breakdown.destinationScore +
      breakdown.popularityScore  +
      breakdown.temperatureScore +
      breakdown.rainScore        +
      breakdown.budgetScore      +
      breakdown.stayScore        +
      breakdown.styleScore       +
      breakdown.interestScore    +
      breakdown.companionScore   +
      breakdown.paceScore        +
      breakdown.safetyScore;

    // Step 4: Normalise to 0-100%.
    const percentage = Math.round(clamp((rawScore / MAX_SCORE) * 100, 0, 100));

    // Step 5: Generate human-readable reasons.
    const reasons = generateReasons(country, userProfile, breakdown);

    return { country, score: rawScore, percentage, reasons, estimatedCost: breakdown.estimatedCost, index };
  });

  // Sort by score descending; use original array index as stable tiebreaker
  // so the ranking never changes between renders.
  results.sort((a, b) => b.score - a.score || a.index - b.index);

  return results;
}
