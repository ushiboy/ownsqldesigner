import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createSchema, type Schema } from "../../../../domain/schema";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { createFakeSchemaRepository } from "../../../../test/fakeSchemaRepository";
import { NotificationProvider } from "../../NotificationContext";
import { SchemaWorkspaceProvider, useCurrentSchema } from "../../SchemaWorkspaceContext";
import { NotificationBar } from "../NotificationBar";
import { LoadSchemaButton } from "./LoadSchemaButton";

const DUPLICATE_TABLE_NAME_SCHEMA: Schema = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Broken Schema",
  dialect: "sqlite",
  tables: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "posts",
      comment: "",
      position: { x: 0, y: 0 },
      columns: [],
      keys: [],
      foreignKeys: [],
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "posts",
      comment: "",
      position: { x: 260, y: 0 },
      columns: [],
      keys: [],
      foreignKeys: [],
    },
  ],
  createdAt: new Date("2026-07-18T09:00:00.000Z"),
  updatedAt: new Date("2026-07-18T09:00:00.000Z"),
};

function jsonFile(content: unknown, name = "schema.json"): File {
  return new File([JSON.stringify(content)], name, { type: "application/json" });
}

/** Displays the current schema's name so tests can observe a completed load. */
function CurrentSchemaName() {
  const schema = useCurrentSchema();
  return <h1>{schema?.name ?? ""}</h1>;
}

function renderLoadSchemaButton(initialSchema: Schema) {
  const repository = createFakeSchemaRepository({
    schemas: [initialSchema],
    lastSchemaId: initialSchema.id,
  });
  render(
    <LocaleProvider>
      <NotificationProvider>
        <SchemaWorkspaceProvider repository={repository} initialSchema={initialSchema}>
          <NotificationBar />
          <LoadSchemaButton />
          <CurrentSchemaName />
        </SchemaWorkspaceProvider>
      </NotificationProvider>
    </LocaleProvider>,
  );
}

describe("LoadSchemaButton", () => {
  const original = createSchema("Blog Schema", {
    id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
    now: new Date("2026-07-18T09:00:00.000Z"),
  });

  it("shows a confirm dialog naming the file's schema after a valid file is selected", async () => {
    renderLoadSchemaButton(original);
    const user = userEvent.setup();
    const imported = createSchema("Imported Schema", {
      id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
    });

    await user.upload(screen.getByLabelText("Load schema file"), jsonFile(imported));

    expect(screen.getByRole("dialog", { name: "Load Schema" })).toBeInTheDocument();
    expect(
      screen.getByText('Replace the current schema with "Imported Schema"? This cannot be undone.'),
    ).toBeInTheDocument();
  });

  it("replaces the current schema when the load is confirmed", async () => {
    renderLoadSchemaButton(original);
    const user = userEvent.setup();
    const imported = createSchema("Imported Schema", {
      id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
    });
    await user.upload(screen.getByLabelText("Load schema file"), jsonFile(imported));

    await user.click(screen.getByRole("button", { name: "Load" }));

    expect(await screen.findByRole("heading", { name: "Imported Schema" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("leaves the current schema unchanged when the load is cancelled", async () => {
    renderLoadSchemaButton(original);
    const user = userEvent.setup();
    const imported = createSchema("Imported Schema");
    await user.upload(screen.getByLabelText("Load schema file"), jsonFile(imported));

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("heading", { name: "Blog Schema" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an error notification for unparsable file content", async () => {
    renderLoadSchemaButton(original);
    const user = userEvent.setup();

    await user.upload(
      screen.getByLabelText("Load schema file"),
      new File(["not json"], "schema.json", { type: "application/json" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the schema file. It is not a valid schema file.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an error notification for JSON that does not match the schema shape", async () => {
    renderLoadSchemaButton(original);
    const user = userEvent.setup();

    await user.upload(screen.getByLabelText("Load schema file"), jsonFile({ foo: "bar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the schema file. It is not a valid schema file.",
    );
  });

  it("shows an error notification for a structurally valid schema that fails integrity validation", async () => {
    renderLoadSchemaButton(original);
    const user = userEvent.setup();

    await user.upload(
      screen.getByLabelText("Load schema file"),
      jsonFile(DUPLICATE_TABLE_NAME_SCHEMA),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the schema file. It is not a valid schema file.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
