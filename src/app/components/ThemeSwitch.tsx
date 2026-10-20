import { t, useI18n } from '../../lib/i18n'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { IconAction } from './IconAction'

export function ThemeSwitch() {
  useI18n()

  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const Icon = dark ? Moon : Sun
  return (
    <IconAction
      type="button"
      role="switch"
      label={t('common:darkMode')}
      workspace
      tooltip={t(dark ? 'common:themeLight' : 'common:themeDark')}
      aria-checked={dark}
      onClick={toggleTheme}
      className="border border-control bg-surface text-foreground"
    >
      <Icon size={14} aria-hidden="true" />
    </IconAction>
  )
}
