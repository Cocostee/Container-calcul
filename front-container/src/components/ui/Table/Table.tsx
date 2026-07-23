import type { TableProps } from './Table.types'

export function Table({ headers, children }: TableProps) {
  return (
    <table className="ui-table">
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={index}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}
