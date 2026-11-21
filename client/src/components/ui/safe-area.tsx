import React from 'react';

interface SafeAreaProps {
  children: React.ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  style?: React.CSSProperties;
}

/**
 * Applies safe-area insets via inline styles, not utility classes —
 * `pb-4` + `pb-[env(...)]` in one class list resolve unpredictably
 * (stylesheet order decides), so the inset must win deterministically.
 * Reads the --s-* tokens defined on :root (env() fallbacks) so tests
 * can simulate notch/home-bar insets by overriding the token.
 * A 0.75rem floor keeps breathing room even where insets are zero.
 */
const SafeArea: React.FC<SafeAreaProps> = ({
  children,
  className = '',
  top = false,
  bottom = false,
  left = false,
  right = false,
  style,
}) => {
  const insets: React.CSSProperties = {
    paddingTop: top ? 'max(0.75rem, var(--s-top))' : undefined,
    paddingBottom: bottom ? 'max(0.75rem, var(--s-bottom))' : undefined,
    paddingLeft: left ? 'max(0.75rem, var(--s-left))' : undefined,
    paddingRight: right ? 'max(0.75rem, var(--s-right))' : undefined,
  };

  return <div className={className} style={{ ...insets, ...style }}>{children}</div>;
};

export { SafeArea };
