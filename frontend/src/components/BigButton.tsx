import type { ButtonHTMLAttributes } from 'react';
import { bigButtonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

interface BigButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function BigButton({ variant = 'primary', size = 'normal', type = 'button', ...props }: BigButtonProps) {
  return <button type={type} className={bigButtonClasses(variant, size)} {...props} />;
}
