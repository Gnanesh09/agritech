import app from './src/app';
import connectDB from './src/db/db';
connectDB()
app.listen(3050, () => {
    console.log('Server is running on port 3050');
})

