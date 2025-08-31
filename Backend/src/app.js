// const express = require('express');   //we are using modularJS so it won't work
import express from "express"
import cookieParser from "cookie-parser"
import { errorHandler } from "./middlewares/error.middleware.js";
import { corsMiddleware } from "./middlewares/cors.middleware.js";


const app = express();

// app.use(cors({
//     origin: process.env.CORS_ORIGIN,
//     credentials: true
// }));


app.use(corsMiddleware)
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true , limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import policeRouter from "./routes/Traffic_police.routes.js"

app.get("/api/test", (req, res) => {
  console.log("Test route hit!");
  res.json({ msg: "Vercel serverless working!" });
});

//routes declaration
//app.use("/api/v1/police",policeRouter)  keeping it simple to match with frontend
app.use("/api",policeRouter)
app.use(errorHandler)

export {app};