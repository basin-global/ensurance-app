'use client';

export function ConvertModule() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-200">Convert Ensurance</h3>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Select Ensurance */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Ensurance Certificate
            </label>
            <select 
              className="w-full bg-gray-700 border-gray-600 rounded-md px-4 py-2 text-gray-200"
              disabled
            >
              <option>Select a certificate</option>
            </select>
          </div>

          {/* Conversion Rate Info */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Conversion Rate
            </label>
            <div className="bg-gray-700 rounded-md px-4 py-2 text-gray-200">
              Market Rate + 10% Incentive
            </div>
          </div>

          {/* Coming Soon Message */}
          <div className="text-center py-4">
            <p className="text-xl font-bold text-gray-400">Coming Soon</p>
            <p className="text-gray-500 text-sm">Conversion functionality will be available in the next update</p>
          </div>
        </div>

        {/* Coming Soon Button */}
        <button 
          disabled
          className="w-full bg-blue-600 text-white p-3 rounded-lg text-lg font-semibold cursor-not-allowed text-center mt-6 hover:bg-blue-700 disabled:bg-blue-600/50"
        >
          CONVERT
        </button>
      </div>
    </div>
  );
} 