import { renderHook } from "@testing-library/react";
import { saveAs } from "file-saver";
import { createSchema, type Schema } from "../../../domain/schema";
import { LocaleProvider } from "../../../i18n/LocaleProvider";
import { createFakeSchemaRepository } from "../../../test/fakeSchemaRepository";
import { NotificationProvider } from "../NotificationContext";
import { SchemaWorkspaceProvider } from "../SchemaWorkspaceContext";
import { useDownloadSchemaFile } from "./useDownloadSchemaFile";

vi.mock("file-saver", () => ({
  saveAs: vi.fn<(data: Blob | string, filename?: string) => void>(),
}));

function renderDownloadHook(initialSchema?: Schema) {
  const repository = createFakeSchemaRepository(
    initialSchema ? { schemas: [initialSchema], lastSchemaId: initialSchema.id } : {},
  );
  return renderHook(() => useDownloadSchemaFile(), {
    wrapper: ({ children }) => (
      <LocaleProvider>
        <NotificationProvider>
          <SchemaWorkspaceProvider repository={repository} initialSchema={initialSchema}>
            {children}
          </SchemaWorkspaceProvider>
        </NotificationProvider>
      </LocaleProvider>
    ),
  });
}

describe("useDownloadSchemaFile", () => {
  beforeEach(() => {
    vi.mocked(saveAs).mockClear();
  });

  it("reports canDownload as false before a schema has loaded", () => {
    const { result } = renderDownloadHook();

    expect(result.current.canDownload).toBe(false);
  });

  it("does nothing when there is no current schema", () => {
    const { result } = renderDownloadHook();

    result.current.downloadSchemaFile();

    expect(saveAs).not.toHaveBeenCalled();
  });

  it("reports canDownload as true once a schema is seeded", () => {
    const { result } = renderDownloadHook(createSchema("Blog Schema"));

    expect(result.current.canDownload).toBe(true);
  });

  it("downloads the current schema as pretty-printed JSON named after it", async () => {
    const schema = createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    });
    const { result } = renderDownloadHook(schema);

    result.current.downloadSchemaFile();

    expect(saveAs).toHaveBeenCalledExactlyOnceWith(expect.any(Blob), "Blog Schema.json");
    const [blob] = vi.mocked(saveAs).mock.calls[0] ?? [];
    const text = await (blob as Blob).text();
    expect(JSON.parse(text)).toMatchObject({ name: "Blog Schema", tables: [] });
    expect(text).toBe(JSON.stringify(schema, null, 2));
  });

  it("sanitizes filesystem-unsafe characters in the schema name for the filename", () => {
    const schema = createSchema('Blog "2026" / Schema');
    const { result } = renderDownloadHook(schema);

    result.current.downloadSchemaFile();

    expect(saveAs).toHaveBeenCalledExactlyOnceWith(expect.any(Blob), "Blog _2026_ _ Schema.json");
  });
});
