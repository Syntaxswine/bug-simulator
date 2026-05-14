// ============================================================
// js/40-ui-controls.ts — play / step / reset wiring + status panel
// ============================================================
// Connects DOM elements declared in index.html to a singleton
// BugSimulator instance. The page boots into idle state (no sim
// running). The user clicks "START" to construct + run; "+1 day"
// to advance once; "▶ PLAY" to auto-tick at ~5 fps; "RESET" to
// rebuild from scratch.
//
// SCRIPT-mode TS.

let _currentSim: any = null;
let _playInterval: any = null;
const _PLAY_STEP_MS = 250;

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
    speciesEl.innerHTML = Object.keys(by)
      .sort()
      .map(k => `<span class="sp-${k}">${k.split("_").join(" ")}: <strong>${by[k]}</strong></span>`)
      .join(" &middot; ");
  }
}

function _redraw(): void {
  const canvas = document.getElementById("niche-canvas") as any;
  if (!canvas || !_currentSim) return;
  renderNiche2D(_currentSim, canvas);
  _updateStatus();
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

function _bootBugSimulator(): void {
  const start = document.getElementById("btn-start");
  const step = document.getElementById("btn-step");
  const play = document.getElementById("btn-play");
  const reset = document.getElementById("btn-reset");

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
}

// Boot once the DOM is ready. The bundle loads at the end of <body>,
// so document is already parsed — but the script runs synchronously,
// so we defer the wiring to next tick.
setTimeout(_bootBugSimulator, 0);
