export function initialsForName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return parts.length ? parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('') : 'F'
}

/**
 * Reads an image file and returns a downscaled JPEG data URL.
 * Keeps profile photos small enough to live in local storage.
 */
export function resizeImageFile(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('decode'))
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) return reject(new Error('canvas'))
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
