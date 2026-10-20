/** Small colour fingerprint of a picture, used to find which stocked fabric a swatch shows. */
const SIZE = 16

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image'))
    img.src = src
  })
}

export async function fingerprint(src: string): Promise<Float32Array | null> {
  try {
    const img = await load(src)
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // Centre crop to a square so different framing matters less
    const side = Math.min(img.width, img.height)
    const sx = (img.width - side) / 2
    const sy = (img.height - side) / 2
    ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE)
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE)
    const out = new Float32Array(SIZE * SIZE * 3)
    for (let i = 0, j = 0; i < data.length; i += 4) {
      out[j++] = data[i]
      out[j++] = data[i + 1]
      out[j++] = data[i + 2]
    }
    return out
  } catch {
    return null
  }
}

/** Root mean square colour difference, 0 (identical) to 255. */
export function distance(a: Float32Array, b: Float32Array): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum / a.length)
}

/** Picks the stocked fabric whose picture looks most like the swatch, or null if none is close. */
export async function matchFabric(
  swatch: string,
  fabrics: { id: string; prints: Float32Array }[],
  maxDistance = 55,
): Promise<string | null> {
  const mine = await fingerprint(swatch)
  if (!mine) return null
  let best: string | null = null
  let bestD = Infinity
  for (const f of fabrics) {
    const d = distance(mine, f.prints)
    if (d < bestD) {
      bestD = d
      best = f.id
    }
  }
  return bestD <= maxDistance ? best : null
}
