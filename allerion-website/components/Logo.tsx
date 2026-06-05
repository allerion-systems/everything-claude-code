type LogoProps = {
  /** Pixel size of the triangular mark. */
  size?: number;
  /** Show the "ALLERION LLC" wordmark next to the mark. */
  withWordmark?: boolean;
  className?: string;
};

/**
 * The Allerion mark: a clean, monolithic "A" rendered as a triangle with a
 * crossbar, echoing the embossed signage in the brand artwork.
 */
export default function Logo({ size = 40, withWordmark = true, className }: LogoProps) {
  return (
    <span className={`logo ${className ?? ""}`} aria-label="Allerion LLC">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="allerionSheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#e7edf6" />
            <stop offset="100%" stopColor="#aeb9cc" />
          </linearGradient>
        </defs>
        {/* Left leg */}
        <path d="M50 10 L18 86 L31 86 L50 40 Z" fill="url(#allerionSheen)" />
        {/* Right leg */}
        <path d="M50 10 L82 86 L69 86 L50 40 Z" fill="url(#allerionSheen)" />
        {/* Crossbar */}
        <rect x="33" y="70" width="34" height="9" rx="1.5" fill="url(#allerionSheen)" />
      </svg>
      {withWordmark && (
        <span className="logo__text">
          <span className="logo__name">
            ALLERION <span className="logo__llc">LLC</span>
          </span>
          <span className="logo__tag">LIMITED LIABILITY COMPANY</span>
        </span>
      )}
    </span>
  );
}
