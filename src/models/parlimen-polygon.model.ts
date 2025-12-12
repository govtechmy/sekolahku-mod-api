import type { GeoJSONPoint, ParlimenPolygon, PolygonCentroid } from '@types'
import { model, Schema } from 'mongoose'

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

const ParlimenPolygonSchema = new Schema<ParlimenPolygon>(
  {
    negeri: { type: String, required: true },
    parlimen: { type: String, required: true },
    geometry: { type: Schema.Types.Mixed, required: true },
    centroid: { type: PolygonCentroidSchema },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
)

export const ParlimenPolygonModel = model<ParlimenPolygon>('ParlimenPolygon', ParlimenPolygonSchema, 'ParlimenPolygon')
