import type { ComponentProps } from 'react'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { cn } from '../../lib/utils'

export function IconAction({
  label,
  tooltip = label,
  workspace = false,
  className,
  variant = 'ghost',
  ...props
}: ComponentProps<typeof Button> & {
  label: string
  tooltip?: string
  workspace?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={variant}
          aria-label={label}
          className={cn(
            'icon-action min-h-11 min-w-11 shrink-0 rounded-md p-2.5 [&_svg]:size-5',
            className,
          )}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent className={workspace ? 'admin-workspace' : undefined} sideOffset={6}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
