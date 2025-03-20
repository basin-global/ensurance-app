'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { isAppAdmin } from '@/config/admin'
import { usePrivy } from '@privy-io/react-auth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TableInfo {
  table_name: string;
  columns: string[];
  primary_key: string;
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
      const response = await fetch('/api/admin/export', {
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

  // When table is selected, automatically include its primary key
  useEffect(() => {
    if (selectedTable) {
      const tableInfo = tables.find(t => t.table_name === selectedTable)
      if (tableInfo) {
        setSelectedColumns([tableInfo.primary_key])
      }
    }
  }, [selectedTable, tables])

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
  if (!isAppAdmin(user?.wallet?.address)) {
    return <div className="p-8">Access denied</div>
  }

  const selectedTableInfo = selectedTable ? tables.find(t => t.table_name === selectedTable) : null

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Database Exports</h1>
      
      <div className="space-y-6">
        {/* Table Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-white">Select Table</label>
          <Select
            value={selectedTable}
            onValueChange={(value) => {
              setSelectedTable(value)
              // Primary key will be auto-selected by useEffect
              setSelectedColumns([])
            }}
          >
            <SelectTrigger className="w-full bg-gray-900 text-white border-gray-700">
              <SelectValue placeholder="Choose a table..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {tables.map(table => (
                <SelectItem 
                  key={table.table_name} 
                  value={table.table_name}
                  className="text-white hover:bg-gray-800"
                >
                  {table.table_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Column Selection */}
        {selectedTable && selectedTableInfo && (
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Select Columns</label>
            <div className="space-y-2 bg-gray-900 p-4 rounded-md border border-gray-700">
              {selectedTableInfo.columns.map(column => (
                <label 
                  key={column} 
                  className={`flex items-center ${column === selectedTableInfo.primary_key ? 'text-blue-400' : 'text-gray-200 hover:text-white'}`}
                >
                  <input
                    type="checkbox"
                    className="mr-2 accent-blue-500"
                    checked={selectedColumns.includes(column)}
                    disabled={column === selectedTableInfo.primary_key}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColumns([...selectedColumns, column])
                      } else {
                        setSelectedColumns(selectedColumns.filter(c => c !== column))
                      }
                    }}
                  />
                  {column}
                  {column === selectedTableInfo.primary_key && (
                    <span className="ml-2 text-xs text-blue-400">(Primary Key - Always included)</span>
                  )}
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