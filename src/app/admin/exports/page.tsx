'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { isAdmin } from '@/config/admin'
import { usePrivy } from '@privy-io/react-auth'

interface TableInfo {
  table_name: string;
  columns: string[];
}

export default function ExportsPage() {
  const { user } = usePrivy()
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch available tables
    const fetchTables = async () => {
      const response = await fetch('/api/admin/tables', {
        headers: {
          'x-address': user?.wallet?.address || ''
        }
      })
      const data = await response.json()
      setTables(data)
    }

    if (user?.wallet?.address) {
      fetchTables()
    }
  }, [user?.wallet?.address])

  const handleExport = async () => {
    if (!selectedTable || selectedColumns.length === 0) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-address': user?.wallet?.address || ''
        },
        body: JSON.stringify({
          table: selectedTable,
          columns: selectedColumns,
        }),
      })
      
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedTable}-export.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Only show page to admins
  if (!isAdmin(user?.wallet?.address)) {
    return <div className="p-8">Access denied</div>
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Database Exports</h1>
      
      <div className="space-y-6">
        {/* Table Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Table</label>
          <select 
            className="w-full p-2 border rounded bg-background-light dark:bg-background-dark"
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value)
              setSelectedColumns([])
            }}
          >
            <option value="">Choose a table...</option>
            {tables.map(table => (
              <option key={table.table_name} value={table.table_name}>
                {table.table_name}
              </option>
            ))}
          </select>
        </div>

        {/* Column Selection */}
        {selectedTable && (
          <div>
            <label className="block text-sm font-medium mb-2">Select Columns</label>
            <div className="space-y-2">
              {tables
                .find(t => t.table_name === selectedTable)
                ?.columns.map(column => (
                  <label key={column} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectedColumns.includes(column)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedColumns([...selectedColumns, column])
                        } else {
                          setSelectedColumns(selectedColumns.filter(c => c !== column))
                        }
                      }}
                    />
                    {column}
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* Export Button */}
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          onClick={handleExport}
          disabled={loading || !selectedTable || selectedColumns.length === 0}
        >
          {loading ? 'Exporting...' : 'Export to CSV'}
        </button>
      </div>
    </div>
  )
} 