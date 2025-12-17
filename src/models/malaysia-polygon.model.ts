import type { GeoJSONPoint, MalaysiaPolygon, PolygonCentroid } from '@types'
import { Schema } from 'mongoose'
import { sekolahkuConnection } from 'src/config/db.config'

const GeoJSONPointSchema = new Schema<GeoJSONPoint>(
  {
    type: { Point: Number },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
)

const PolygonCentroidSchema = new Schema<PolygonCentroid>(
  {
    location: { type: GeoJSONPointSchema },
    koordinatXX: { type: Number },
    koordinatYY: { type: Number },
  },
  { _id: false },
)

const MalaysiaPolygonSchema = new Schema<MalaysiaPolygon>(
  {
    region: { type: String, required: true },
    geometry: { type: Schema.Types.Mixed, required: true },
    centroid: { type: PolygonCentroidSchema },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
)

export const MalaysiaPolygonModel = sekolahkuConnection.model<MalaysiaPolygon>('MalaysiaPolygon', MalaysiaPolygonSchema, 'MalaysiaPolygon')
