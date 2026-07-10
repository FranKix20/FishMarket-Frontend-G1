/**
 * Isotipo simple del marketplace: un pez estilizado, trazo único.
 * Se usa en el navbar (blanco sobre navy) y como favicon-friendly SVG.
 */
export default function FishIcon({ size = 26, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M4 16c4-6 12-9 20-6-2 2-3 4-3 6s1 4 3 6c-8 3-16 0-20-6z"
        fill={color}
      />
      <path d="M24 10c2 2 3 4 3 6s-1 4-3 6l4-1v-10z" fill={color} />
      <circle cx="9" cy="15" r="1.4" fill="#0a1a3f" />
      <path d="M4 16c1.5-1.2 3-2 4.5-2.6" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
