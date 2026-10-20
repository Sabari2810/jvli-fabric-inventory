import { useEffect, useState, type CSSProperties } from 'react'

/**
 * On phones the on-screen keyboard shrinks the visual viewport but not the layout viewport,
 * so a bottom sheet pinned to the layout viewport ends up behind or above the keyboard.
 * This returns a style that makes a fixed overlay match what is actually visible.
 * It also stops the page behind the sheet from scrolling while the sheet is open.
 */
export function useVisualViewport(active: boolean): {
  overlay: CSSProperties | undefined
  /** Gap between the bottom of the visible area and the bottom of the layout viewport, in px. */
  inset: number
  /** Visible height in px, or 0 when unknown. */
  height: number
} {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null)

  useEffect(() => {
    if (!active) return
    const phone = window.matchMedia('(max-width: 767px)').matches
    if (!phone) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // iOS draws the page through the translucent keyboard. While a field is focused, hide the
    // page behind the sheet so nothing from it shows there (see .sheet-keyboard in index.css).
    const root = document.documentElement
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
    let timer: number | undefined
    const onIn = (e: FocusEvent) => {
      if (!isField(e.target)) return
      window.clearTimeout(timer)
      root.classList.add('sheet-keyboard')
    }
    const onOut = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (!isField(document.activeElement)) root.classList.remove('sheet-keyboard')
      }, 120)
    }
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)

    const vv = window.visualViewport
    function update() {
      if (!vv) return
      setBox({ top: vv.offsetTop, height: vv.height })
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('focusin', onIn)
      document.removeEventListener('focusout', onOut)
      window.clearTimeout(timer)
      root.classList.remove('sheet-keyboard')
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      setBox(null)
    }
  }, [active])

  if (!active || !box) return { overlay: undefined, inset: 0, height: 0 }
  return {
    overlay: { top: box.top, height: box.height, bottom: 'auto' },
    inset: Math.max(0, window.innerHeight - (box.top + box.height)),
    height: box.height,
  }
}
