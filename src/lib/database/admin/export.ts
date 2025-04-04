import { accounts } from '../accounts'
import { groups } from '../groups'
import { sql } from '@vercel/postgres'

export interface TableInfo {
  table_name: string
  columns: string[]
  primary_key: string
}

// Get list of tables and their columns that are available for export
export async function getExportableTables(): Promise<TableInfo[]> {
  const tables: TableInfo[] = [
    {
      table_name: 'groups',
      primary_key: 'group_name',
      columns: ['group_name', 'name_front', 'tagline', 'description', 'email', 'website', 'chat', 'situs_account', 'contract_address', 'total_supply']
    }
  ]

  // Get all tables from our schemas
  const { rows: allTables } = await sql`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('agents', 'binder', 'certificates', 'market', 'members', 'proceeds', 'syndicates')
    AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `

  // For each table, get its columns
  for (const { table_schema, table_name } of allTables) {
    // Skip groups since we handle it separately
    if (table_schema === 'members' && table_name === 'groups') continue

    // Get columns for this table
    const { rows: columns } = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = ${table_schema}
      AND table_name = ${table_name}
      ORDER BY ordinal_position
    `
    
    tables.push({
      table_name: `${table_schema}.${table_name}`,
      primary_key: table_name.startsWith('accounts_') ? 'token_id' : columns[0]?.column_name,
      columns: columns.map(col => col.column_name)
    })
  }

  return tables
}

// Export table data based on selected columns
export async function exportTableData(table: string, columns: string[]): Promise<any[]> {
  // Handle schema-qualified table names
  const [schema, tableName] = table.includes('.') ? table.split('.') : ['members', table]

  // Special handling for groups
  if (schema === 'members' && tableName === 'groups') {
    return await groups.getAll(true) // Include inactive groups
  }

  // For all other tables, use dynamic SQL
  const columnsStr = columns.map(c => `"${c}"`).join(', ')
  const schemaTable = `"${schema}"."${tableName}"`
  
  // Execute the query
  const result = await sql.query(
    `SELECT ${columnsStr} FROM ${schemaTable} ORDER BY ${columns[0]}`
  )
  return result.rows
} 