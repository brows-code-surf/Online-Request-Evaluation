import { RouteGuard } from '../../utils/routeGuard';

export default function MainLayout({ children }) {
  return (
    <RouteGuard>
      {children}
    </RouteGuard>
  );
}
