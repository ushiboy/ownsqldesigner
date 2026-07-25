import { describeForeignKey } from "./describeForeignKey";

const ownColumns = [{ id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", name: "user_id" }];
const referencedTable = {
  name: "users",
  columns: [{ id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", name: "id" }],
};

describe("describeForeignKey", () => {
  it("labels a foreign key with its own column and the referenced table.column", () => {
    const label = describeForeignKey(
      {
        id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
        columnId: ownColumns[0].id,
        referencedTableId: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        referencedColumnId: referencedTable.columns[0].id,
      },
      ownColumns,
      referencedTable,
    );

    expect(label).toBe("user_id → users.id");
  });

  it("falls back to a placeholder when the referenced table is missing", () => {
    const label = describeForeignKey(
      {
        id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
        columnId: ownColumns[0].id,
        referencedTableId: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        referencedColumnId: referencedTable.columns[0].id,
      },
      ownColumns,
      undefined,
    );

    expect(label).toBe("user_id → ?.?");
  });
});
