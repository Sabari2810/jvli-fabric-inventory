// Converts any picked image to a WebP data URL (base64) before it is stored.
const MAX_SIDE = 1200
const QUALITY = 0.8

export async function fileToWebpDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please pick an image file.')

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not read that image.'))
      el.src = url
    })

    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not process the image.')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/webp', QUALITY)
    if (!dataUrl.startsWith('data:image/webp')) {
      throw new Error('This browser cannot convert images to WebP.')
    }
    return dataUrl
  } finally {
    URL.revokeObjectURL(url)
  }
}
