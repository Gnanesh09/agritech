import mongoose from "mongoose";
import { log } from "node:console";

export const connectDB = async () =>{
    
    
    try {
        await mongoose.connect(process.env.MONGODB_URI as string)
        console.log("MongoDb connected")
    } catch (error) {
        console.error("mongodb connection error: ", error);
        
        process.exit(1)
    }
}

export default connectDB