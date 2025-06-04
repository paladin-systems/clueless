import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

interface Props {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

const Tooltip: React.FC<Props> = ({
  content,
  children,
  placement = 'top',
  delay = 200,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const placements = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1'
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={clsx(
            'absolute z-50 px-2 py-1 text-xs',
            'bg-gray-900/95 text-gray-100 rounded shadow-lg',
            'backdrop-blur-sm border border-gray-700/50',
            'animate-in fade-in zoom-in-95 duration-200',
            placements[placement],
            className
          )}
        >
          {content}
          <div 
            className={clsx(
              'absolute w-2 h-2 bg-gray-900/95 border border-gray-700/50',
              'rotate-45 transform',
              {
                'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-0 border-l-0': placement === 'top',
                'top-[-4px] left-1/2 -translate-x-1/2 border-b-0 border-r-0': placement === 'bottom',
                'right-[-4px] top-1/2 -translate-y-1/2 border-l-0 border-t-0': placement === 'left',
                'left-[-4px] top-1/2 -translate-y-1/2 border-r-0 border-b-0': placement === 'right'
              }
            )}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;