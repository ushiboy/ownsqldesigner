import { tv } from "tailwind-variants";

const radioOption = tv({
  base: "flex cursor-pointer items-start gap-2 rounded-md border border-edge p-3 text-[14px] transition-colors hover:bg-accent-bg",
});

type RadioOptionProps = {
  name: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
};

/** A labeled radio button for a settings page's single-choice options; extracted for reuse as more settings are added (see docs/design/0025). */
export function RadioOption({ name, label, description, checked, onChange }: RadioOptionProps) {
  return (
    <label className={radioOption()}>
      <input
        type="radio"
        name={name}
        aria-label={label}
        checked={checked}
        onChange={onChange}
        className="mt-1"
      />
      <span>
        <span className="block text-heading">{label}</span>
        <span className="block text-[12px] text-body">{description}</span>
      </span>
    </label>
  );
}
