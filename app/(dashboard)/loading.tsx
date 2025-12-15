export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        {/* Premium loader with rotating gradient ring */}
        <div className="relative w-16 h-16">
          {/* Outer rotating gradient ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-accent to-primary animate-spin"
               style={{ animationDuration: '1.5s' }}>
            <div className="absolute inset-1 rounded-full bg-background"></div>
          </div>

          {/* Inner pulsing dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
          </div>
        </div>

        {/* Loading text with fade animation */}
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  )
}
