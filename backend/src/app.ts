import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes';
import adminRouter from './routes/admin.routes';
import userRouter from './routes/user.route';
import  cors from "cors";
import deviceRouter from './routes/device.routes';
import automationRouter from './routes/automation.routes';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

// app.use("/api/auth");

app.get("/health", (req,res)=>{
    res.json({status:"ok", message:"Server is running "})
})



app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/device", deviceRouter);
app.use("/api/user", automationRouter);

export default app


