interface SwitchProps {
  checked: boolean;
  label?: string;
  onChange: () => void;
  disabled?: boolean;
}

export default function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="slider" />
    </label>
  );
}
