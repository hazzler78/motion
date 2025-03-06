declare module '@/components/ui/textarea' {
  import { TextareaHTMLAttributes } from 'react'
  
  export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>
  
  const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<HTMLTextAreaElement>>
  
  export { Textarea }
}

declare module '@/components/ui/button' {
  import { ButtonHTMLAttributes } from 'react'
  import { VariantProps } from 'class-variance-authority'
  
  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean
  }
  
  const buttonVariants: (props?: VariantProps<typeof buttonVariants>) => string
  
  const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>
  
  export { Button, buttonVariants }
} 