import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Initialize synchronously from the real viewport. The old undefined ->
  // useEffect pattern made a component that mounts-and-opens in the same
  // commit (e.g. the rep-details BottomSheet) render its desktop branch
  // first, then swap its framer-motion animate target before the entrance
  // animation ever started — the sheet stayed at opacity 0 and its overlay
  // ate every tap ("glitches out"). SPA only — no SSR reads window safely.
  const [isMobile, setIsMobile] = React.useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
