
import React from 'react';

interface IconProps {
  className?: string;
}

const GiftIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H7.5a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A3.375 3.375 0 0 0 12 12m0 0a3.375 3.375 0 0 0 0 7.125M12 12a3.375 3.375 0 0 1 0-7.125M12 12v7.125m0-7.125a3.375 3.375 0 0 0 0-7.125M6.375 5.625a3.375 3.375 0 0 1 0 6.75M6.375 12a3.375 3.375 0 0 1 0-6.75M17.625 5.625a3.375 3.375 0 0 1 0 6.75M17.625 12a3.375 3.375 0 0 1 0-6.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export default GiftIcon;
