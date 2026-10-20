import { t, useI18n } from '../../../lib/i18n'
import { AccountProfile } from '../../account/AccountProfile'
import { AdminPageHeader } from '../components/AdminPageHeader'

export function AdminProfilePage() {
  useI18n()

  return (
    <section>
      <AdminPageHeader
        title={t('admin:yourProfile')}
        description={t('admin:earlierOrderRequestsKeepTheNameTheyWerePlacedWith')}
      />
      <AccountProfile tone="admin" />
    </section>
  )
}
