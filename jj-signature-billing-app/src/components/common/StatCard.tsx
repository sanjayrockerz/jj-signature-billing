import { Children, type ReactNode } from 'react'

export type StatCardProps = {
  label: ReactNode
  value: ReactNode
  helper?: ReactNode
  icon?: ReactNode
  color?: string
  bg?: string
  border?: string
  variant?: 'default' | 'gradient' | 'accent'
  className?: string
  iconClassName?: string
  labelClassName?: string
  helperClassName?: string
  valueClassName?: string
}

const gridColumns: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  7: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7',
  8: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export function StatCard({
  label,
  value,
  helper,
  icon,
  color = 'text-[#111111]',
  bg = 'bg-[#F9FAFB]',
  border = 'border-borderLight',
  variant = 'default',
  className = '',
  iconClassName = '',
  labelClassName = '',
  helperClassName = '',
  valueClassName = '',
}: StatCardProps) {
  const outerClass = variant === 'gradient'
    ? 'relative overflow-hidden rounded-2xl border p-4 shadow-sm'
    : `rounded-2xl border ${border} bg-white p-4 shadow-sm`

  return (
    <article className={`${outerClass} ${className}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`break-words text-[10px] font-black uppercase tracking-wider text-[#374151] ${labelClassName}`}>{label}</p>
          {helper && <p className={`mt-2 break-words text-[11px] font-semibold text-[#7A846F] ${helperClassName}`}>{helper}</p>}
          <p className={`mt-2 break-words text-[22px] font-black leading-tight text-[#111111] ${valueClassName}`}>{value}</p>
        </div>
        {icon && <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${bg} ${color} ${iconClassName}`}>{icon}</div>}
      </div>
    </article>
  )
}

type StatGridProps = {
  children?: ReactNode
  cards?: StatCardProps[]
  className?: string
}

export function StatGrid({ children, cards, className = '' }: StatGridProps) {
  const count = cards?.length ?? Children.count(children)
  const content = cards
    ? cards.map((card, index) => <StatCard key={`${String(card.label)}-${index}`} {...card} />)
    : children

  return <div className={`grid gap-3 ${gridColumns[count] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} ${className}`}>{content}</div>
}
