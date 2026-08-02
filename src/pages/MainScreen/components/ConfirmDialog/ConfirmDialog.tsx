import { useTranslations } from "use-intl";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const tCommon = useTranslations("common");
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <p className="mt-4 text-[14px]">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={dialogActionButton({ variant: "secondary" })}
        >
          {tCommon("cancel")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          data-autofocus
          className={dialogActionButton({ variant: "danger" })}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
