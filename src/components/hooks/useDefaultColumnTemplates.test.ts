import { act, renderHook } from "@testing-library/react";
import type { DefaultColumnTemplate } from "../../domain/schema";
import { useDefaultColumnTemplates } from "./useDefaultColumnTemplates";

const STORAGE_KEY = "ownsqldesigner:defaultColumnTemplates";

const idTemplate: DefaultColumnTemplate = {
  id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
  name: "id",
  type: "INTEGER",
  size: "",
  precision: "",
  defaultValue: "",
  nullable: false,
  autoIncrement: true,
  comment: "",
  keyMembership: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
};

describe("useDefaultColumnTemplates", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to empty settings when nothing is stored", () => {
    const { result } = renderHook(() => useDefaultColumnTemplates());

    expect(result.current.defaultColumnTemplates).toEqual({});
  });

  it("restores a previously stored value", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sqlite: [idTemplate] }));
    const { result } = renderHook(() => useDefaultColumnTemplates());

    expect(result.current.defaultColumnTemplates).toEqual({ sqlite: [idTemplate] });
  });

  it("falls back to empty settings when the stored value is not valid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not json");
    const { result } = renderHook(() => useDefaultColumnTemplates());

    expect(result.current.defaultColumnTemplates).toEqual({});
  });

  it("falls back to empty settings when the stored value fails schema validation", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sqlite: [{ id: idTemplate.id, name: "" }] }),
    );
    const { result } = renderHook(() => useDefaultColumnTemplates());

    expect(result.current.defaultColumnTemplates).toEqual({});
  });

  it("uses the initial override to seed state, ignoring storage", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    const { result } = renderHook(() => useDefaultColumnTemplates({ sqlite: [idTemplate] }));

    expect(result.current.defaultColumnTemplates).toEqual({ sqlite: [idTemplate] });
  });

  it("persists the value to storage on change", () => {
    const { result } = renderHook(() => useDefaultColumnTemplates());

    act(() => result.current.setDefaultColumnTemplates({ sqlite: [idTemplate] }));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      sqlite: [idTemplate],
    });
    expect(result.current.defaultColumnTemplates).toEqual({ sqlite: [idTemplate] });
  });
});
