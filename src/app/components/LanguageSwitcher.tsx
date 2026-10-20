import { Languages } from 'lucide-react'
import { languages, isLanguage, setLanguage, useI18n } from '../../lib/i18n'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export function LanguageSwitcher() {
  const { t, language, direction } = useI18n()
  return (
    <Select
      value={language}
      dir={direction}
      onValueChange={(value) => {
        if (isLanguage(value)) void setLanguage(value)
      }}
    >
      <SelectTrigger
        data-language-switcher=""
        aria-label={t('common:language')}
        showChevron={false}
        title={t('common:language')}
        className="size-11 min-w-11 shrink-0 justify-center rounded-md border-transparent bg-transparent p-2.5 hover:bg-muted"
      >
        <Languages className="size-5 shrink-0" aria-hidden="true" />
        <span className="sr-only">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent dir={direction}>
        {languages.map(({ id, name }) => (
          <SelectItem key={id} value={id}>
            <span lang={id} dir="auto">
              <bdi dir="auto">{name}</bdi>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
