import { DeliveryDetails } from '../../orders/DeliveryDetails'
import { PaymentStatus } from '../../orders/PaymentStatus'
import { OrderStatusBadge } from '../../orders/OrderStatusBadge'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../../app/components/PageContainer'
import { money } from '../../../lib/format'
import type { CustomerOrderFieldsFragment } from '../../../generated/graphql'
import { Button } from '../../../app/components/ui/button'
import { Card, CardContent } from '../../../app/components/ui/card'
import { Separator } from '../../../app/components/ui/separator'

export function OrderReceiptView({
  receipt,
  name,
}: {
  receipt: Pick<
    CustomerOrderFieldsFragment,
    | 'id'
    | 'status'
    | 'items'
    | 'totalCents'
    | 'payment'
    | 'subtotalCents'
    | 'deliveryFeeCents'
    | 'delivery'
  >
  name: string
}) {
  return (
    <PageContainer className="message-shell py-24 text-center">
      <CheckCircle2 size={54} strokeWidth={1.3} className="mx-auto text-primary" />
      <p className="eyebrow mt-8">Order request received</p>
      <h1 className="mt-3 font-serif text-5xl tracking-[-.05em]">
        Thank you, {name.trim().split(' ')[0]}.
      </h1>
      <p className="mt-5 text-sm leading-6 text-muted-foreground">
        Your order is saved. Payment status is confirmed by the server.
      </p>
      <div className="mt-5">
        <OrderStatusBadge status={receipt.status} paymentStatus={receipt.payment.status} />
        <PaymentStatus payment={receipt.payment} />
      </div>
      <Button asChild className="mt-5">
        <Link to={`/account/orders/${receipt.id}`}>View order details</Link>
      </Button>
      <Card className="mx-auto mt-9 max-w-md border-0 bg-muted text-left shadow-none">
        <CardContent className="p-7">
          <div className="flex justify-between pb-4 text-sm">
            <span>Order number</span>
            <strong>#{receipt.id.padStart(5, '0')}</strong>
          </div>
          <Separator className="bg-border" />
          {receipt.items.map((item) => (
            <div key={item.title} className="mt-4 flex justify-between gap-3 text-sm">
              <span>
                {item.quantity} × <span className="font-serif">{item.title}</span>
              </span>
              <span>{money(item.quantity * item.unitPriceCents)}</span>
            </div>
          ))}
          <DeliveryDetails {...receipt} />
        </CardContent>
      </Card>
      <Button
        asChild
        variant="ghost"
        className="mt-9 text-sm font-semibold text-primary hover:underline"
      >
        <Link to="/">
          Back to the shelves <ArrowRight size={16} />
        </Link>
      </Button>
    </PageContainer>
  )
}
