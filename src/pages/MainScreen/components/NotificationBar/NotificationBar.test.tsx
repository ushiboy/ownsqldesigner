import { render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./NotificationBar.stories";
import { NotificationBar } from "./NotificationBar";

const { Default } = composeStories(stories);

describe("NotificationBar", () => {
  it("shows the message as an alert when a message is set", async () => {
    await Default.run();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Cannot delete column: referenced by a foreign key",
    );
  });

  it("renders nothing when the message is null", () => {
    const { container } = render(<NotificationBar message={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
