import { act, renderHook, waitFor } from "@testing-library/react";
import { createSchema } from "../../domain/schema";
import { createFakeSchemaRepository } from "../../test/fakeSchemaRepository";
import { useSchemaWorkspace } from "./useSchemaWorkspace";

describe("useSchemaWorkspace", () => {
  it("restores the last-edited schema on startup", async () => {
    const schema = createSchema("Blog Schema");
    const repository = createFakeSchemaRepository({
      schemas: [schema],
      lastSchemaId: schema.id,
    });

    const { result } = renderHook(() => useSchemaWorkspace(repository));

    await waitFor(() => {
      expect(result.current.currentSchema).toEqual(schema);
    });
  });

  it("auto-creates and persists a blank default schema on first visit", async () => {
    const repository = createFakeSchemaRepository();

    const { result } = renderHook(() => useSchemaWorkspace(repository));

    await waitFor(() => {
      expect(result.current.currentSchema?.name).toBe("New Schema");
    });
    const created = result.current.currentSchema;
    await waitFor(async () => {
      expect(await repository.loadLastSchemaId()).toBe(created?.id);
    });
    expect(await repository.load(created?.id ?? "")).toEqual(created);
    expect(created?.tables).toEqual([]);
  });

  it("auto-creates a blank schema when the last-edited pointer dangles", async () => {
    const repository = createFakeSchemaRepository({ lastSchemaId: "dangling-id" });

    const { result } = renderHook(() => useSchemaWorkspace(repository));

    await waitFor(() => {
      expect(result.current.currentSchema?.name).toBe("New Schema");
    });
    expect(result.current.currentSchema?.id).not.toBe("dangling-id");
  });

  it("lists saved schemas sorted by name", async () => {
    const orders = createSchema("Orders");
    const accounts = createSchema("Accounts");
    const repository = createFakeSchemaRepository({
      schemas: [orders, accounts],
      lastSchemaId: orders.id,
    });

    const { result } = renderHook(() => useSchemaWorkspace(repository));

    await waitFor(() => {
      expect(result.current.savedSchemas.map((summary) => summary.name)).toEqual([
        "Accounts",
        "Orders",
      ]);
    });
  });

  it("creates, persists, and switches to a new schema via createSchema", async () => {
    const existing = createSchema("Blog Schema");
    const repository = createFakeSchemaRepository({
      schemas: [existing],
      lastSchemaId: existing.id,
    });
    const { result } = renderHook(() => useSchemaWorkspace(repository));
    await waitFor(() => {
      expect(result.current.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.createSchema("Orders");
    });

    await waitFor(() => {
      expect(result.current.savedSchemas.map((summary) => summary.name)).toEqual([
        "Blog Schema",
        "Orders",
      ]);
    });
    expect(result.current.currentSchema?.name).toBe("Orders");
    expect(await repository.loadLastSchemaId()).toBe(result.current.currentSchema?.id);
  });
});
