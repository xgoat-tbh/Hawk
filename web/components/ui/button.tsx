import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
const buttonVariants = cva('inline-flex items-center justify-center gap-2 rounded-md font-medium text-sm disabled:opacity-50 disabled:pointer-events-none', { variants: { variant: { default: 'btn-primary', secondary: 'btn-secondary', destructive: 'btn-outline-danger', ghost: 'btn-ghost' }, size: { default: 'min-h-10 px-4', sm: 'min-h-9 px-3', icon: 'h-10 w-10' } }, defaultVariants: { variant: 'default', size: 'default' } });
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => { const Component = asChild ? Slot : 'button'; return <Component ref={ref} className={twMerge(clsx(buttonVariants({ variant, size }), className))} {...props}/>; });
Button.displayName = 'Button';
