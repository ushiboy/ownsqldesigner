import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./ColumnDialog.stories";

const {
  Add,
  Edit,
  EditAllowsAutoIncrement,
  AddPrimaryKeyDisabled,
  EditReferencedByForeignKeyDisabled,
  DuplicateName,
  InvalidName,
  ReservedName,
  PostgresqlSizeNotApplicable,
  PostgresqlSizeApplicable,
  PostgresqlSizeInvalidFormat,
  PostgresqlPrecisionApplicable,
  PostgresqlPrecisionOutOfRange,
  PostgresqlEditAllowsAutoIncrement,
  PostgresqlDefaultNotApplicableWithAutoIncrement,
} = composeStories(stories);

describe("ColumnDialog", () => {
  it("shows the dialog with a disabled submit button while the name is empty", () => {
    render(<Add />);
    expect(screen.getByRole("dialog", { name: "Add Column" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("defaults to the TEXT type and nullable checked when adding", () => {
    render(<Add />);
    expect(screen.getByLabelText("Type")).toHaveValue("TEXT");
    expect(screen.getByLabelText("Nullable")).toBeChecked();
  });

  it("keeps auto increment disabled while Primary Key is unchecked", () => {
    render(<Add />);
    expect(screen.getByLabelText("Primary Key")).not.toBeChecked();
    expect(screen.getByLabelText("Auto increment")).toBeDisabled();
  });

  it("keeps auto increment disabled when the type isn't INTEGER, even with Primary Key checked", async () => {
    render(<Edit />);
    await userEvent.click(screen.getByLabelText("Primary Key"));
    expect(screen.getByLabelText("Auto increment")).toBeDisabled();
  });

  it("enables auto increment once Primary Key is checked on an INTEGER column", async () => {
    render(<Add />);
    await userEvent.selectOptions(screen.getByLabelText("Type"), "INTEGER");
    await userEvent.click(screen.getByLabelText("Primary Key"));
    expect(screen.getByLabelText("Auto increment")).toBeEnabled();
  });

  it("prefills Primary Key checked and auto increment enabled when already the sole PRIMARY KEY column", () => {
    render(<EditAllowsAutoIncrement />);
    expect(screen.getByLabelText("Primary Key")).toBeChecked();
    expect(screen.getByLabelText("Auto increment")).toBeEnabled();
  });

  it("disables auto increment again after switching the type away from INTEGER", async () => {
    render(<EditAllowsAutoIncrement />);
    await userEvent.selectOptions(screen.getByLabelText("Type"), "TEXT");
    expect(screen.getByLabelText("Auto increment")).toBeDisabled();
  });

  it("disables auto increment again after unchecking Primary Key", async () => {
    render(<EditAllowsAutoIncrement />);
    await userEvent.click(screen.getByLabelText("Primary Key"));
    expect(screen.getByLabelText("Auto increment")).toBeDisabled();
  });

  it("disables the Primary Key checkbox when another column already holds it", () => {
    render(<AddPrimaryKeyDisabled />);
    expect(screen.getByLabelText("Primary Key")).toBeDisabled();
  });

  it("disables the Primary Key checkbox and explains why when it's referenced by a foreign key", () => {
    render(<EditReferencedByForeignKeyDisabled />);
    expect(screen.getByLabelText("Primary Key")).toBeDisabled();
    expect(
      screen.getByText(
        "This column is referenced by a foreign key on another table — remove that relation first.",
      ),
    ).toBeInTheDocument();
  });

  it("leaves Unique and Index enabled and unchecked by default when adding", () => {
    render(<Add />);
    expect(screen.getByLabelText("Unique")).toBeEnabled();
    expect(screen.getByLabelText("Unique")).not.toBeChecked();
    expect(screen.getByLabelText("Index")).toBeEnabled();
    expect(screen.getByLabelText("Index")).not.toBeChecked();
  });

  it("enables the submit button once a name is typed", async () => {
    render(<Add />);
    await userEvent.type(screen.getByLabelText("Name"), "title");
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("submits the trimmed name together with the other fields", async () => {
    const onSubmit = fn();
    render(<Add onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Name"), "  title  ");
    await userEvent.selectOptions(screen.getByLabelText("Type"), "INTEGER");
    await userEvent.type(screen.getByLabelText("Size"), "10");
    await userEvent.type(screen.getByLabelText("Default value"), "0");
    await userEvent.click(screen.getByLabelText("Nullable"));
    await userEvent.type(screen.getByLabelText("Comment"), "Post title");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
      {
        name: "title",
        type: "INTEGER",
        size: "10",
        precision: "",
        defaultValue: "0",
        nullable: false,
        autoIncrement: false,
        comment: "Post title",
      },
      { PRIMARY_KEY: false, UNIQUE: false, INDEX: false },
    );
  });

  it("submits Primary Key membership true together with the other fields when checked", async () => {
    const onSubmit = fn();
    render(<Add onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Name"), "id");
    await userEvent.click(screen.getByLabelText("Primary Key"));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      PRIMARY_KEY: true,
      UNIQUE: false,
      INDEX: false,
    });
  });

  it("submits Unique and Index membership independently of Primary Key", async () => {
    const onSubmit = fn();
    render(<Add onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Name"), "email");
    await userEvent.click(screen.getByLabelText("Unique"));
    await userEvent.click(screen.getByLabelText("Index"));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      PRIMARY_KEY: false,
      UNIQUE: true,
      INDEX: true,
    });
  });

  it("checking Unique or Index alone does not enable auto increment", async () => {
    render(<Add />);
    await userEvent.selectOptions(screen.getByLabelText("Type"), "INTEGER");
    await userEvent.click(screen.getByLabelText("Unique"));
    expect(screen.getByLabelText("Auto increment")).toBeDisabled();
  });

  it("prefills the form from the initial column when editing", () => {
    render(<Edit />);
    expect(screen.getByRole("dialog", { name: "Edit Column" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("title");
    expect(screen.getByLabelText("Type")).toHaveValue("TEXT");
    expect(screen.getByLabelText("Nullable")).toBeChecked();
  });

  it("submits autoIncrement true only when it is actually allowed", async () => {
    const onSubmit = fn();
    render(<EditAllowsAutoIncrement onSubmit={onSubmit} />);
    await userEvent.click(screen.getByLabelText("Auto increment"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ autoIncrement: true }),
      {
        PRIMARY_KEY: true,
        UNIQUE: false,
        INDEX: false,
      },
    );
  });

  it("forces autoIncrement false on submit once Primary Key has been unchecked", async () => {
    const onSubmit = fn();
    render(<EditAllowsAutoIncrement onSubmit={onSubmit} />);
    await userEvent.click(screen.getByLabelText("Auto increment"));
    await userEvent.click(screen.getByLabelText("Primary Key"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ autoIncrement: false }),
      {
        PRIMARY_KEY: false,
        UNIQUE: false,
        INDEX: false,
      },
    );
  });

  it("calls onCancel when the Cancel button is clicked", async () => {
    const onCancel = fn();
    render(<Add onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Escape is pressed", async () => {
    const onCancel = fn();
    render(<Add onCancel={onCancel} />);
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("disables submit and shows a hint for a name that is already taken", () => {
    render(<DuplicateName />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByText("A column with this name already exists.")).toBeInTheDocument();
  });

  it("re-enables submit once a duplicate name is edited to something unique", async () => {
    render(<DuplicateName />);
    await userEvent.type(screen.getByLabelText("Name"), "2");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("disables submit and shows a hint for a name with an invalid shape", () => {
    render(<InvalidName />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(
      screen.getByText(
        "Must start with a letter or underscore and contain only letters, digits, and underscores.",
      ),
    ).toBeInTheDocument();
  });

  it("disables submit and shows a hint for a SQL reserved keyword", () => {
    render(<ReservedName />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(
      screen.getByText("This name is a SQL reserved keyword and cannot be used."),
    ).toBeInTheDocument();
  });

  it("re-enables submit once a reserved-keyword name is edited to something valid", async () => {
    render(<ReservedName />);
    await userEvent.type(screen.getByLabelText("Name"), "ed");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("disables Size and shows a hint for a PostgreSQL type that doesn't accept one", () => {
    render(<PostgresqlSizeNotApplicable />);
    expect(screen.getByLabelText("Size")).toBeDisabled();
    expect(screen.getByText("This column type does not accept a size.")).toBeInTheDocument();
  });

  it("re-enables Size once the type is switched to one that accepts it", async () => {
    render(<PostgresqlSizeNotApplicable />);
    await userEvent.selectOptions(screen.getByLabelText("Type"), "VARCHAR");
    expect(screen.getByLabelText("Size")).toBeEnabled();
  });

  it("clears a stale Size value on submit for a type that doesn't accept one", async () => {
    const onSubmit = fn();
    render(<PostgresqlSizeNotApplicable onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ size: "" }),
      expect.anything(),
    );
  });

  it("clears a typed Size value immediately when switching to a type that doesn't accept one", async () => {
    render(<PostgresqlSizeApplicable />);
    await userEvent.selectOptions(screen.getByLabelText("Type"), "BOOLEAN");
    expect(screen.getByLabelText("Size")).toHaveValue("");
  });

  it("leaves a typed Size value untouched when switching between two types that both accept one", async () => {
    render(<PostgresqlSizeApplicable />);
    await userEvent.selectOptions(screen.getByLabelText("Type"), "CHAR");
    expect(screen.getByLabelText("Size")).toHaveValue("50");
  });

  it("disables submit and shows a hint for a Size value with an invalid format", () => {
    render(<PostgresqlSizeInvalidFormat />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(
      screen.getByText(
        "Size must be a positive whole number (or, for NUMERIC, a precision and scale pair like 10,2, where scale is not greater than precision).",
      ),
    ).toBeInTheDocument();
  });

  it("re-enables submit once an invalid Size value is corrected", async () => {
    render(<PostgresqlSizeInvalidFormat />);
    await userEvent.clear(screen.getByLabelText("Size"));
    await userEvent.type(screen.getByLabelText("Size"), "255");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("does not show an invalid-format hint for a Size the type doesn't even accept", () => {
    render(<PostgresqlSizeNotApplicable />);
    expect(
      screen.queryByText(
        "Size must be a positive whole number (or, for NUMERIC, a precision and scale pair like 10,2, where scale is not greater than precision).",
      ),
    ).not.toBeInTheDocument();
  });

  it("never shows a Size invalid-format hint under SQLite", async () => {
    render(<Edit />);
    await userEvent.type(screen.getByLabelText("Size"), "abc");
    expect(
      screen.queryByText(
        "Size must be a positive whole number (or, for NUMERIC, a precision and scale pair like 10,2, where scale is not greater than precision).",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("disables Precision and shows a hint for a PostgreSQL type that doesn't accept one", () => {
    render(<PostgresqlSizeNotApplicable />);
    expect(screen.getByLabelText("Precision")).toBeDisabled();
    expect(screen.getByText("This column type does not accept a precision.")).toBeInTheDocument();
  });

  it("re-enables Precision once the type is switched to one that accepts it", async () => {
    render(<PostgresqlSizeNotApplicable />);
    await userEvent.selectOptions(screen.getByLabelText("Type"), "TIMESTAMP");
    expect(screen.getByLabelText("Precision")).toBeEnabled();
  });

  it("clears a stale Precision value on submit for a type that doesn't accept one", async () => {
    const onSubmit = fn();
    render(<PostgresqlSizeNotApplicable onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ precision: "" }),
      expect.anything(),
    );
  });

  it("clears a typed Precision value immediately when switching to a type that doesn't accept one", async () => {
    render(<PostgresqlPrecisionApplicable />);
    await userEvent.selectOptions(screen.getByLabelText("Type"), "BOOLEAN");
    expect(screen.getByLabelText("Precision")).toHaveValue("");
  });

  it("leaves a typed Precision value untouched when switching between two types that both accept one", async () => {
    render(<PostgresqlPrecisionApplicable />);
    await userEvent.selectOptions(screen.getByLabelText("Type"), "TIME");
    expect(screen.getByLabelText("Precision")).toHaveValue("3");
  });

  it("disables submit and shows a hint for a Precision value out of PostgreSQL's 0-6 range", () => {
    render(<PostgresqlPrecisionOutOfRange />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByText("Precision must be a whole number from 0 to 6.")).toBeInTheDocument();
  });

  it("re-enables submit once an out-of-range Precision value is corrected", async () => {
    render(<PostgresqlPrecisionOutOfRange />);
    await userEvent.clear(screen.getByLabelText("Precision"));
    await userEvent.type(screen.getByLabelText("Precision"), "3");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("disables Default value and shows a hint when auto increment is checked and the dialect disallows both", () => {
    render(<PostgresqlDefaultNotApplicableWithAutoIncrement />);
    expect(screen.getByLabelText("Default value")).toBeDisabled();
    expect(
      screen.getByText("Auto-increment columns can't also have a default value."),
    ).toBeInTheDocument();
  });

  it("clears a stale default value on submit when auto increment is checked and the dialect disallows both", async () => {
    const onSubmit = fn();
    render(<PostgresqlDefaultNotApplicableWithAutoIncrement onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ defaultValue: "", autoIncrement: true }),
      expect.anything(),
    );
  });

  it("re-enables Default value once auto increment is unchecked", async () => {
    render(<PostgresqlDefaultNotApplicableWithAutoIncrement />);
    await userEvent.click(screen.getByLabelText("Auto increment"));
    expect(screen.getByLabelText("Default value")).toBeEnabled();
  });

  it("clears a typed default value immediately when auto increment is checked and the dialect disallows both", async () => {
    render(<PostgresqlEditAllowsAutoIncrement />);
    await userEvent.type(screen.getByLabelText("Default value"), "1");
    await userEvent.click(screen.getByLabelText("Auto increment"));
    expect(screen.getByLabelText("Default value")).toHaveValue("");
  });

  it("leaves a typed default value untouched when checking auto increment under a dialect that allows both", async () => {
    render(<EditAllowsAutoIncrement />);
    await userEvent.type(screen.getByLabelText("Default value"), "1");
    await userEvent.click(screen.getByLabelText("Auto increment"));
    expect(screen.getByLabelText("Default value")).toHaveValue("1");
  });
});
