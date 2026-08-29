import { fn } from "storybook/test";

// jsdom does not implement the Clipboard API.
export function mockClipboard() {
  const writeText = fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

// jsdom does not implement the Blob URL APIs.
export function mockObjectUrl() {
  const createObjectURL = vi.fn<(obj: Blob) => string>().mockReturnValue("blob:mock-url");
  const revokeObjectURL = vi.fn<(url: string) => void>();
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
  return { createObjectURL, revokeObjectURL };
}
