// js/_typings.d.ts — global TypeScript declarations for the bug-simulator bundle.
//
// SCRIPT-mode TS files (the rest of js/) can't import/export, so any
// global helpers or DOM-API widenings have to live in a `.d.ts` file
// the compiler picks up automatically (per tsconfig.json's `include`).
//
// Loose-typed by design — same approach as vugg-simulator. Tighten
// per-module as the bundle stabilizes.

interface Document {
  getElementById(elementId: string): any;
  querySelector(selectors: string): any;
  querySelectorAll(selectors: string): any;
}

interface HTMLElement {
  [key: string]: any;
}

interface Event {
  [key: string]: any;
}

declare const THREE: any;
