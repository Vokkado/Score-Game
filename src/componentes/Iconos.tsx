/**
 * Íconos en SVG inline.
 *
 * La app usa Ionicons; acá se replican los pocos que hacen falta a mano en vez
 * de sumar una librería de íconos entera al bundle que viaja al iPad. Los
 * trazos siguen el mismo estilo: line caps redondeados y grosor 48/512.
 */

interface Props {
  size?: number;
  color?: string;
}

/** Ionicons `chevron-back`, el del BackButton y el ScreenHeader de la app. */
export function ChevronIzquierda({ size = 22, color = 'currentColor' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <path
        fill="none"
        stroke={color}
        strokeWidth={48}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M328 112 184 256l144 144"
      />
    </svg>
  );
}

/** Ionicons `checkmark`, el del AppCheckbox. */
export function Tilde({ size = 14, color = 'currentColor' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <path
        fill="none"
        stroke={color}
        strokeWidth={48}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M416 128 174 370l-78-78"
      />
    </svg>
  );
}

/** Ionicons `trophy`. Reemplaza al emoji del premio. */
export function Trofeo({ size = 20, color = 'currentColor' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" fill={color}>
      <path d="M448 80h-48V64a16 16 0 0 0-16-16H128a16 16 0 0 0-16 16v16H64a32 32 0 0 0-32 32v32a96 96 0 0 0 84 95.2A144.3 144.3 0 0 0 232 351v49h-40a56 56 0 0 0-56 56v8h240v-8a56 56 0 0 0-56-56h-40v-49a144.3 144.3 0 0 0 116-111.8A96 96 0 0 0 480 144v-32a32 32 0 0 0-32-32zM80 144v-32h32v82.7A64.1 64.1 0 0 1 80 144zm352 0a64.1 64.1 0 0 1-32 50.7V112h32z" />
    </svg>
  );
}

/** Ionicons `information-circle`, para el aviso de por qué pedimos los datos. */
export function Info({ size = 22, color = 'currentColor' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" fill={color}>
      <path d="M256 32C132.3 32 32 132.3 32 256s100.3 224 224 224 224-100.3 224-224S379.7 32 256 32zm22 344h-44V222h44zm0-198h-44v-44h44z" />
    </svg>
  );
}

/** MaterialCommunityIcons `bottle-wine`, el que usa ScoreBadge para el alcohol. */
export function Botella({ size = 28, color = 'currentColor' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={color}>
      <path d="M10 1v5.4L8.6 8.2A4 4 0 0 0 8 10.3V22a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V10.3a4 4 0 0 0-.6-2.1L14 6.4V1h-4zm1.5 1.5h1V6h-1V2.5z" />
    </svg>
  );
}
