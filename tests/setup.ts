import "@testing-library/jest-dom";

// Polyfills for browser APIs inside JSDOM environment
if (typeof window !== "undefined") {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = (_blob: Blob | MediaSource) => `blob:mock-object-url-${Math.random()}`;
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}
