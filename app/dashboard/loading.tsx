export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-40 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-72 bg-gray-200 rounded"></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </div>
            <div className="h-7 w-16 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 w-28 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
      <div className="border rounded-lg p-4">
        <div className="h-5 w-36 bg-gray-200 rounded mb-1"></div>
        <div className="h-4 w-80 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-2 h-2 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded"></div>
                <div className="h-3 w-64 bg-gray-200 rounded"></div>
              </div>
              <div className="h-3 w-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
