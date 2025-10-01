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

const SafeArea: React.FC<SafeAreaProps> = ({
  children,
  className = '',
  top = true,
  bottom = true,
  left = false,
  right = false,
  style,
}) => {
  const paddingClasses: string[] = [];
  if (top) paddingClasses.push('pt-[env(safe-area-inset-top)]');
  if (bottom) paddingClasses.push('pb-[env(safe-area-inset-bottom)]');
  if (left) paddingClasses.push('pl-[env(safe-area-inset-left)]');
  if (right) paddingClasses.push('pr-[env(safe-area-inset-right)]');

  return <div className={`${paddingClasses.join(' ')} ${className}`} style={style}>{children}</div>;
};

export { SafeArea };
