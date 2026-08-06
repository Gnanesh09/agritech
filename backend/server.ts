import app from "./src/app";
import connectDB from "./src/db/db";

connectDB();
const PORT =
  process.env.NODE_ENV === "production"
    ? Number(process.env.PORT) || 3000
    : 3050;
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}