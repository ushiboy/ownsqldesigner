import "@testing-library/jest-dom/vitest";
import { setProjectAnnotations } from "@storybook/react-vite";
import * as previewAnnotations from "../../.storybook/preview";

const annotations = setProjectAnnotations([previewAnnotations]);

beforeAll(annotations.beforeAll);

// jsdom does not implement the measurement APIs React Flow depends on.
class ResizeObserverMock {
  #callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }

  // React Flow reads dimensions off the entry two different ways depending
  // on the observer: per-node measurement reads `target.offsetWidth`/
  // `offsetHeight`, while the pane's extent cache reads `contentRect`.
  // Invoking the callback synchronously (jsdom never fires real resize
  // events) is what takes a node out of its initial `visibility: hidden`
  // state.
  observe(target: Element) {
    const entry: Partial<ResizeObserverEntry> = {
      target,
      contentRect: {
        width: 150,
        height: 40,
        top: 0,
        left: 0,
        right: 150,
        bottom: 40,
        x: 0,
        y: 0,
        toJSON() {
          return this;
        },
      },
    };
    // Real ResizeObserver callbacks fire asynchronously after layout; doing
    // the same here (rather than calling back synchronously) avoids a race
    // with React Flow's own mount effects that isn't present in a real
    // browser (e.g. the root container ref not being wired into the store
    // yet on the same tick a child node's observer fires).
    queueMicrotask(() =>
      this.#callback([entry as ResizeObserverEntry], this as unknown as ResizeObserver),
    );
  }

  unobserve() {}

  disconnect() {}
}

class DOMMatrixReadOnlyMock {
  m22: number;

  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([\d.]+)\)/)?.[1];
    this.m22 = scale === undefined ? 1 : +scale;
  }
}

globalThis.ResizeObserver ??= ResizeObserverMock as unknown as typeof ResizeObserver;
globalThis.DOMMatrixReadOnly ??= DOMMatrixReadOnlyMock as unknown as typeof DOMMatrixReadOnly;

// jsdom always reports 0 for offsetWidth/offsetHeight; React Flow treats a
// zero-size node as unmeasured and keeps it hidden.
Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  value: 150,
});
Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  value: 40,
});
