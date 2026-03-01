/**
 * Epik brand logo mark — node graph constellation.
 *
 * Renders the four-node connected graph that represents the Epik brand.
 * The nodes use the mint accent colour and the foreground colour as defined
 * in the brand specification.
 */
export function Logo({ size = 32 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      aria-label="Epik logo"
      role="img"
    >
      {/* Edges */}
      <line x1="5" y1="5" x2="17" y2="8" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <line x1="5" y1="5" x2="8" y2="17" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <line x1="17" y1="8" x2="14" y2="17" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <line x1="8" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      {/* Nodes */}
      <circle cx="5" cy="5" r="2.5" fill="#00e599" />
      <circle cx="17" cy="8" r="2.0" fill="currentColor" />
      <circle cx="8" cy="17" r="2.0" fill="currentColor" />
      <circle cx="14" cy="17" r="1.6" fill="#00e599" opacity="0.7" />
    </svg>
  );
}
