// 20 & 1155 ????

// tbd

export default function MarketPage() {
  return (
    <div className="flex flex-col items-center justify-start pt-20 pb-20 p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Market Coming Soon</h1>
      <p className="mb-4">Currently, you can find General Ensurance on</p>
      <a 
        href="https://zora.co/@ensurance" 
        className="text-blue-500 hover:text-blue-700 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Zora
      </a>
      <p className="mt-4">Stay tuned for our integrated marketplace!</p>
    </div>
  );
}