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
