import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { NotificationProvider } from "../../NotificationContext";
import * as stories from "./NotificationBar.stories";
import { NotificationBar } from "./NotificationBar";

const { Default } = composeStories(stories);

describe("NotificationBar", () => {
  it("shows the notification as an alert", () => {
    render(<Default />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Cannot delete column: referenced by a foreign key",
    );
  });

  it("hides the notification when the dismiss button is clicked", async () => {
    render(<Default />);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders nothing while there is no notification", () => {
    const { container } = render(
      <LocaleProvider>
        <NotificationProvider>
          <NotificationBar />
        </NotificationProvider>
      </LocaleProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
