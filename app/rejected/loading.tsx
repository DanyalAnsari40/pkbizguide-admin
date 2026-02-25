export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-56 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-80 bg-gray-200 rounded"></div>
        </div>
        <div className="h-8 w-28 bg-red-200 rounded"></div>
      </div>

      <div className="border rounded-lg p-4">
        <div className="h-5 w-56 bg-gray-200 rounded mb-1"></div>
        <div className="h-4 w-80 bg-gray-200 rounded mb-4"></div>
        <div className="flex gap-4">
          <div className="flex-1 h-10 bg-gray-200 rounded"></div>
          <div className="w-32 h-10 bg-gray-200 rounded"></div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
            <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
            <div className="h-24 w-full bg-gray-200 rounded"></div>
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-gray-200 rounded"></div>
              <div className="h-8 w-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
