// ============================================================
// js/35-chart.ts — population time-series chart
// ============================================================
// Reads BugSimulator.history (the per-step summary records) and
// renders four overlaid line series — one per species — to a small
// canvas-2D plot. Designed to look like an ecology-paper figure:
// monospace axis labels, thin lines, low-saturation colors, no
// chartjs / no D3. The data is in history[i].by_species (which the
// simulator's run_step records), so the chart is pure stateless
// rendering against current state.
//
// SCRIPT-mode TS.

const CHART_SPECIES_ORDER = [
  // cross-scenario
  "beauveria_bassiana",
  // rotting_log
  "trametes_versicolor",
  "ceratophysella_denticulata",
  "glomeris_marginata",
  "oniscus_asellus",
  "neobisium_muscorum",
  "lithobius_forficatus",
  // phytotelma
  "sarracenia_purpurea",
  "habrotrocha_rosa",
  "metriocnemus_knabi",
  "wyeomyia_smithii",
  // carrion
  "calliphora_vicina",
  "necrodes_littoralis",
  "dermestes_lardarius",
  // dung pile
  "aphodius_rufipes",
  "geotrupes_stercorarius",
  "saprinus_semistriatus",
  // meadow patch
  "mantis_religiosa",
  "pieris_brassicae",
  "apis_mellifera",
  "chorthippus_brunneus",
];

function _chartColor(species: string): string {
  const c = SPECIES_SPEC?.[species]?.color;
  if (c) return c;
  // Fallback per guild.
  const guild = SPECIES_SPEC?.[species]?.guild;
  if (guild === "predator") return "#d05028";
  if (guild === "fungivore") return "#e6e0c8";
  if (guild === "detritivore") return "#a08060";
  return "#c4d28e";
}

function renderPopulationChart(sim: any, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const padL = 36, padR = 12, padT = 10, padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Background.
  ctx.fillStyle = "#0a0a08";
  ctx.fillRect(0, 0, W, H);

  const hist = sim.history;
  if (!hist || hist.length === 0) {
    // Empty state — single dim label.
    ctx.fillStyle = "#4a4838";
    ctx.font = "10px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("press START to begin", W / 2, H / 2);
    return;
  }

  // Compute x-range and y-range.
  const xMax = Math.max(hist.length, sim.duration_steps || 120);
  let yMax = 1;
  for (const h of hist) {
    const by = h.by_species || {};
    for (const k of Object.keys(by)) yMax = Math.max(yMax, by[k] || 0);
  }
  // Round yMax up to a nice number.
  yMax = Math.max(5, Math.ceil(yMax / 5) * 5);

  // Axes.
  ctx.strokeStyle = "#2e2c25";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  // Axis ticks + labels.
  ctx.fillStyle = "#6e6a58";
  ctx.font = "9px ui-monospace, Consolas, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let t = 0; t <= 4; t++) {
    const v = Math.round((yMax * t) / 4);
    const y = padT + plotH - (plotH * t) / 4;
    ctx.fillText(String(v), padL - 4, y);
    ctx.strokeStyle = "#1a1812";
    if (t > 0) {
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
    }
  }
  // X-axis day ticks at quarters of xMax.
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let t = 0; t <= 4; t++) {
    const day = Math.round((xMax * t) / 4);
    const x = padL + (plotW * t) / 4;
    ctx.fillText(`d${day}`, x, padT + plotH + 4);
    if (t > 0 && t < 4) {
      ctx.strokeStyle = "#1a1812";
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
    }
  }

  // Lines, one per species (in declared order so colors stack legibly).
  for (const species of CHART_SPECIES_ORDER) {
    ctx.strokeStyle = _chartColor(species);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let first = true;
    for (let i = 0; i < hist.length; i++) {
      const h = hist[i];
      const v = (h.by_species && h.by_species[species]) || 0;
      const x = padL + (plotW * h.step) / xMax;
      const y = padT + plotH - (plotH * v) / yMax;
      if (first) { ctx.moveTo(x, y); first = false; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Current-day vertical marker so the user sees where "now" is.
  const lastStep = hist[hist.length - 1].step;
  const markerX = padL + (plotW * lastStep) / xMax;
  ctx.strokeStyle = "#b8a45844";
  ctx.beginPath();
  ctx.moveTo(markerX, padT);
  ctx.lineTo(markerX, padT + plotH);
  ctx.stroke();
}
