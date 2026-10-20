import { t, useI18n } from '../../../lib/i18n'
import { AccountProfile } from '../AccountProfile'
import { PageContainer } from '../../../app/components/PageContainer'

export function ProfilePage() {
  useI18n()

  return (
    <PageContainer className="mx-auto max-w-xl py-12 sm:py-20">
      <p className="eyebrow mb-3">{t('storefront:yourAccount')}</p>
      <h1 className="font-serif text-5xl">{t('storefront:yourProfile')}</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {t('storefront:earlierOrderRequestsKeepTheNameTheyWerePlacedWith')}
      </p>
      <AccountProfile tone="store" />
    </PageContainer>
  )
}
