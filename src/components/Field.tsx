import type { ReactNode } from 'react';

import './Field.css';

interface FieldProps {
  label: ReactNode;
  required?: boolean;
  error?: string;
  extra?: ReactNode;
  children: ReactNode;
}

export default function Field({ label, required, error, extra, children }: FieldProps) {
  return (
    <div className="field">
      <span className="field-label">
        {label}
        {required ? <span className="field-req">*</span> : null}
      </span>
      {children}
      {error ? <div className="field-error">{error}</div> : null}
      {!error && extra ? <div className="field-extra">{extra}</div> : null}
    </div>
  );
}
