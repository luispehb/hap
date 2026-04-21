export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center flex-col gap-3">
      <p className="text-[32px] font-extrabold text-ink tracking-[-2px]">
        hap
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky ml-1 mb-2" />
      </p>
      <div className="w-5 h-5 border-2 border-sky border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
