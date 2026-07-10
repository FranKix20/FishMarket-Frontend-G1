/**
 * Elemento de firma visual: una línea ondulada que evoca tanto una
 * corriente de marea como el rizo de una línea de pesca en el agua.
 * Se usa como divisor de secciones (estático) o como indicador de
 * carga (animado, ver .tideline-loader en global.css).
 */
export default function Tideline({ loading = false }) {
  return (
    <div className={loading ? 'tideline tideline-loader' : 'tideline'} role="presentation" aria-hidden="true">
      <svg viewBox="0 0 400 14" preserveAspectRatio="none">
        <path d="M0,7 C 20,1 40,13 60,7 C 80,1 100,13 120,7 C 140,1 160,13 180,7 C 200,1 220,13 240,7 C 260,1 280,13 300,7 C 320,1 340,13 360,7 C 380,1 400,13 400,7" />
      </svg>
    </div>
  );
}
