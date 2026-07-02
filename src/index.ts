import app from "./app.js";
import dotenv from "dotenv";
import { db } from "./db/index.js";

dotenv.config({
  path: "./.env",
});
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log("Server is running.")
});