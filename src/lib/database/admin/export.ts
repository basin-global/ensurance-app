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

  // Get all accounts_* tables from schema
  const { rows: accountTables } = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'members' 
    AND table_name LIKE 'accounts_%'
    ORDER BY table_name
  `

  // For each accounts table, get its columns
  for (const { table_name } of accountTables) {
    // Get columns for this table
    const { rows: columns } = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'members'
      AND table_name = ${table_name}
      ORDER BY ordinal_position
    `
    
    tables.push({
      table_name,
      primary_key: 'token_id',
      columns: columns.map(col => col.column_name)
    })
  }

  return tables
}

// Export table data based on selected columns
export async function exportTableData(table: string, columns: string[]): Promise<any[]> {
  // Validate table name and columns
  const tables = await getExportableTables()
  const tableInfo = tables.find(t => t.table_name === table)
  
  if (!tableInfo) {
    throw new Error('Invalid table name')
  }

  // Ensure primary key is included in columns
  if (!columns.includes(tableInfo.primary_key)) {
    columns = [tableInfo.primary_key, ...columns]
  }

  // Validate all requested columns exist in table
  const invalidColumns = columns.filter(col => !tableInfo.columns.includes(col))
  if (invalidColumns.length > 0) {
    throw new Error(`Invalid columns: ${invalidColumns.join(', ')}`)
  }

  // Get data using our existing database functions
  let data: any[] = []
  
  if (table === 'groups') {
    data = await groups.getAll(true) // Include inactive groups
  } else if (table.startsWith('accounts_')) {
    // Build the query parts safely
    const columnsStr = columns.map(c => `"${c}"`).join(', ')
    const schemaTable = `"members"."${table}"`
    
    // Execute the query
    const result = await sql.query(
      `SELECT ${columnsStr} FROM ${schemaTable} ORDER BY token_id`
    )
    data = result.rows
  }

  return data
} 