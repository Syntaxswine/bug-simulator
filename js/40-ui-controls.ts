// ============================================================
// js/40-ui-controls.ts — play / step / reset wiring, status, tooltip,
//                          event log
// ============================================================
// Connects DOM elements declared in index.html to a singleton
// BugSimulator instance. The page boots into idle state (no sim
// running). The user clicks "START" to construct + run; "+1 day"
// to advance once; "▶ PLAY" to auto-tick at ~4 fps; "RESET" to
// rebuild from scratch.
//
// v0.3.0 additions:
//   • Mouse-hover on the canvas shows a floating tooltip with the
//     hovered cell's substrate, resources, and any agents / sessile
//     organisms present (per-stage breakdown for agents).
//   • A scrolling event log in the sidebar shows the most recent
//     N notable events (colonization, hatching, predation, deaths).
//
// SCRIPT-mode TS.

let _currentSim: any = null;
let _playInterval: any = null;
const _EVENT_LOG_MAX = 12; // most-recent N events shown in sidebar

// Play speed in days-per-second. Slider in index.html maps slider
// value -> this. 1x = 1 day/sec, 4x = 4 days/sec (default), 32x fast.
let _playSpeedDps = 4;
function _playIntervalMs(): number {
  return Math.max(20, Math.round(1000 / _playSpeedDps));
}

function _openNarratorModal(speciesId: string): void {
  const modal = document.getElementById("narrator-modal") as any;
  const titleEl = document.getElementById("narrator-title");
  const latinEl = document.getElementById("narrator-latin");
  const guildEl = document.getElementById("narrator-guild");
  const bodyEl = document.getElementById("narrator-body");
  const citeEl = document.getElementById("narrator-citations");
  if (!modal) return;
  const spec = SPECIES_SPEC?.[speciesId];
  if (titleEl) titleEl.textContent = spec?.common_name ?? speciesId;
  if (latinEl) latinEl.textContent = spec?.latin_name ?? "";
  if (guildEl) {
    const g = spec?.guild ?? "";
    const bodyMm = spec?.body_size_mm ?? "";
    const sz = bodyMm ? ` · ${bodyMm} mm` : "";
    guildEl.textContent = g ? `${g.replace(/_/g, " ")}${sz}` : sz;
  }
  if (bodyEl) {
    const prose = narrate(speciesId, _currentSim?.scenario || null);
    // Paragraphs in narrator output are separated by blank double
    // spaces in the joined text. Render line-wrap as <p> blocks.
    const paragraphs = prose.split(/\s+ |  +/).filter(p => p.trim());
    if (paragraphs.length > 1) {
      bodyEl.innerHTML = paragraphs.map(p => `<p>${p.trim()}</p>`).join("");
    } else {
      bodyEl.textContent = prose;
    }
  }
  if (citeEl) {
    const cites = spec?.citations ?? [];
    if (cites.length) {
      citeEl.innerHTML = "<strong>citations</strong> " + cites.join("; ");
    } else {
      citeEl.textContent = "";
    }
  }
  modal.classList.add("open");
}

function _closeNarratorModal(): void {
  const modal = document.getElementById("narrator-modal");
  if (modal) modal.classList.remove("open");
}

function _activeScenarioId(): string {
  const picker = document.getElementById("scenario-picker") as any;
  if (picker?.value) return picker.value;
  return "bialowieza_beech_log_y5";
}

function _populateScenarioPicker(): void {
  const picker = document.getElementById("scenario-picker") as any;
  if (!picker) return;
  const ids = Object.keys(SCENARIOS || {});
  if (ids.length === 0) return;
  if (picker.options.length === ids.length) return; // already populated
  const currentValue = picker.value;
  picker.innerHTML = ids.map(id => {
    const sc = SCENARIOS[id];
    const label = sc?.locality
      ? `${id.split('_').slice(0, 2).join(' ')} — ${sc.locality.split('—')[0].trim()}`
      : id;
    return `<option value="${id}">${label}</option>`;
  }).join("");
  if (currentValue && ids.includes(currentValue)) picker.value = currentValue;
  else picker.value = ids[0];
}

function _resetSim(opts: any = {}): void {
  _currentSim = new BugSimulator({
    scenario_id: opts.scenario_id ?? _activeScenarioId(),
    seed: opts.seed ?? 42,
  });
}

function _updateStatus(): void {
  const sim = _currentSim;
  const dayEl = document.getElementById("status-day");
  const agentEl = document.getElementById("status-agents");
  const sessileEl = document.getElementById("status-sessile");
  const speciesEl = document.getElementById("status-species");
  if (!sim) {
    if (dayEl) dayEl.textContent = "—";
    return;
  }
  if (dayEl) dayEl.textContent = String(sim.step);
  if (agentEl) agentEl.textContent = String(sim.agents.filter((a: any) => a.alive).length);
  if (sessileEl) sessileEl.textContent = String(sim.sessile.filter((s: any) => s.vigor > 0).length);
  if (speciesEl) {
    const last = sim.history[sim.history.length - 1];
    const by = last?.by_species || {};
    const eggs = last?.by_species_eggs || {};
    // Show adult count + parenthetical egg count when present. Now
    // unambiguous: "2 (+2 eggs)" means "2 adults plus 2 eggs in
    // incubation," not "4 total of which 2 are eggs."
    // Each species name is now clickable and opens its narrator.
    speciesEl.innerHTML = Object.keys(by)
      .sort()
      .map(k => {
        const eggCount = eggs[k] ?? 0;
        const eggsLabel = eggCount > 0 ? ` <span class="eggs">(+${eggCount} eggs)</span>` : '';
        const cn = SPECIES_SPEC?.[k]?.common_name || k.split("_").join(" ");
        return `<a class="sp-link sp-${k}" data-species="${k}" href="#"><span class="sp-${k}">${cn}: <strong>${by[k]}</strong></span>${eggsLabel}</a>`;
      })
      .join(" &middot; ");
    // Wire link clicks to the narrator modal.
    speciesEl.querySelectorAll("a.sp-link").forEach((el: any) => {
      el.addEventListener("click", (ev: any) => {
        ev.preventDefault();
        const sp = el.getAttribute("data-species");
        _openNarratorModal(sp);
      });
    });
  }
}

function _updateEventLog(): void {
  const sim = _currentSim;
  const el = document.getElementById("event-log");
  if (!el || !sim) return;
  const events = sim.events || [];
  const recent = events.slice(-_EVENT_LOG_MAX).reverse();
  el.innerHTML = recent.map((e: any) => _formatEvent(e)).join("");
}

function _formatEvent(e: any): string {
  const day = `<span class="ev-day">d${e.step}</span>`;
  const species = (s: string) => `<span class="sp-${s}">${s.split("_").join(" ")}</span>`;
  let body = '';
  switch (e.kind) {
    case "colonized":
      body = `${species(e.species)} arrived`;
      break;
    case "hatched":
      body = `${species(e.species)} hatched`;
      break;
    case "matured":
      body = `${species(e.species)} matured to ${e.stage_to}`;
      break;
    case "egg_laid":
      body = `${species(e.species)} laid an egg`;
      break;
    case "born":
      body = `${species(e.species)} born`;
      break;
    case "died":
      if (e.cause === "predation" && e.killer_species) {
        body = `${species(e.killer_species)} ate ${species(e.species)}`;
      } else {
        body = `${species(e.species)} died (${e.cause})`;
      }
      break;
    default:
      body = `${species(e.species)} ${e.kind}`;
  }
  return `<div class="ev"><span class="ev-meta">${day}</span> ${body}</div>`;
}

function _redraw(): void {
  const canvas = document.getElementById("niche-canvas") as any;
  if (canvas && _currentSim) renderNiche2D(_currentSim, canvas);
  const chart = document.getElementById("chart-canvas") as any;
  if (chart && _currentSim) renderPopulationChart(_currentSim, chart);
  const chartSummary = document.getElementById("chart-summary");
  if (chartSummary && _currentSim) {
    chartSummary.textContent = `day ${_currentSim.step} of ${_currentSim.duration_steps || "∞"}`;
  }
  const chartLegend = document.getElementById("chart-legend");
  if (chartLegend && _currentSim) {
    const seen = new Set<string>();
    for (const h of _currentSim.history) {
      for (const k of Object.keys(h.by_species || {})) seen.add(k);
    }
    const names = Array.from(seen).map(k => {
      const cn = SPECIES_SPEC?.[k]?.common_name || k.split('_')[0];
      return `<span class="sp-${k}">${cn}</span>`;
    });
    chartLegend.innerHTML = "Population vs time &mdash; " + (names.join(", ") || "(no species)");
  }
  _updateStatus();
  _updateEventLog();
  _renderTooltip();
}

function _stepOnce(): void {
  if (!_currentSim) return;
  _currentSim.run_step();
  _redraw();
  // Stop auto-play when scenario duration is reached.
  if (_currentSim.duration_steps > 0 && _currentSim.step >= _currentSim.duration_steps) {
    _stopPlay();
  }
}

function _startPlay(): void {
  if (_playInterval) return;
  _playInterval = setInterval(_stepOnce, _playIntervalMs());
  const btn = document.getElementById("btn-play");
  if (btn) btn.textContent = "PAUSE";
}

function _restartPlayAtCurrentSpeed(): void {
  // If already playing, swap to a new interval at the new speed.
  if (_playInterval) {
    clearInterval(_playInterval);
    _playInterval = setInterval(_stepOnce, _playIntervalMs());
  }
}

function _stopPlay(): void {
  if (_playInterval) clearInterval(_playInterval);
  _playInterval = null;
  const btn = document.getElementById("btn-play");
  if (btn) btn.textContent = "PLAY";
}

function _togglePlay(): void {
  if (_playInterval) _stopPlay();
  else _startPlay();
}

// ─── Tooltip ───────────────────────────────────────────────────────

let _hoverCellIdx: number | null = null;
let _hoverPagePos: { x: number; y: number } | null = null;

function _onCanvasMove(ev: MouseEvent): void {
  if (!_currentSim) return;
  const canvas = document.getElementById("niche-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  // Convert displayed-pixel coordinates back to canvas internal pixels.
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const px = (ev.clientX - rect.left) * scaleX;
  const py = (ev.clientY - rect.top)  * scaleY;
  _hoverCellIdx = pixelToCellIdx(_currentSim, canvas, px, py);
  _hoverPagePos = { x: ev.clientX, y: ev.clientY };
  _renderTooltip();
}

function _onCanvasLeave(): void {
  _hoverCellIdx = null;
  _hoverPagePos = null;
  _renderTooltip();
}

function _renderTooltip(): void {
  const tip = document.getElementById("cell-tooltip");
  if (!tip) return;
  if (_hoverCellIdx === null || !_currentSim || !_hoverPagePos) {
    tip.style.display = "none";
    return;
  }
  const info = describeCell(_currentSim, _hoverCellIdx);
  if (!info || info.substrate === "void") {
    tip.style.display = "none";
    return;
  }
  let html = `<div class="t-substrate">${info.substrate}</div>`;
  html += `<div class="t-row">moisture <strong>${info.moisture}</strong></div>`;
  if (info.wood_g > 0)   html += `<div class="t-row">wood <strong>${info.wood_g} g</strong></div>`;
  if (info.fungal_g > 0) html += `<div class="t-row">fungal <strong>${info.fungal_g} g</strong></div>`;
  if (info.litter_g > 0) html += `<div class="t-row">litter <strong>${info.litter_g} g</strong></div>`;
  html += `<div class="t-row">decay <strong>${info.decay}</strong></div>`;
  if (info.sessile.length) {
    html += `<div class="t-section">sessile</div>`;
    for (const s of info.sessile) {
      html += `<div class="t-row sp-${s.species}">${s.species.split("_").join(" ")} <strong>${s.size_cm}cm</strong></div>`;
    }
  }
  if (info.agents.length) {
    html += `<div class="t-section">agents</div>`;
    for (const a of info.agents) {
      const stageTag = a.stage !== "adult" ? ` <em>(${a.stage})</em>` : '';
      html += `<div class="t-row sp-${a.species}">${a.species.split("_").join(" ")}${stageTag} <strong>e:${a.energy}</strong></div>`;
    }
  }
  tip.innerHTML = html;
  tip.style.display = "block";
  // Position offset from cursor so it doesn't sit under it.
  const px = _hoverPagePos.x + 14;
  const py = _hoverPagePos.y + 14;
  tip.style.left = px + "px";
  tip.style.top  = py + "px";
}

function _bootBugSimulator(): void {
  const start = document.getElementById("btn-start");
  const step = document.getElementById("btn-step");
  const play = document.getElementById("btn-play");
  const reset = document.getElementById("btn-reset");
  const canvas = document.getElementById("niche-canvas") as HTMLCanvasElement | null;

  // The bundle's data fetches are async. Wait for SPECIES_SPEC to
  // populate before allowing START — otherwise the new BugSimulator
  // happens before species are loaded and the trophic graph is empty.
  // Also defer the scenario-picker population to this poll so the
  // dropdown gets populated once SCENARIOS is loaded.
  const tryBoot = () => {
    const hasSpec = Object.keys(SPECIES_SPEC || {}).length > 1;
    const hasScenario = SCENARIOS && Object.keys(SCENARIOS).length > 0;
    if (hasSpec && hasScenario) {
      _populateScenarioPicker();
      if (start) start.removeAttribute("disabled");
      if (step) step.removeAttribute("disabled");
      if (play) play.removeAttribute("disabled");
      if (reset) reset.removeAttribute("disabled");
    } else {
      setTimeout(tryBoot, 100);
    }
  };
  tryBoot();

  if (start) start.addEventListener("click", () => { _stopPlay(); _resetSim(); _redraw(); });
  if (step) step.addEventListener("click", () => { if (!_currentSim) _resetSim(); _stepOnce(); });
  if (play) play.addEventListener("click", () => { if (!_currentSim) _resetSim(); _togglePlay(); });
  if (reset) reset.addEventListener("click", () => { _stopPlay(); _resetSim(); _redraw(); });

  if (canvas) {
    canvas.addEventListener("mousemove", _onCanvasMove);
    canvas.addEventListener("mouseleave", _onCanvasLeave);
  }

  // Narrator modal close button + click-on-backdrop dismiss.
  const modalClose = document.getElementById("narrator-close");
  if (modalClose) modalClose.addEventListener("click", _closeNarratorModal);
  const modal = document.getElementById("narrator-modal");
  if (modal) {
    modal.addEventListener("click", (ev: any) => {
      // Close only when clicking the backdrop (not the inner card).
      if (ev.target === modal) _closeNarratorModal();
    });
  }
  document.addEventListener("keydown", (ev: any) => {
    if (ev.key === "Escape") _closeNarratorModal();
  });

  // Scenario picker change handler is wired immediately; population
  // happens in _populateScenarioPicker after SCENARIOS loads (see
  // tryBoot above).
  const picker = document.getElementById("scenario-picker") as any;
  if (picker) {
    picker.addEventListener("change", () => {
      _stopPlay();
      _resetSim({ scenario_id: picker.value });
      _redraw();
    });
  }

  // Speed slider — values are powers of two via index. The element
  // is an <input type="range"> with steps representing 1×/2×/4×/8×/16×/32×.
  const speed = document.getElementById("speed-slider") as any;
  const speedLabel = document.getElementById("speed-label");
  if (speed) {
    const updateSpeed = () => {
      const idx = parseInt(speed.value, 10);
      // idx in [0, 5] -> 2^idx days/sec
      _playSpeedDps = Math.pow(2, isFinite(idx) ? idx : 2);
      if (speedLabel) speedLabel.textContent = `${_playSpeedDps}× (${_playSpeedDps} days / sec)`;
      _restartPlayAtCurrentSpeed();
    };
    speed.addEventListener("input", updateSpeed);
    updateSpeed();
  }
}

// Boot once the DOM is ready. The bundle loads at the end of <body>,
// so document is already parsed — but the script runs synchronously,
// so we defer the wiring to next tick.
setTimeout(_bootBugSimulator, 0);
