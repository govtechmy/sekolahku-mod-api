export function calculateLocationCenter(coordinates: unknown[]) {
  let totalLon: number = 0
  let totalLat: number = 0
  let count: number = 0

  function processCoords(coords: unknown[]): void {
    for (const coord of coords) {
      if (Array.isArray(coord)) {
        if (Array.isArray(coord[0])) {
          // It's a ring or polygon
          processCoords(coord as unknown[])
        } else {
          // It's a point [lon, lat]
          totalLon += coord[0] as number
          totalLat += coord[1] as number
          count++
        }
      }
    }
  }

  processCoords(coordinates)

  const centerLon: number = totalLon / count
  const centerLat: number = totalLat / count

  return [centerLon, centerLat]
}
