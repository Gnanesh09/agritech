import { Schema, model, Document } from "mongoose";

// 1. Define the TypeScript Interface
export interface IUser extends Document {
  username: string;      // Note: This is 'name', not 'username'!
  email: string;
  password: string;
  phone: string | null;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Apply the Interface to the Schema definition
const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN", "SUPER_ADMIN"],
      default: "USER",
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 3. Export as default so your controller import works!
const userModel = model<IUser>("users", userSchema);
export default userModel;