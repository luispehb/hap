interface PendingProfile {
  has_invite?: boolean
  mindset_approved?: boolean | null
  mindset_answer?: string | null
}

export function PendingApprovalBanner({ profile }: { profile: PendingProfile }) {
  const shouldShow =
    profile.has_invite === false &&
    profile.mindset_approved === null &&
    !!profile.mindset_answer

  if (!shouldShow) return null

  return (
    <div className="mx-4 mt-4 bg-[#EAE6DF] rounded-2xl px-4 py-3">
      <p className="text-[#B0AA9E] text-xs leading-relaxed">
        Tu perfil está en revisión. Puedes explorar Hap — algunas funciones se activarán pronto.
      </p>
    </div>
  )
}
