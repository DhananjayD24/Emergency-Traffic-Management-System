import { app } from "./app.js";
import connectDB from "./db/index.js"
//require('dotenv').config()                //This is modularJS it won't work
import dotenv from "dotenv"
dotenv.config({
  path:'./.env'
})

const port = process.env.PORT || 3000;
connectDB()
.then(()=>{
  app.listen(port , ()=>{
    console.log(`Server is running at http://localhost:${port}`);
  })
})
.catch((error)=>{
  console.log("MONGO DB connection failed", error);
})