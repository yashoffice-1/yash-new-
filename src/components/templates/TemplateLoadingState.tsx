
export function TemplateLoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 animate-pulse">
          <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}
