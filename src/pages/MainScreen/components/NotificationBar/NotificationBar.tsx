import { LuX } from "react-icons/lu";
import { tv } from "tailwind-variants";
import { useTranslations } from "use-intl";
import { useNotification } from "../../NotificationContext";

const bar = tv({
  base: "absolute inset-x-0 top-0 z-10 flex items-center gap-2 border-b border-accent-border bg-accent-bg px-4 py-2 text-[14px] text-heading",
});

const dismissButton = tv({
  base: "ml-auto rounded-md p-1 transition-colors hover:bg-heading/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

export function NotificationBar() {
  const { notification, dismissNotification } = useNotification();
  const t = useTranslations("notificationBar");

  if (notification === null) {
    return null;
  }

  return (
    <div role="alert" className={bar()}>
      {notification}
      <button
        type="button"
        aria-label={t("dismissAriaLabel")}
        onClick={dismissNotification}
        className={dismissButton()}
      >
        <LuX aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
