import { Request, Response } from 'express';
import Video, { IVideo } from '../mongoose/schemas/Video';

// Create a new video
const validateVideoInput = (data: Partial<IVideo>) => {
    const errors: { [key: string]: string } = {};

    console.log(data.rutubeUrl)
    if (!data.rutubeUrl || !/^(https?:\/\/)?(www\.)?rutube\.ru(\/|$)/.test(data.rutubeUrl)) {
        errors.rutubeUrl = 'Please provide a valid Rutube URL';
    }

    if (!data.title || data.title.trim().length < 3) {
        errors.title = 'Title must be at least 3 characters long';
    }

    if (!data.description || data.description.trim().length < 10) {
        errors.description = 'Description must be at least 10 characters long';
    }

    return {
        errors,
        isValid: Object.keys(errors).length === 0
    };
};

// Create a new video
export const createVideo = async (req: Request, res: Response) => {
    try {
        const { errors, isValid } = validateVideoInput(req.body);

        if (!isValid) {
            res.status(400).json({ errors });
            return;
        }

        const { rutubeUrl, title, description } = req.body;

        const video = new Video({
            rutubeUrl,
            title,
            description
        });

        const savedVideo = await video.save();
        res.status(201).json(savedVideo);
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'ValidationError') {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        }
    }
};

// Get all videos
export const getVideos = async (req: Request, res: Response) => {
    try {
        const videos = await Video.find().sort({ createdAt: -1 });
        res.json(videos);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};

// Get a single video by ID
export const getVideoById = async (req: Request, res: Response) => {
    try {
        const video = await Video.findById(req.params.id);

        if (!video) {
            res.status(404).json({ message: 'Video not found' });
        } else {
            res.json(video);
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'CastError') {
                res.status(400).json({ message: 'Invalid video ID' });
            } else {
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        }
    }
};

// Update a video
export const updateVideo = async (req: Request, res: Response) => {
    try {
        const { errors, isValid } = validateVideoInput(req.body);

        if (!isValid) {
            res.status(400).json({ errors });
            return;
        }

        const { rutubeUrl, title, description } = req.body;

        const video = await Video.findByIdAndUpdate(
            req.params.id,
            { rutubeUrl, title, description, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!video) {
            res.status(404).json({ message: 'Video not found' });
        } else {
            res.json(video);
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'CastError') {
                res.status(400).json({ message: 'Invalid video ID' });
            } else if (error.name === 'ValidationError') {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        }
    }
};


// Delete a video
export const deleteVideo = async (req: Request, res: Response) => {
    try {
        const video = await Video.findByIdAndDelete(req.params.id);

        if (!video) {
            res.status(404).json({ message: 'Video not found' });
        } else {
            res.json({ message: 'Video deleted successfully' });
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'CastError') {
                res.status(400).json({ message: 'Invalid video ID' });
            } else {
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        }
    }
};