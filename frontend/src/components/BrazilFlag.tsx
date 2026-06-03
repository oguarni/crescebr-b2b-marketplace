import React from 'react';

interface BrazilFlagProps {
  /** Rendered height. Use an em-based value to scale with the surrounding text. */
  size?: string | number;
  title?: string;
}

/**
 * Inline SVG Brazilian flag. Drawn as SVG (not a flag emoji) because Windows
 * browsers do not render regional-indicator emoji as flags — they fall back to
 * the letters "BR", which is exactly what this component is meant to replace.
 */
const BrazilFlag: React.FC<BrazilFlagProps> = ({ size = '1em', title = 'Brazil' }) => (
  <svg
    viewBox='0 0 28 20'
    height={size}
    role='img'
    aria-label={title}
    style={{ display: 'inline-block', verticalAlign: 'text-bottom', borderRadius: 2 }}
  >
    <title>{title}</title>
    <rect width='28' height='20' fill='#009b3a' />
    <polygon points='14,2 25.5,10 14,18 2.5,10' fill='#fedf00' />
    <circle cx='14' cy='10' r='4.1' fill='#002776' />
  </svg>
);

export default BrazilFlag;
