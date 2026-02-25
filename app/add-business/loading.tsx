export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-gray-200 rounded"></div>
      <div className="border rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
          <div className="h-6 w-64 bg-blue-400/40 rounded mb-2"></div>
          <div className="h-4 w-80 bg-blue-400/30 rounded"></div>
          <div className="mt-4 h-2 w-1/2 bg-blue-400/30 rounded"></div>
        </div>
        <div className="p-6 space-y-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-40 bg-gray-200 rounded"></div>
              <div className="h-12 w-full bg-gray-200 rounded"></div>
            </div>
          ))}
          <div className="h-12 w-full bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}
