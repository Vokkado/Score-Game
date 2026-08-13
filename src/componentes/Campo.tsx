import type { InputHTMLAttributes } from 'react';

/**
 * Campo de texto. Réplica de `AppInput` del Frontend:
 * borde de 1px, radio 10, alto 46, fondo del color de la página (no blanco),
 * label arriba en variante body y el error en caption debajo.
 *
 * Los placeholders por defecto son los mismos que usa la app.
 */

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  tipo?: 'text' | 'email' | 'tel';
  error?: string;
}

const PLACEHOLDER_POR_DEFECTO = {
  text: 'Tu nombre',
  email: 'tucorreo@ejemplo.com',
  tel: '099 123 456',
} as const;

const INPUT_MODE = {
  text: 'text',
  email: 'email',
  tel: 'tel',
} as const;

export function Campo({ label, tipo = 'text', error, id, placeholder, ...props }: Props) {
  return (
    <div className="campo">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={tipo}
        className={error ? 'con-error' : ''}
        placeholder={placeholder ?? PLACEHOLDER_POR_DEFECTO[tipo]}
        autoCapitalize={tipo === 'text' ? 'words' : 'off'}
        autoCorrect="off"
        inputMode={INPUT_MODE[tipo]}
        {...props}
      />
      {error && <p className="mensaje-error">{error}</p>}
    </div>
  );
}
