import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const policeSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    name:{
      type: String,
      required: true,
    },
    mobile:{
      type: String,
      required: true,
      unique: true,
      match: [/^\d{10}$/, 'Mobile number must be exactly 10 digits'],
    },
    password: {
      type: String,
      required: true,
    },
    onDuty:{
      type:Boolean,
      default:false,
      required: true,
    },
    notifications:{
      type: [
        {
          message:{
            type:String,
            required:true,
          },
          date:{
            type:Date,
            default:Date.now,
          },
          read:{
            type:Boolean,
            default:false,
          }
        }
      ],
      default:[]
    },
    profilePic:{
      type : String,   //cloudinary url
    },
    refreshToken:{
      type:String
    }



  },
  { timestamps: true }
);

policeSchema.pre("save", async function (next){
  if(!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10)
  next();
})

policeSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

policeSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            mobile: this.mobile,
            username: this.username,
            name: this.name
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
policeSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,  //refresh token generator mai payload minimum rakhte hai.
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const TrafficPolice = mongoose.model("TrafficPolice", policeSchema);
//here in DB TrafficPolice will be saved in plural form as TrafficPolices.
