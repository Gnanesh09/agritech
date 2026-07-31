import mongoose, { Document, Schema, Types } from "mongoose";

// 1. Define the TypeScript Interface
export interface IOtp extends Document {
    email: string;
    user: Types.ObjectId;
    otpHash: string;
    createdAt: Date;
    updatedAt: Date;
}

// 2. Apply the Interface to the Schema definition
const otpSchema = new Schema<IOtp>({
    email: {
        type: String,
        required: [true, "Email is required"]
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: [true, "User is required"]
    },
    otpHash: {
        type: String,
        required: [true, "OTP hash is required"]
    }
}, {
    timestamps: true
});

// 3. Apply the Interface to the Model
const otpModel = mongoose.model<IOtp>("otps", otpSchema);

export default otpModel;