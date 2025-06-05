import mongoose, { Schema, Document } from "mongoose";

const CounterSchema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

export const CounterModel = mongoose.model('Counter', CounterSchema);

const SubmissionSchema = new Schema({
    displayId: { type: Number, unique: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    question: { type: String },
    status: {
        type: String,
        required: true,
        enum: ["read", "unread"],
        default: "unread"
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

SubmissionSchema.pre<ISubmissionDocument>('save', async function (next) {
    if (!this.isNew) return next();

    try {
        const counter = await CounterModel.findByIdAndUpdate(
            { _id: 'submissionId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.displayId = counter.seq;
        next();
    } catch (error: any) {
        next(error);
    }
});

type Submission = {
    displayId: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    question?: string | null;
    status: "read" | "unread";
    createdAt: Date;
    updatedAt: Date;
};

interface ISubmissionDocument extends Submission, Document { }

export const SubmissionModel = mongoose.model<ISubmissionDocument>("Submission", SubmissionSchema);