import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes';


const app = express();

app.use(express.json());
app.use(cookieParser());

// app.use("/api/auth");

app.get("/health", (req,res)=>{
    res.json({status:"ok", message:"Server is running "})
})



app.use("/api/auth", authRouter);

export default app


