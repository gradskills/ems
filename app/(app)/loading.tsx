import { PageSkeleton } from "@/components/ui/skeleton";

// Suspense fallback for app routes — renders inside the Shell layout so the
// sidebar/topbar stay put and only the content area shows a skeleton.
export default function AppLoading() {
  return <PageSkeleton />;
}
