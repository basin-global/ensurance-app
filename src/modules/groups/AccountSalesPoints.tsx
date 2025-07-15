'use client'

import { CheckCircle, User, Zap, Bot, Leaf } from 'lucide-react'

interface AccountSalesPointsProps {
  groupName: string
}

export function AccountSalesPoints({ groupName }: AccountSalesPointsProps) {
  return (
    <div id="learn-more" className="max-w-4xl mx-auto py-12 space-y-10">
      
      {/* Core Value Proposition */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-mono text-white">three ways to operate your account</h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          swap and send all types of value. build aum 24/7. your agent account represents you in natural capital markets.
        </p>
      </div>

      {/* Three Agent Modes */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 text-center">
          <User className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <h3 className="text-xl font-mono text-white mb-2">manual</h3>
          <p className="text-gray-400 text-sm">you control every action. sign transactions, manage assets, make decisions.</p>
        </div>

        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 text-center">
          <Zap className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <h3 className="text-xl font-mono text-white mb-2">automated</h3>
          <p className="text-gray-400 text-sm">set rules and programs. automatic swaps, rewards, and value transfers.</p>
        </div>

        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 text-center">
          <Bot className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <h3 className="text-xl font-mono text-white mb-2">autonomous</h3>
          <p className="text-gray-400 text-sm">ai agent with any llm. builds aum 24/7, trades, and manages your portfolio.</p>
        </div>
      </div>

      {/* Fund Distribution */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-mono text-white mb-2">your purchase funds nature</h3>
          <p className="text-gray-400">every account created directly supports ecosystem protection and restoration.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-mono text-blue-400 mb-2">50%</div>
            <div className="text-white font-mono mb-1">.{groupName} group</div>
            <div className="text-sm text-gray-400">community infrastructure</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-mono text-green-400 mb-2">40%</div>
            <div className="text-white font-mono mb-1">nature protection</div>
            <div className="text-sm text-gray-400">ecosystem restoration</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-mono text-purple-400 mb-2">10%</div>
            <div className="text-white font-mono mb-1">protocol development</div>
            <div className="text-sm text-gray-400">continuous improvement</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-400">
          <Leaf className="w-4 h-4 text-green-400" />
          <span>transforming risk into resilience through natural capital investment</span>
        </div>
      </div>

      {/* Trust Elements */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-600 p-6">
        <h3 className="text-xl font-mono text-white mb-6 text-center">full ai agent capabilities</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-white font-mono">any llm model</div>
                <div className="text-sm text-gray-400">gpt-4, claude, llama, or custom models</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-white font-mono">self-custody</div>
                <div className="text-sm text-gray-400">you control your account and assets</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-white font-mono">24/7 operation</div>
                <div className="text-sm text-gray-400">continuous trading and portfolio management</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-white font-mono">own forever</div>
                <div className="text-sm text-gray-400">no renewal fees or subscriptions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 