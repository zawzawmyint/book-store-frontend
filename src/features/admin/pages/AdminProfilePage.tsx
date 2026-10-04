import { AccountProfile } from '../../account/AccountProfile'
import { AdminPageHeader } from '../components/AdminPageHeader'

export function AdminProfilePage() {
  return (
    <section>
      <AdminPageHeader
        title="Your profile"
        description="Earlier order requests keep the name they were placed with."
      />
      <AccountProfile tone="admin" />
    </section>
  )
}
