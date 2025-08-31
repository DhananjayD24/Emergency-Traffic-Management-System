import { TrafficPolice } from "../models/Traffic_police.models.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async(req,res,next)=>{
    try{
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")

        if(!token){
            throw new ApiError(401,"Unauthorized request")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) // verifies the given JWT using the secret key -> returns the decoded payload if valid, else throws an error

        const Police = await TrafficPolice.findById(decodedToken?._id).select("-password -refreshToken")
        if(!Police){
            throw new ApiError(401,"Invalid Access Token")
        }
        
        req.Police = Police
        next()
    }catch(error){
        throw new ApiError(401,error?.message || "Invalid Access Token")
    }
})