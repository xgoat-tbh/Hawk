'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface HawkScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string | number;
  maxWidth?: string | number;
  orientation?: 'vertical' | 'horizontal' | 'both';
  children: React.ReactNode;
}

export const HawkScrollArea = forwardRef<HTMLDivElement, HawkScrollAreaProps>(
  (
    {
      maxHeight,
      maxWidth,
      orientation = 'vertical',
      className,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const overflowClasses = {
      vertical: 'overflow-y-auto overflow-x-hidden',
      horizontal: 'overflow-x-auto overflow-y-hidden',
      both: 'overflow-auto',
    }[orientation];

    const computedStyle: React.CSSProperties = {
      ...style,
      ...(maxHeight !== undefined ? { maxHeight } : {}),
      ...(maxWidth !== undefined ? { maxWidth } : {}),
    };

    return (
      <div
        ref={ref}
        tabIndex={0}
        style={computedStyle}
        className={cn(
          'relative focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus/50',
          overflowClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

HawkScrollArea.displayName = 'HawkScrollArea';
