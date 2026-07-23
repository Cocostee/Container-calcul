import type { ReactNode } from 'react'

export interface TableProps {
  headers: ReactNode[]
  children: ReactNode
  caption?: string
}
