import React from 'react';
import { IC } from '../utils/constants';

interface IconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, className = '', style }) => {
  const path = IC[name] || IC.tag;
  return (
    <svg className={`i ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      <path d={path} />
    </svg>
  );
};
