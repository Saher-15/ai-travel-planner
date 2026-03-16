import mongoose from "mongoose";

const PlacePhotoSchema = new mongoose.Schema(
  {
    query: { type: String, required: true, trim: true, unique: true, index: true },
    photoUrl: { type: String, default: null },
    photoAttribution: { type: Object, default: null },
  },
  { timestamps: true }
);

export const PlacePhoto = mongoose.model("PlacePhoto", PlacePhotoSchema);
