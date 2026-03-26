import mongoose from 'mongoose';
import Podcast from '../models/podcast.model.js';

const isAuthor = (podcastAuthorId, userId) => podcastAuthorId.toString() === userId.toString();

export const listPublishedPodcasts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [podcasts, total] = await Promise.all([
      Podcast.find({ published: true })
        .populate('author', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Podcast.countDocuments({ published: true }),
    ]);

    return res.status(200).json({
      data: podcasts,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPodcastById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de podcast invalido' });
    }

    const podcast = await Podcast.findById(id).populate('author', 'name email role');
    if (!podcast || !podcast.published) {
      return res.status(404).json({ message: 'Podcast no encontrado' });
    }

    return res.status(200).json(podcast);
  } catch (error) {
    return next(error);
  }
};

export const createPodcast = async (req, res, next) => {
  try {
    const podcast = await Podcast.create({
      ...req.body,
      author: req.user._id,
    });

    return res.status(201).json(podcast);
  } catch (error) {
    return next(error);
  }
};

export const updatePodcast = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de podcast invalido' });
    }

    const podcast = await Podcast.findById(id);
    if (!podcast) {
      return res.status(404).json({ message: 'Podcast no encontrado' });
    }

    if (!isAuthor(podcast.author, req.user._id)) {
      return res.status(403).json({ message: 'Solo el autor puede actualizar este podcast' });
    }

    Object.assign(podcast, req.body);
    await podcast.save();

    return res.status(200).json(podcast);
  } catch (error) {
    return next(error);
  }
};

export const deletePodcast = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de podcast invalido' });
    }

    const podcast = await Podcast.findByIdAndDelete(id);
    if (!podcast) {
      return res.status(404).json({ message: 'Podcast no encontrado' });
    }

    return res.status(200).json({ message: 'Podcast eliminado' });
  } catch (error) {
    return next(error);
  }
};

export const listAllPodcastsAdmin = async (req, res, next) => {
  try {
    const podcasts = await Podcast.find()
      .populate('author', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json(podcasts);
  } catch (error) {
    return next(error);
  }
};

export const togglePublishPodcast = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de podcast invalido' });
    }

    const podcast = await Podcast.findById(id);
    if (!podcast) {
      return res.status(404).json({ message: 'Podcast no encontrado' });
    }

    podcast.published = req.body.published;
    await podcast.save();

    return res.status(200).json(podcast);
  } catch (error) {
    return next(error);
  }
};

