import mongoose from 'mongoose';

const podcastSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      minlength: 3,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      minlength: 10,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['tech', 'science', 'history', 'comedy', 'news'],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 60,
    },
    episodes: {
      type: Number,
      default: 1,
      min: 1,
    },
    published: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Podcast = mongoose.model('Podcast', podcastSchema);

export default Podcast;

