export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} onchain agents
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            {/* Add footer links here later */}
          </div>
        </div>
      </div>
    </footer>
  )
} 