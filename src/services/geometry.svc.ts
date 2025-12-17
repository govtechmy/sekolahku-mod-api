import { type EntitiSekolah } from '@types'

export function calculateLocationCenter(coordinates: unknown[]) {
  let totalLon: number = 0
  let totalLat: number = 0
  let count: number = 0
  let minLat: number = Infinity
  let maxLat: number = -Infinity
  let minLon: number = Infinity
  let maxLon: number = -Infinity

  function processCoords(coords: unknown[]): void {
    for (const coord of coords) {
      if (Array.isArray(coord)) {
        if (Array.isArray(coord[0])) {
          // It's a ring or polygon
          processCoords(coord as unknown[])
        } else {
          // It's a point [lon, lat]
          const lon = coord[0] as number
          const lat = coord[1] as number
          totalLon += lon
          totalLat += lat
          count++
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
          if (lon < minLon) minLon = lon
          if (lon > maxLon) maxLon = lon
        }
      }
    }
  }

  processCoords(coordinates)

  const centerLon: number = totalLon / count
  const centerLat: number = totalLat / count

  // Calculate zoom level
  const latDiff = maxLat - minLat
  const lonDiff = maxLon - minLon
  const maxDiff = Math.max(latDiff, lonDiff * Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180)))
  let zoom = 20
  if (maxDiff > 0.000001) {
    zoom = Math.floor(Math.log2(360 / maxDiff)) - 1
  }
  zoom = Math.max(0, Math.min(20, zoom))

  return { center: [centerLon, centerLat], zoom }
}

export function returnWithinRadius(schools: EntitiSekolah[], longitude: number, latitude: number, radiusInMeter: number) {
  const earthRadius = 6371000
  const toRadians = (deg: number) => (deg * Math.PI) / 180

  return schools.filter(school => {
    const coordinates = school.data.infoLokasi.location?.coordinates
    if (!Array.isArray(coordinates) || coordinates.length < 2) return false
    const [lon, lat] = coordinates
    if (typeof lon !== 'number' || typeof lat !== 'number') return false

    const dLat = toRadians(lat - latitude)
    const dLon = toRadians(lon - longitude)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(latitude)) * Math.cos(toRadians(lat)) * Math.sin(dLon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = earthRadius * c

    return distance <= radiusInMeter
  })
}

export function getRadiusFromZoom(zoom: number, latitude: number): number {
  const earthCircumference = 40075016.686

  // At zoom level 0, the entire world is visible (256 pixels)
  // Each zoom level doubles the resolution
  // The formula accounts for latitude distortion (Mercator projection)
  const metersPerPixel = (earthCircumference * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom + 8)

  // Assuming a typical viewport width of ~500 pixels for visible radius
  // Adjust this multiplier based on your map container size
  const viewportPixels = 500

  return metersPerPixel * viewportPixels
}

export function getZoomFromRadius(radiusInMeter: number, latitude: number): number {
  const earthCircumference = 40075016.686

  // Estimate meters per pixel based on desired radius
  const desiredMetersPerPixel = radiusInMeter / (500 * 2) // Assuming 500 pixels viewport width

  // Calculate zoom level
  const zoom = Math.log2((earthCircumference * Math.cos((latitude * Math.PI) / 180)) / desiredMetersPerPixel) - 8

  return Math.max(0, Math.min(20, Math.round(zoom)))
}
