import AnimatedLoadingSkeleton from '@/components/ui/animated-loading-skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9F8] p-6">
      <AnimatedLoadingSkeleton />
    </div>
  );
}
