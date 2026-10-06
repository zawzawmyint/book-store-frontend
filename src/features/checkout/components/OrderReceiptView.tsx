import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../../app/components/PageContainer'
import { money } from '../../../lib/format'
import type { PlaceOrderMutation } from '../../../generated/graphql'
import { Button } from '../../../app/components/ui/button'
import { Card, CardContent } from '../../../app/components/ui/card'
import { Separator } from '../../../app/components/ui/separator'

export function OrderReceiptView({
  receipt,
  name,
}: {
  receipt: PlaceOrderMutation['placeOrder']
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
        Your order request is saved. No payment was collected.
      </p>
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
          <Separator className="mt-5 bg-border" />
          <div className="flex justify-between pt-4 font-semibold">
            <span>Total</span>
            <span>{money(receipt.totalCents)}</span>
          </div>
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
