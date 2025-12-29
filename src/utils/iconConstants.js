// Icon constants for system modules
// Each icon represents a category or function
import {
  ChartBarIcon,
  HomeIcon,
  Squares2X2Icon,
  UsersIcon,
  UserIcon,
  UserGroupIcon,
  UserPlusIcon,
  CheckBadgeIcon,
  IdentificationIcon,
  DocumentIcon,
  DocumentTextIcon,
  FolderIcon,
  ClipboardIcon,
  QueueListIcon,
  ChatBubbleLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  ReceiptRefundIcon,
  Bars3Icon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  PresentationChartBarIcon,
  CogIcon,
  AdjustmentsVerticalIcon,
  WrenchScrewdriverIcon,
  KeyIcon,
  ServerIcon,
  CircleStackIcon,
  CodeBracketIcon,
  CommandLineIcon,
  CpuChipIcon,
  CalendarIcon,
  ClockIcon,
  CalendarDaysIcon,
  StarIcon,
  HeartIcon,
  FlagIcon,
  TagIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';

export const MODULE_ICONS = [
  // Navigation & Layout
  { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon, category: 'Navigation' },
  { id: 'home', name: 'Home', icon: HomeIcon, category: 'Navigation' },
  { id: 'menu', name: 'Menu', icon: Bars3Icon, category: 'Navigation' },
  { id: 'sidebar', name: 'Sidebar', icon: Squares2X2Icon, category: 'Navigation' },

  // User Management
  { id: 'users', name: 'Users', icon: UsersIcon, category: 'User Management' },
  { id: 'user', name: 'User', icon: UserIcon, category: 'User Management' },
  { id: 'user-check', name: 'User Check', icon: CheckBadgeIcon, category: 'User Management' },
  { id: 'user-group', name: 'User Group', icon: UserGroupIcon, category: 'User Management' },
  { id: 'user-plus', name: 'Add User', icon: UserPlusIcon, category: 'User Management' },
  { id: 'identification', name: 'Identification', icon: IdentificationIcon, category: 'User Management' },

  // Content & Data
  { id: 'document', name: 'Document', icon: DocumentIcon, category: 'Content' },
  { id: 'documents', name: 'Documents', icon: DocumentTextIcon, category: 'Content' },
  { id: 'folder', name: 'Folder', icon: FolderIcon, category: 'Content' },
  { id: 'clipboard', name: 'Clipboard', icon: ClipboardIcon, category: 'Content' },
  { id: 'clipboard-list', name: 'Task List', icon: QueueListIcon, category: 'Content' },

  // Communication
  { id: 'chat', name: 'Chat', icon: ChatBubbleLeftIcon, category: 'Communication' },
  { id: 'mail', name: 'Mail', icon: EnvelopeIcon, category: 'Communication' },
  { id: 'phone', name: 'Phone', icon: PhoneIcon, category: 'Communication' },
  { id: 'bell', name: 'Notifications', icon: BellIcon, category: 'Communication' },
  { id: 'support', name: 'Support', icon: QuestionMarkCircleIcon, category: 'Communication' },

  // Business & Finance
  { id: 'briefcase', name: 'Business', icon: BriefcaseIcon, category: 'Business' },
  { id: 'cash', name: 'Finance', icon: CurrencyDollarIcon, category: 'Business' },
  { id: 'credit-card', name: 'Payments', icon: CreditCardIcon, category: 'Business' },
  { id: 'shopping-cart', name: 'Shopping', icon: ShoppingCartIcon, category: 'Business' },
  { id: 'receipt', name: 'Receipts', icon: ReceiptRefundIcon, category: 'Business' },

  // Analytics & Reports
  { id: 'chart', name: 'Charts', icon: Bars3Icon, category: 'Analytics' },
  { id: 'analytics', name: 'Analytics', icon: ChartPieIcon, category: 'Analytics' },
  { id: 'trending-up', name: 'Trending', icon: ArrowTrendingUpIcon, category: 'Analytics' },
  { id: 'presentation', name: 'Reports', icon: PresentationChartBarIcon, category: 'Analytics' },

  // Settings & Configuration
  { id: 'settings', name: 'Settings', icon: CogIcon, category: 'Settings' },
  { id: 'adjustments', name: 'Adjustments', icon: AdjustmentsVerticalIcon, category: 'Settings' },
  { id: 'wrench', name: 'Tools', icon: WrenchScrewdriverIcon, category: 'Settings' },
  { id: 'key', name: 'Security', icon: KeyIcon, category: 'Settings' },

  // System & Technical
  { id: 'server', name: 'Server', icon: ServerIcon, category: 'Technical' },
  { id: 'database', name: 'Database', icon: CircleStackIcon, category: 'Technical' },
  { id: 'code', name: 'Code', icon: CodeBracketIcon, category: 'Technical' },
  { id: 'terminal', name: 'Terminal', icon: CommandLineIcon, category: 'Technical' },
  { id: 'chip', name: 'Hardware', icon: CpuChipIcon, category: 'Technical' },

  // Time & Scheduling
  { id: 'calendar', name: 'Calendar', icon: CalendarIcon, category: 'Time' },
  { id: 'clock', name: 'Clock', icon: ClockIcon, category: 'Time' },
  { id: 'time', name: 'Time', icon: ClockIcon, category: 'Time' },
  { id: 'schedule', name: 'Schedule', icon: CalendarDaysIcon, category: 'Time' },

  // General Purpose
  { id: 'star', name: 'Star', icon: StarIcon, category: 'General' },
  { id: 'heart', name: 'Heart', icon: HeartIcon, category: 'General' },
  { id: 'flag', name: 'Flag', icon: FlagIcon, category: 'General' },
  { id: 'tag', name: 'Tag', icon: TagIcon, category: 'General' },
  { id: 'bookmark', name: 'Bookmark', icon: BookmarkIcon, category: 'General' }
];

// Helper function to get icon by ID
export function getIconById(iconId) {
  return MODULE_ICONS.find(icon => icon.id === iconId) || MODULE_ICONS[0];
}

// Helper function to get icons by category
export function getIconsByCategory(category) {
  return MODULE_ICONS.filter(icon => icon.category === category);
}

// Helper function to get all categories
export function getCategories() {
  const categories = [...new Set(MODULE_ICONS.map(icon => icon.category))];
  return categories.sort();
}

// Default icon
export const DEFAULT_ICON = 'document';
