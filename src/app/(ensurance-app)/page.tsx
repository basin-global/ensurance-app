export default function Home() {
  const sampleConversation = [
    {
      role: "assistant",
      content: "What natural assets can I help you ensure today? I specialize in protecting forests, watersheds, biodiversity, and carbon sinks."
    },
    {
      role: "user",
      content: "I have a forest I'd like to protect"
    },
    {
      role: "assistant", 
      content: "That's great! Forests are critical ecosystems. Could you tell me more about your forest - its location, size, and the types of trees and wildlife present?"
    },
    {
      role: "user",
      content: "It's a 100 acre forest in California with redwoods and diverse wildlife"
    },
    {
      role: "assistant",
      content: "A redwood forest in California - those are incredibly valuable ecosystems! They store massive amounts of carbon, support biodiversity, and provide essential watershed services. I'd love to help ensure its protection. Ensurance agents coming soon!"
    }
  ];

  return (
    <main className="p-4 max-w-2xl mx-auto">
      <h1 className="text-3xl mb-8">
        <span className="font-grotesk">ensurance</span>
        <span className="font-mono">.app</span>
      </h1>
      
      <div className="space-y-4">
        {sampleConversation.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg max-w-[80%] ${
              message.role === 'user' ? 'bg-blue-900' : 'bg-gray-800'
            }`}>
              <p className={`${
                message.role === 'user' ? 'font-grotesk text-blue-100' : 'font-mono text-gray-100'
              }`}>
                {message.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
