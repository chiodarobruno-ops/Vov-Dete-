// app.js — Screen flow, event handling, and DOM rendering.
// Imports data and algorithm; all user state lives in memory (no storage).
import { QUESTIONS } from './questions.js';
import { COUNTRIES }  from './countries.js';
import { rankCountries, formatCurrency, formatTemp } from './scoring.js';

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION STATE — lives only in memory, reset on page refresh or restart.
// ─────────────────────────────────────────────────────────────────────────────
let currentQuestionIndex = 0;
const userAnswers = {}; // keyed by question.key (e.g., { destinationType: 'praia', ... })

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  // Scroll to top whenever we switch screens.
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ RENDERING
// ─────────────────────────────────────────────────────────────────────────────

/** Updates the sticky progress header. */
function updateProgressHeader() {
  const q = QUESTIONS[currentQuestionIndex];
  const total = QUESTIONS.length;
  const current = currentQuestionIndex + 1;
  const pct = Math.round((current / total) * 100);

  document.getElementById('quiz-block-label').textContent = `${q.blockIcon} ${q.block}`;
  document.getElementById('quiz-counter').textContent     = `Pergunta ${current} de ${total}`;
  document.getElementById('progress-fill').style.width   = `${pct}%`;
  document.getElementById('progress-fill').setAttribute('aria-valuenow', pct);
}

/** Renders a single question into the quiz body. */
function renderQuestion(index) {
  currentQuestionIndex = index;
  updateProgressHeader();

  const q = QUESTIONS[index];
  const area = document.getElementById('quiz-question-area');

  // Trigger re-animation by forcing a reflow.
  area.style.animation = 'none';
  void area.offsetHeight;
  area.style.animation = '';

  // Build the question markup.
  const isMultiple = q.type === 'multiple';
  const savedAnswer = userAnswers[q.key];

  // Choose options container class.
  const optionsClass = isMultiple && q.options.length > 3
    ? 'options-grid'
    : 'quiz-options';

  const optionsHTML = q.options.map(opt => {
    const isSelected = isMultiple
      ? (Array.isArray(savedAnswer) && savedAnswer.includes(opt.value))
      : (savedAnswer === opt.value);

    // Extract the first emoji from the label string (if present).
    const labelParts = opt.label.match(/^(\S+)\s*(.*)/);
    const emoji = labelParts ? labelParts[1] : '';
    const text  = labelParts ? labelParts[2] : opt.label;

    const descHTML = opt.desc
      ? `<span class="option-desc">${opt.desc}</span>`
      : '';

    return `
      <button
        class="option-btn${isSelected ? ' selected' : ''}"
        data-value="${escapeAttr(String(opt.value))}"
        aria-pressed="${isSelected}"
        id="opt-${q.id}-${escapeAttr(String(opt.value))}"
        type="button"
      >
        <span class="option-emoji" aria-hidden="true">${emoji}</span>
        <span class="option-text">
          <span class="option-label">${text}</span>
          ${descHTML}
        </span>
        <span class="option-check" aria-hidden="true"></span>
      </button>
    `;
  }).join('');

  const hintHTML = isMultiple
    ? `<p class="quiz-multiple-hint">${q.maxChoices ? `Escolhe até ${q.maxChoices} opções` : 'Podes escolher várias opções'}</p>`
    : '';

  area.innerHTML = `
    <p class="quiz-question-text">${q.text}</p>
    ${hintHTML}
    <div class="${optionsClass}" role="group" aria-label="Opções de resposta">
      ${optionsHTML}
    </div>
  `;

  // Show/hide footer buttons.
  const backBtn = document.getElementById('btn-back');
  backBtn.style.visibility = index > 0 ? 'visible' : 'hidden';

  // For single-choice: no Continue button needed.
  // For multiple-choice: show Continue button (enabled only when ≥1 option selected).
  renderFooterActions(q, savedAnswer);

  // Attach option click handlers.
  area.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => handleOptionClick(btn, q));
  });
}

/** Renders the footer action buttons based on question type. */
function renderFooterActions(q, savedAnswer) {
  const actionsEl = document.getElementById('quiz-footer-actions');
  actionsEl.innerHTML = '';

  if (q.type === 'multiple') {
    const hasSelection = Array.isArray(savedAnswer) && savedAnswer.length > 0;
    const btn = document.createElement('button');
    btn.id = 'btn-continue';
    btn.className = 'btn btn-primary';
    btn.textContent = 'Continuar →';
    btn.disabled = !hasSelection;
    btn.setAttribute('aria-label', 'Continuar para a próxima pergunta');
    btn.addEventListener('click', () => advanceQuestion());
    actionsEl.appendChild(btn);
  }
  // For single-choice, advancing happens automatically on option click.
}

/** Handles clicking a quiz option. */
function handleOptionClick(btn, q) {
  const value = parseOptionValue(btn.dataset.value);

  if (q.type === 'single') {
    // Save answer and advance immediately.
    userAnswers[q.key] = value;
    advanceQuestion();
  } else {
    // Multiple choice — toggle selection.
    if (!Array.isArray(userAnswers[q.key])) {
      userAnswers[q.key] = [];
    }

    const arr = userAnswers[q.key];
    const pos = arr.indexOf(value);

    if (pos === -1) {
      // Add — but respect maxChoices limit.
      if (q.maxChoices && arr.length >= q.maxChoices) {
        // Remove the oldest selection to stay within limit.
        const oldest = arr.shift();
        const oldBtn = document.querySelector(
          `.option-btn[data-value="${escapeAttr(String(oldest))}"]`
        );
        if (oldBtn) {
          oldBtn.classList.remove('selected');
          oldBtn.setAttribute('aria-pressed', 'false');
        }
      }
      arr.push(value);
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      // Remove.
      arr.splice(pos, 1);
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
    }

    // Update Continue button state.
    const continueBtn = document.getElementById('btn-continue');
    if (continueBtn) continueBtn.disabled = arr.length === 0;
  }
}

/** Moves to the next question, or shows results if done. */
function advanceQuestion() {
  if (currentQuestionIndex < QUESTIONS.length - 1) {
    renderQuestion(currentQuestionIndex + 1);
  } else {
    // All questions answered — compute and show results.
    showResults();
  }
}

/** Parses a data-value attribute back to the original type (number or string). */
function parseOptionValue(raw) {
  const num = Number(raw);
  return isNaN(num) ? raw : num;
}

/** Escapes special characters for use in HTML attributes. */
function escapeAttr(str) {
  return str.replace(/[&"<>]/g, c => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]));
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD USER PROFILE from raw userAnswers
// Converts the answer keys into numeric values the algorithm expects.
// ─────────────────────────────────────────────────────────────────────────────
function buildUserProfile() {
  return {
    destinationType: userAnswers.destinationType,
    touristLevel:    userAnswers.touristLevel,
    continents:      userAnswers.continents   ?? ['tanto faz'],
    maxFlightHours:  userAnswers.maxFlightHours ?? 99,
    tempPreference:  userAnswers.tempPreference ?? 22,
    season:          userAnswers.season        ?? 'verão',
    rainTolerance:   userAnswers.rainTolerance ?? 'alguma',
    tripDays:        userAnswers.tripDays      ?? 7,
    travelStyle:     userAnswers.travelStyle   ?? 'dois-tres',
    budget:          userAnswers.budget        ?? 1500,
    accommodation:   userAnswers.accommodation ?? 'medio',
    companion:       userAnswers.companion     ?? 'casal',
    pace:            userAnswers.pace          ?? 'equilibrado',
    interests:       userAnswers.interests     ?? [],
    safetyNeed:      userAnswers.safetyNeed    ?? 'bom',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS RENDERING
// ─────────────────────────────────────────────────────────────────────────────
function showResults() {
  showScreen('screen-loading');

  // Small delay for the loading animation to feel intentional.
  setTimeout(() => {
    const profile = buildUserProfile();
    const ranked  = rankCountries(profile, COUNTRIES);
    const top3    = ranked.slice(0, 3);

    const container = document.getElementById('results-container');
    container.innerHTML = '';

    const rankLabels  = ['1.º lugar', '2.º lugar', '3.º lugar'];
    const rankClasses = ['gold', 'silver', 'bronze'];
    const rankEmojis  = ['🥇', '🥈', '🥉'];

    top3.forEach((result, i) => {
      const { country, percentage, reasons, estimatedCost } = result;
      const season = profile.season;
      const temp   = country.avgTemp[season];
      const seasonLabel = { primavera: 'primavera', verão: 'verão', outono: 'outono', inverno: 'inverno' }[season];

      const card = document.createElement('article');
      card.className = 'result-card';
      card.setAttribute('aria-label', `${rankLabels[i]}: ${country.name}`);

      const reasonsHTML = reasons.map(r => `
        <li class="card-reason">
          <span class="card-reason-icon" aria-hidden="true">✦</span>
          <span>${r}</span>
        </li>
      `).join('');

      const highlightsHTML = country.highlights.map(h =>
        `<span class="card-highlight">${h}</span>`
      ).join('');

      // Estimate daily cost label
      const accommodationLabels = {
        economico:   'Alojamento económico',
        medio:       'Hotel 3 estrelas',
        confortavel: 'Hotel 4 estrelas',
        luxo:        'Hotel de luxo',
      };
      const accomLabel = accommodationLabels[profile.accommodation] ?? 'Alojamento';

      card.innerHTML = `
        <div class="card-hero">
          <div class="card-hero-flag-bg" aria-hidden="true">${country.flag}</div>

          <div class="card-rank-badge ${rankClasses[i]}">
            <span aria-hidden="true">${rankEmojis[i]}</span>
            ${rankLabels[i]}
          </div>

          <div class="card-country-row">
            <span class="card-flag" role="img" aria-label="Bandeira de ${country.name}">${country.flag}</span>
            <h2 class="card-country-name">${country.name}</h2>
          </div>

          <div class="card-compat-row">
            <span class="card-compat-label">Compatibilidade</span>
            <div class="card-compat-bar" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100" aria-label="${percentage}% compatível">
              <div class="card-compat-bar-fill" data-pct="${percentage}"></div>
            </div>
            <span class="card-compat-pct">${percentage}%</span>
          </div>
        </div>

        <div class="card-body">

          <div class="card-section">
            <p class="card-section-title">Porque combina contigo</p>
            <ul class="card-reasons">
              ${reasonsHTML}
            </ul>
          </div>

          <div class="card-section">
            <p class="card-section-title">Resumo prático</p>
            <div class="card-summary-grid">
              <div class="card-summary-item">
                <span class="card-summary-item-label">Temperatura</span>
                <span class="card-summary-item-value">${formatTemp(temp)} em ${seasonLabel}</span>
              </div>
              <div class="card-summary-item">
                <span class="card-summary-item-label">Custo estimado</span>
                <span class="card-summary-item-value">${formatCurrency(estimatedCost)}</span>
              </div>
              <div class="card-summary-item">
                <span class="card-summary-item-label">Voo de Lisboa</span>
                <span class="card-summary-item-value">${country.flightHours < 1 ? 'Menos de 1 hora' : country.flightHours === 1 ? '1 hora' : `${country.flightHours} horas`}</span>
              </div>
              <div class="card-summary-item">
                <span class="card-summary-item-label">Duração ideal</span>
                <span class="card-summary-item-value">${country.idealDays.min}–${country.idealDays.max} dias</span>
              </div>
            </div>
          </div>

          <div class="card-section">
            <p class="card-section-title">Sobre o destino</p>
            <p class="card-description">${country.description}</p>
            <div class="card-highlights">
              ${highlightsHTML}
            </div>
          </div>

        </div>
      `;

      container.appendChild(card);
    });

    showScreen('screen-results');

    // Animate compatibility bars after the screen is visible.
    requestAnimationFrame(() => {
      document.querySelectorAll('.card-compat-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.pct + '%';
      });
    });

    // Store results text for clipboard copy.
    window._resultsText = buildResultsText(top3, profile);
  }, 1200);
}

/** Builds a plain-text summary of results for clipboard sharing. */
function buildResultsText(top3, profile) {
  const lines = ['🌍 Para Onde Vou? — Os meus resultados\n'];
  top3.forEach((r, i) => {
    const rank = ['1.º', '2.º', '3.º'][i];
    lines.push(`${rank} ${r.country.flag} ${r.country.name} — ${r.percentage}% de compatibilidade`);
    r.reasons.forEach(reason => lines.push(`  • ${reason}`));
    lines.push('');
  });
  lines.push('Descobre o teu destino em: Para Onde Vou?');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIPBOARD COPY
// ─────────────────────────────────────────────────────────────────────────────
async function copyResults() {
  const text = window._resultsText;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showCopyFeedback('✓ Resultados copiados!');
  } catch {
    // Fallback for browsers without clipboard API.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showCopyFeedback('✓ Resultados copiados!');
  }
}

function showCopyFeedback(message) {
  const el = document.getElementById('copy-feedback');
  el.textContent = message;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESTART
// ─────────────────────────────────────────────────────────────────────────────
function restartQuiz() {
  // Clear all state.
  currentQuestionIndex = 0;
  Object.keys(userAnswers).forEach(k => delete userAnswers[k]);
  window._resultsText = null;

  // Reset to intro screen.
  showScreen('screen-intro');
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALISATION — runs once on DOMContentLoaded.
// ─────────────────────────────────────────────────────────────────────────────
function init() {
  // ── Intro screen ──────────────────────────────────────────
  document.getElementById('btn-start').addEventListener('click', () => {
    showScreen('screen-quiz');
    renderQuestion(0);
  });

  // ── Quiz: Back button ──────────────────────────────────────
  document.getElementById('btn-back').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      renderQuestion(currentQuestionIndex - 1);
    }
  });

  // ── Results: Restart button ────────────────────────────────
  document.getElementById('btn-restart').addEventListener('click', restartQuiz);

  // ── Results: Copy button ───────────────────────────────────
  document.getElementById('btn-copy').addEventListener('click', copyResults);

  // ── Show the intro screen to start ────────────────────────
  showScreen('screen-intro');
}

document.addEventListener('DOMContentLoaded', init);
