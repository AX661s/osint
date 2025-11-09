import { Toaster as Sonner, toast } from "sonner"
import { useTheme } from "@/contexts/ThemeContext"

const Toaster = ({
  ...props
}) => {
  const { currentTheme } = useTheme()
  // Map custom theme to sonner theme (dark/light)
  const sonnerTheme = currentTheme === 'dark' ? 'dark' : 'dark'

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
