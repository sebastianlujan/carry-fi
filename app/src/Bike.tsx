// La bicicleta — el logo de Carry. "La bicicleta financiera" es el nombre argentino
// de toda la vida para este trade exacto; acá está on-chain y pedalea el que cobra.
export default function Bike({ width = 30, spin = false, stroke = '#141414' }: {
  width?: number; spin?: boolean; stroke?: string
}) {
  return (
    <svg
      className={spin ? 'spin-wheels' : undefined}
      width={width} height={(width * 24) / 36} viewBox="0 0 36 24" fill="none" aria-hidden
    >
      <g stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <g className="bike-wheel">
          <circle cx="8" cy="16" r="6" />
          <path d="M2 16h12M5 10.8l6 10.4M5 21.2l6-10.4" strokeWidth="1.1" />
        </g>
        <g className="bike-wheel">
          <circle cx="28" cy="16" r="6" />
          <path d="M22 16h12M25 10.8l6 10.4M25 21.2l6-10.4" strokeWidth="1.1" />
        </g>
        <path d="M8 16h10L14.5 6h10L18 16 14.5 6M24.5 6 28 16" />
        <path d="M24.5 6l-0.9-3 3.4-.4" />
        <path d="M14.5 6l-0.7-2.6M11.8 3.4h4" />
        <circle cx="18" cy="16" r="1.7" fill={stroke} stroke="none" />
      </g>
    </svg>
  )
}
