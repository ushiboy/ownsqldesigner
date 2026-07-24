import { describeKey } from "./describeKey";

const columns = [
  { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", name: "id" },
  { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", name: "email" },
];

describe("describeKey", () => {
  it("labels a PRIMARY_KEY with its column name", () => {
    const label = describeKey(
      {
        id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
        type: "PRIMARY_KEY",
        columnIds: [columns[0].id],
      },
      columns,
    );

    expect(label).toBe("PRIMARY KEY (id)");
  });

  it("labels a UNIQUE key with its column name", () => {
    const label = describeKey(
      { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", type: "UNIQUE", columnIds: [columns[1].id] },
      columns,
    );

    expect(label).toBe("UNIQUE (email)");
  });

  it("joins composite column names in the given order", () => {
    const label = describeKey(
      {
        id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
        type: "INDEX",
        columnIds: [columns[0].id, columns[1].id],
      },
      columns,
    );

    expect(label).toBe("INDEX (id, email)");
  });
});
