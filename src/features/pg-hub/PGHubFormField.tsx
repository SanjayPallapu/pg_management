import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

type PGHubFormFieldProps = {
  label: string;
  required?: boolean;
  icon?: LucideIcon;
  error?: string;
  multiline?: boolean;
} & (InputHTMLAttributes<HTMLInputElement> | TextareaHTMLAttributes<HTMLTextAreaElement>);

export function PGHubFormField({
  label,
  required,
  icon: Icon,
  error,
  multiline,
  className = "",
  ...props
}: PGHubFormFieldProps) {
  const fieldClass = `pgh-field__control ${Icon ? "pgh-field__control--icon" : ""} ${error ? "pgh-field__control--error" : ""} ${className}`;

  return (
    <label className="pgh-field">
      <span className="pgh-field__label">
        {label} {required && <em>*</em>}
      </span>
      <span className="pgh-field__wrap">
        {Icon && <Icon size={20} className="pgh-field__icon" />}
        {multiline ? (
          <textarea {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)} className={fieldClass} />
        ) : (
          <input {...(props as InputHTMLAttributes<HTMLInputElement>)} className={fieldClass} />
        )}
      </span>
      {error && <span className="pgh-field__error">{error}</span>}
    </label>
  );
}
