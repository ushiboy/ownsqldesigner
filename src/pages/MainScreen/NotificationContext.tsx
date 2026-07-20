import { type ReactNode, createContext, useContext, useMemo, useState } from "react";

type NotificationContextValue = {
  /** Sticky message; stays until dismissed or replaced. null when there is none. */
  notification: string | null;
  notify: (message: string) => void;
  dismissNotification: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

type NotificationProviderProps = {
  /** Non-null only in stories and tests that start with a notification shown. */
  initialNotification?: string | null;
  children: ReactNode;
};

export function NotificationProvider({
  initialNotification = null,
  children,
}: NotificationProviderProps) {
  const [notification, setNotification] = useState<string | null>(initialNotification);
  const value = useMemo(
    () => ({
      notification,
      notify: (message: string) => setNotification(message),
      dismissNotification: () => setNotification(null),
    }),
    [notification],
  );
  return <NotificationContext value={value}>{children}</NotificationContext>;
}

export function useNotification(): NotificationContextValue {
  const value = useContext(NotificationContext);
  if (value === null) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return value;
}
