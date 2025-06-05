import path from 'path'
import { PostModel } from '../mongoose/schemas/Post'
import multer from 'multer'
import { Request, Response } from 'express'
import mongoose from 'mongoose'
import fs from 'fs'

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../media'))
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
        cb(null, uniqueSuffix + '-' + file.originalname)
    },
})

const upload = multer({ storage })

export const createPost = [
    upload.any(),

    async (req: Request, res: Response) => {
        try {
            // Content is already parsed by the validation middleware
            const files = req.files as Express.Multer.File[];
            const content = req.body.content;

            console.log(files)
            console.log(content)

            const processedContent = content.map((block: any) => {
                if (block.type === 'picture') {
                    // Find file with EXACT fieldname stored in block.content
                    const file = files.find(f => f.fieldname === block.content);
                    return {
                        ...block,
                        content: file ? `/media/${file.filename}` : ''
                    };
                }
                return block;
            });

            const mainImage = files.find(f => f.fieldname === 'image');
            const imagePath = mainImage ? `/media/${mainImage.filename}` : '/media/defaultpost.png';

            // Create the post
            const newPost = await PostModel.create({
                image: imagePath,
                title: req.body.title,
                description: req.body.description,
                content: processedContent,
            })

            // Return the created post
            res.status(201).json(newPost)
        } catch (error) {
            console.error('Error:', error)
            res.status(500).json({ message: 'Server error' })
        }
    },
]

export const deletePost = async (req: Request, res: Response) => {
    try {
        const postId = req.params.id // Get the post ID from the URL parameters

        // Check if the post exists
        const post = await PostModel.findById(postId)
        if (!post) {
            res.status(404).json({ message: 'Post not found' })
            return
        }

        // Delete the post
        await PostModel.findByIdAndDelete(postId)

        // Return success response
        res.status(200).json({ message: 'Post deleted successfully' })
    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ message: 'Server error' })
    }
}

export const getPosts = async (req: Request, res: Response) => {
    try {
        // Fetch all posts from the database
        const posts = await PostModel.find();

        // Return the posts
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


export const getPostById = async (req: Request, res: Response) => {
    try {
        const postId = req.params.id;

        // Check if the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            res.status(400).json({ message: 'Invalid post ID' });
            return;
        }

        const post = await PostModel.findById(postId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }

        res.status(200).json(post);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updatePost = [
    upload.single('image'), // Handle image upload
    async (req: Request, res: Response) => {
        try {
            const postId = req.params.id; // Get the post ID from the URL parameters

            // Check if the post exists
            const post = await PostModel.findById(postId);
            if (!post) {
                res.status(404).json({ message: 'Post not found' });
                return;
            }

            // Extract the fields to update from the request body
            const { title, description, content } = req.body;

            // Update the post fields (only if they are provided)
            if (title) post.title = title;
            if (description) post.description = description;

            // Validate and update content (if provided)
            if (content) {
                for (const block of content) {
                    if (block.type === 'picture') {
                        res.status(400).json({ message: 'Picture blocks not allowed' });
                        return;
                    }
                }
                post.content = content;
            }

            // Update the image if a new file is uploaded
            if (req.file) {
                // Delete the old image file (if it exists and is not the default image)
                if (post.image && post.image !== '/media/defaultpost.png') {
                    const oldImagePath = path.join(__dirname, '..', post.image);
                    fs.unlink(oldImagePath, (err) => {
                        if (err) {
                            console.error('Failed to delete old image file:', err);
                        }
                    });
                }

                // Set the new image path
                post.image = `/media/${req.file.filename}`;
            }

            // Save the updated post
            await post.save();

            // Return the updated post
            res.status(200).json(post);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },
];