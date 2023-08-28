import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Polyfill for necessary global used by Monaco
document.queryCommandSupported = () => false;

afterEach(() => {
  cleanup();
});
