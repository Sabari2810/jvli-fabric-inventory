import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { fileToWebpDataUrl } from '../lib/image'
import { Icon, dangerLink, subtleButton } from './ui'

/** Photo picker that converts to WebP, and also accepts a pasted image while `active`. */
export function PhotoField({
  value,
  onChange,
  onError,
  active,
  onBusy,
}: {
  value: string | null
  onChange: (v: string | null) => void
  onError: (message: string | null) => void
  active: boolean
  onBusy?: (busy: boolean) => void
}) {
  const [converting, setConverting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    onError(null)
    setConverting(true)
    onBusy?.(true)
    try {
      onChange(await fileToWebpDataUrl(file))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not read that image.')
    } finally {
      setConverting(false)
      onBusy?.(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const latest = useRef(handleFile)
  latest.current = handleFile

  useEffect(() => {
    if (!active) return
    function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? [])
      const item = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (!file) return
      e.preventDefault()
      void latest.current(file)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [active])

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-stone-700">Photo</span>
      <div className="flex items-center gap-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
        {value ? (
          <img src={value} alt="Fabric preview" className="h-20 w-20 rounded-lg object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white text-stone-400">
            <Icon name="image" className="h-8 w-8" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="sr-only" id="fabric-photo" />
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="fabric-photo" className={`${subtleButton} cursor-pointer`}>
              {value ? 'Change photo' : 'Choose photo'}
            </label>
            {value ? (
              <button type="button" className={dangerLink} onClick={() => onChange(null)}>
                Remove
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {converting ? 'Converting to WebP' : 'Or paste an image with Ctrl+V (Cmd+V on Mac).'}
          </p>
        </div>
      </div>
    </div>
  )
}
