import type { TableProps } from './Table.types'

export function Table({ headers, children, caption }: TableProps) {
  return (
    <table className="ui-table">
      {caption ? <caption>{caption}</caption> : null}
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={index} scope="col">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}
