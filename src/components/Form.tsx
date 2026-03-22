/**
 * Claudeopt Form component — progressive enhancement with CSRF.
 *
 * Renders a standard HTML <form> with a hidden CSRF token.
 * Works without JavaScript. Enhanced with hydration later.
 */

import { generateCSRFToken } from "../db/csrf.ts";

interface FormProps {
  action: string;
  method?: string;
  children?: any;
  [key: string]: any;
}

export function Form({ action, method = "POST", children, ...props }: FormProps) {
  const csrf = generateCSRFToken();
  return (
    <form action={action} method={method} {...props}>
      <input type="hidden" name="_csrf" value={csrf} />
      {children}
    </form>
  );
}

interface FieldErrorProps {
  name: string;
  errors?: Record<string, string>;
}

export function FieldError({ name, errors }: FieldErrorProps) {
  const error = errors?.[name];
  if (!error) return null;
  return <span style={{ color: "red", fontSize: "0.85em" }}>{error}</span>;
}
