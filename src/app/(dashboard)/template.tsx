/** Re-mounts on every navigation, so each page's blocks rise in (see .page-enter in globals.css). */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
