// Reusable Skeleton Loader Components

export default function SkeletonLoader({ className = "", height = "h-4", width = "w-full" }) {
    return (
        <div className={`bg-gray-200 animate-pulse rounded ${height} ${width} ${className}`}></div>
    );
}

export function SkeletonApprovalItem() {
    return (
        <div className="p-4 border-b border-gray-100 animate-pulse">
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <SkeletonLoader height="h-4" width="w-3/4" className="mb-1" />
                    <SkeletonLoader height="h-3" width="w-1/2" />
                </div>
                <SkeletonLoader height="h-6" width="w-16" />
            </div>
            <SkeletonLoader height="h-3" width="w-1/4" className="mb-2" />
            <div className="flex items-center justify-between">
                <SkeletonLoader height="h-3" width="w-1/3" />
                <SkeletonLoader height="h-5" width="w-12" />
            </div>
        </div>
    );
}

export function SkeletonRequestEvaluationDetail() {
    return (
        <div className="p-6 animate-pulse">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <SkeletonLoader height="h-8" width="w-1/2" className="mb-2" />
                        <div className="flex items-center gap-3">
                            <SkeletonLoader height="h-6" width="w-24" />
                            <SkeletonLoader height="h-4" width="w-32" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6 border border-blue-200">
                <SkeletonLoader height="h-5" width="w-40" className="mb-3" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Array(5).fill().map((_, i) => (
                        <div key={i}>
                            <SkeletonLoader height="h-3" width="w-20" className="mb-1" />
                            <SkeletonLoader height="h-4" width="w-24" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Remarks */}
            <div className="mb-6">
                <SkeletonLoader height="h-5" width="w-16" className="mb-3" />
                <SkeletonLoader height="h-20" width="w-full" />
            </div>

            {/* Items Table */}
            <div className="mb-6">
                <SkeletonLoader height="h-5" width="w-24" className="mb-3" />
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <div className="bg-gray-100 border-b border-gray-200 p-3">
                        <div className="flex gap-4">
                            {Array(7).fill().map((_, i) => (
                                <SkeletonLoader key={i} height="h-4" width="w-20" />
                            ))}
                        </div>
                    </div>
                    {Array(3).fill().map((_, i) => (
                        <div key={i} className="border-b border-gray-200 p-3">
                            <div className="flex gap-4">
                                {Array(7).fill().map((_, j) => (
                                    <SkeletonLoader key={j} height="h-4" width="w-16" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
                <SkeletonLoader height="h-12" width="w-1/2" />
                <SkeletonLoader height="h-12" width="w-1/2" />
            </div>
        </div>
    );
}

export function SkeletonUserApprovalDetail() {
    return (
        <div className="p-6 animate-pulse">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <SkeletonLoader height="h-8" width="w-1/2" className="mb-2" />
                        <div className="flex items-center gap-3">
                            <SkeletonLoader height="h-6" width="w-24" />
                            <SkeletonLoader height="h-4" width="w-32" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Requester Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6 border border-blue-200">
                <SkeletonLoader height="h-5" width="w-40" className="mb-3" />
                <div className="grid grid-cols-2 gap-4">
                    {Array(7).fill().map((_, i) => (
                        <div key={i}>
                            <SkeletonLoader height="h-3" width="w-20" className="mb-1" />
                            <SkeletonLoader height="h-4" width="w-24" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Description */}
            <div className="mb-6">
                <SkeletonLoader height="h-5" width="w-24" className="mb-3" />
                <SkeletonLoader height="h-20" width="w-full" />
            </div>

            {/* Attachments */}
            <div className="mb-6">
                <SkeletonLoader height="h-5" width="w-20" className="mb-3" />
                <div className="space-y-2">
                    {Array(2).fill().map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <SkeletonLoader height="h-5" width="w-5" />
                            <div className="flex-1">
                                <SkeletonLoader height="h-4" width="w-1/3" className="mb-1" />
                                <SkeletonLoader height="h-3" width="w-1/4" />
                            </div>
                            <SkeletonLoader height="h-5" width="w-5" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
                <SkeletonLoader height="h-12" width="w-1/2" />
                <SkeletonLoader height="h-12" width="w-1/2" />
            </div>
        </div>
    );
}

export function SkeletonUserAccountsDetail() {
    return (
        <div className="p-6 animate-pulse">
            {/* Profile Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <SkeletonLoader height="h-6" width="w-32" />
                    <SkeletonLoader height="h-8" width="w-20" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array(5).fill().map((_, i) => (
                        <div key={i}>
                            <SkeletonLoader height="h-3" width="w-16" className="mb-1" />
                            <SkeletonLoader height="h-5" width="w-3/4" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Password Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <SkeletonLoader height="h-6" width="w-24" />
                    <SkeletonLoader height="h-8" width="w-24" />
                </div>
                <div className="space-y-4">
                    <div>
                        <SkeletonLoader height="h-3" width="w-20" className="mb-1" />
                        <SkeletonLoader height="h-10" width="w-full" />
                    </div>
                    <SkeletonLoader height="h-10" width="w-32" />
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <SkeletonLoader height="h-10" width="w-1/2" />
            </div>
        </div>
    );
}
