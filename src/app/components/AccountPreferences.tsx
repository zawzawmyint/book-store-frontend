import { Check, ChevronDown, Languages, SunMoon } from 'lucide-react'
import { useId, useState } from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { isLanguage, languages, setLanguage, useI18n } from '../../lib/i18n'
import { useTheme } from '../../lib/theme'

export function AccountPreferences() {
  const { t, language } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const [expanded, setExpanded] = useState<string>()
  const prefix = useId()
  const groups = [
    {
      key: 'language',
      label: t('common:language'),
      value: language,
      icon: Languages,
      options: languages.map(({ id, name }) => ({ value: id, label: name })),
      select: (value: string) => {
        if (isLanguage(value)) void setLanguage(value)
      },
    },
    {
      key: 'appearance',
      label: t('common:appearance'),
      value: theme,
      icon: SunMoon,
      options: [
        { value: 'light', label: t('common:appearanceLight') },
        { value: 'dark', label: t('common:appearanceDark') },
      ],
      select: (value: string) => {
        if ((value === 'light' || value === 'dark') && value !== theme) toggleTheme()
      },
    },
  ]
  return (
    <>
      <Menu.Separator className="my-1 h-px bg-border" />
      {groups.map(({ key, label, value, icon: Icon, options, select }) => (
        <Menu.Group key={key}>
          <Menu.Item
            className="account-preference-trigger"
            aria-expanded={expanded === key}
            aria-controls={expanded === key ? `${prefix}-${key}` : undefined}
            onSelect={(event) => {
              event.preventDefault()
              setExpanded(expanded === key ? undefined : key)
            }}
          >
            <Icon aria-hidden="true" className="size-4" />
            <span>{label}</span>
            <span className="ms-auto text-xs text-muted-foreground">
              {options.find((option) => option.value === value)?.label}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`size-3 ${expanded === key ? 'rotate-180' : ''}`}
            />
          </Menu.Item>
          {expanded === key && (
            <Menu.RadioGroup
              id={`${prefix}-${key}`}
              value={value}
              onValueChange={select}
              aria-label={label}
              className="account-preference-options"
            >
              {options.map((option) => (
                <Menu.RadioItem
                  key={option.value}
                  value={option.value}
                  className="account-preference-option"
                >
                  <span className="size-4">
                    <Menu.ItemIndicator>
                      <Check aria-hidden="true" className="size-4" />
                    </Menu.ItemIndicator>
                  </span>
                  <bdi dir="auto" lang={key === 'language' ? option.value : undefined}>
                    {option.label}
                  </bdi>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          )}
        </Menu.Group>
      ))}
    </>
  )
}
