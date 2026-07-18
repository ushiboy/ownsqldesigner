import { tv } from "tailwind-variants";

const bar = tv({
  base: "absolute inset-x-0 top-0 z-10 border-b border-accent-border bg-accent-bg px-4 py-2 text-[14px] text-heading",
});

type NotificationBarProps = {
  message: string | null;
};

export function NotificationBar({ message }: NotificationBarProps) {
  if (message === null) {
    return null;
  }

  return (
    <div role="alert" className={bar()}>
      {message}
    </div>
  );
}
