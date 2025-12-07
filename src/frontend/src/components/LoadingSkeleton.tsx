import Logo from './Logo';

export const StatCardSkeleton = () => (
  <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 animate-pulse">
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-lg"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-12"></div>
      </div>
    </div>
  </div>
);

export const MeetingCardSkeleton = () => (
  <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="w-20 h-8 bg-gray-200 rounded-lg"></div>
    </div>
    <div className="flex items-center gap-4 text-sm">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </div>
  </div>
);

export const InsightCardSkeleton = () => (
  <div className="bg-gradient-to-br from-teal-50 to-teal-50 rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 animate-pulse border-2 border-teal-200">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-teal-200 rounded w-48"></div>
      <div className="w-10 h-10 bg-teal-200 rounded-full"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-teal-200 rounded w-full"></div>
      <div className="h-4 bg-teal-200 rounded w-5/6"></div>
      <div className="h-4 bg-teal-200 rounded w-4/6"></div>
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-teal-50 via-teal-50 to-pink-50">
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="opacity-50 animate-pulse">
            <Logo size="sm" />
          </div>
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
      </div>
    </header>

    <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-6 sm:mb-8">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Director's Insights */}
      <div className="mb-6 sm:mb-8">
        <InsightCardSkeleton />
      </div>

      {/* Meetings Section */}
      <div className="mb-6 sm:mb-8">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
        <div className="space-y-4">
          <MeetingCardSkeleton />
          <MeetingCardSkeleton />
        </div>
      </div>
    </main>
  </div>
);

