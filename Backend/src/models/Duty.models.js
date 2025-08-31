import mongoose from "mongoose";
const dutySchema = new mongoose.Schema({
    policeOfficer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TrafficPolice", // Must match the model name in your another file
        required: true
    },
    location:{
      type: String,
      default: null,
    },
    dutyStartTime:{
        type:Date,
        default: Date.now
    },
    locationCoords:{
        type : {
            type:String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates:{
            type:[Number],
            default: undefined
        }

    },
    refreshToken:{
        type: String
    }
}, {timestamps:true})

export const Duty = mongoose.model("Duty",dutySchema)