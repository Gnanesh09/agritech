import express from 'express';
import cookieParser from 'cookie-parser';


const app = express();

app.use(express.json());
app.use(cookieParser());

// app.use("/api/auth");

app.get("/health", (req,res)=>{
    res.json({status:"ok", message:"Server is running "})
})



export default app


