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
const _PLAY_STEP_MS = 250;
const _EVENT_LOG_MAX = 12; // most-recent N events shown in sidebar

function _resetSim(opts: any = {}): void {
  _currentSim = new BugSimulator({
    scenario_id: opts.scenario_id ?? "bialowieza_beech_log_y5",
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
    // Show adult vs egg counts per species. Eggs are a meaningful
    // population-structure signal (active breeding vs steady).
    const eggCounts: Record<string, number> = {};
    for (const a of sim.agents) {
      if (a.alive && a.life_stage === "egg") {
        eggCounts[a.species] = (eggCounts[a.species] ?? 0) + 1;
      }
    }
    speciesEl.innerHTML = Object.keys(by)
      .sort()
      .map(k => {
        const eggs = eggCounts[k] ?? 0;
        const eggsLabel = eggs > 0 ? ` <span class="eggs">(+${eggs} eggs)</span>` : '';
        return `<span class="sp-${k}">${k.split("_").join(" ")}: <strong>${by[k]}</strong>${eggsLabel}</span>`;
      })
      .join(" &middot; ");
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
  if (!canvas || !_currentSim) return;
  renderNiche2D(_currentSim, canvas);
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
  _playInterval = setInterval(_stepOnce, _PLAY_STEP_MS);
  const btn = document.getElementById("btn-play");
  if (btn) btn.textContent = "PAUSE";
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
  const tryBoot = () => {
    const hasSpec = Object.keys(SPECIES_SPEC || {}).length > 1;
    const hasScenario = !!SCENARIOS?.["bialowieza_beech_log_y5"];
    if (hasSpec && hasScenario) {
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
}

// Boot once the DOM is ready. The bundle loads at the end of <body>,
// so document is already parsed — but the script runs synchronously,
// so we defer the wiring to next tick.
setTimeout(_bootBugSimulator, 0);
