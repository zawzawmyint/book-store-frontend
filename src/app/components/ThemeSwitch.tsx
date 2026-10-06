import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { IconAction } from './IconAction'

export function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const Icon = dark ? Moon : Sun
  return (
    <IconAction
      type="button"
      role="switch"
      label="Dark mode"
      workspace
      tooltip={`Switch to ${dark ? 'Light' : 'Dark'} mode`}
      aria-checked={dark}
      onClick={toggleTheme}
      className="border border-control bg-surface text-foreground"
    >
      <Icon size={14} aria-hidden="true" />
    </IconAction>
  )
}
