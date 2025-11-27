export default function SideNotchOpenLeftPanel({ sidebarOpen, setSidebarOpen }) {
    return (
        <>
            {!sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="
                        md:hidden
                        fixed top-1/2 left-0 -translate-y-1/2
                        z-50
                        w-5 h-20
                        bg-blue-600 hover:bg-blue-700
                        text-white
                        flex items-center justify-center
                        rounded-r-2xl
                        shadow-lg
                        active:scale-95
                        transition-all duration-300
                    "
                    title="Click to open"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}
        </>
    );
}
