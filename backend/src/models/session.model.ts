import mongoose, { Document, Schema } from "mongoose";

// 1. Define the TypeScript Interface
export interface ISession extends Document {
    user: mongoose.Types.ObjectId;
    refreshTokenHash: string;
    ip: string;
    userAgent: string;
    revoked: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// 2. Apply the Interface to the Schema definition
const sessionSchema = new Schema<ISession>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: [true, "User is required"]
    },
    refreshTokenHash: {
        type: String,
        required: [true, "Refresh token hash is required"]
    },
    ip: {
        type: String,
        required: [true, "IP address is required"]
    },
    userAgent: {
        type: String,
        required: [true, "User agent is required"]
    },
    revoked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// 3. Apply the Interface to the Model
const sessionModel = mongoose.model<ISession>("sessions", sessionSchema);

export default sessionModel;