import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { TrafficPolice } from "../models/Traffic_police.models.js";
import { Duty } from "../models/Duty.models.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import axios from "axios";

const generateAccessAndRefereshTokens = async (policeId) => {
  try {
    const Police = await TrafficPolice.findById(policeId);
    const accessToken = Police.generateAccessToken();
    const refreshToken = Police.generateRefreshToken();

    Police.refreshToken = refreshToken;
    await Police.save({ validateBeforeSave: false });
    // Normally Mongoose checks all schema rules (e.g. mobile must be 10 digits, username unique, etc.)
    // validateBeforeSave: false skips those checks and just saves the refreshToken update

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wront while generating refresh and access token"
    );
  }
};

const registerPolice = asyncHandler(async (req, res) => {
  //WE will do following
  {
    /*
    get user details from frontend
    validation - not empty
    check if user already exists: username, email
    check for images, check for avatar
    upload them to cloudinary, avatar
    create user object - create entry in db
    remove password and refresh token field from response
    check for user creation
    return res  
    */
  }

  const { username, name, mobile, password } = req.body;

  if ([username, name, mobile, password].some((field) => field.trim() === "")) {
    throw new ApiError(400, "All Fields are required");
  }

  const existedPolice = await TrafficPolice.findOne({
    $or: [{ username }, { mobile }],
  });
  if (existedPolice) {
    throw new ApiError(
      409,
      "Traffic Police with this username or mobile already exists"
    );
  }

  const Police = await TrafficPolice.create({
    username: username.toLowerCase(),
    name,
    mobile,
    password,
  });

  const createdPolice = await TrafficPolice.findById(Police._id).select(
    "-password -refreshToken"
  );

  if (!createdPolice) {
    throw new ApiError(
      500,
      "Something went wrong while registering the Traffic Police"
    );
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        createdPolice,
        "Traffic Police registerd successfully"
      )
    );
});

const loginPolice = asyncHandler(async (req, res) => {
  const { username, password, role } = req.body;

  // 🔹 Admin Login
  if (role === "admin") {
    if (username === "DD24" && password === "123") {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            name: "Admin",
            username: "DD24",
            role: "admin",
          },
          "Admin logged in successfully"
        )
      );
    } else {
      throw new ApiError(400, "Invalid Admin Credentials");
    }
  }

  // 🔹 Police Login
  if (!username || !password) {
    throw new ApiError(400, "Username and Password are required");
  }

  const police = await TrafficPolice.findOne({ username });
  if (!police) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await police.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Wrong password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    police._id
  );

  const loggedInPolice = await TrafficPolice.findById(police._id).select(
    "-password -refreshToken"
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // 🔹 secure only in production
    sameSite: "lax",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInPolice,
          accessToken,
          refreshToken,
          role: "police",
        },
        "User logged in successfully"
      )
    );
});

//first auth.middleware.js will run before this logout. check route for confirmation.
const logoutPolice = asyncHandler(async (req, res) => {
  await TrafficPolice.findByIdAndUpdate(
    req.Police._id, // ID of currently logged-in police (coming from auth middleware)
    {
      $unset: {
        refreshToken: 1, //deletes refreshToken field from DB (sets it as undefined)
      },
    },
    {
      new: true, // return the updated document after changes
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await TrafficPolice.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const getAllPolice = asyncHandler(async (req, res) => {
  try {
    // Fetch all officers, exclude password, refreshToken, and __v
    const policeList = await TrafficPolice.find(
      {},
      { password: 0, refreshToken: 0, __v: 0 }
    );

    if (!policeList || policeList.length === 0) {
      throw new ApiError(404, "No traffic police officers found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, policeList, "Police officers fetched successfully")
      );
  } catch (error) {
    throw new ApiError(404, "No Traffic Police officer found");
  }
});

const updateOfficerByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { onDuty, location, locationCoords, dutyStartTime } = req.body;

  // --- 1. Update TrafficPolice ---
  const updatedOfficer = await TrafficPolice.findOneAndUpdate(
    { username },
    { $set: { onDuty } },
    {
      new: true,
      runValidators: true,
      projection: { password: 0, refreshToken: 0, __v: 0 },
    }
  );

  if (!updatedOfficer) {
    throw new ApiError(404, "Officer not found");
  }

  // --- 2. Update Duty only if locationCoords is valid ---
  let updatedDuty = null;
  if (locationCoords && Array.isArray(locationCoords)) {
    updatedDuty = await Duty.findOneAndUpdate(
      { policeOfficer: updatedOfficer._id },
      {
        $set: {
          location,
          locationCoords: {
            type: "Point",
            coordinates: locationCoords,
          },
          dutyStartTime,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );
  } else if (onDuty === false) {
    // Going off duty → clear Duty fields safely
    updatedDuty = await Duty.findOneAndUpdate(
      { policeOfficer: updatedOfficer._id },
      {
        $set: {
          location: null,
          locationCoords: undefined,
          dutyStartTime: null,
        },
      },
      { new: true }
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { officer: updatedOfficer, duty: updatedDuty },
        "Officer updated successfully"
      )
    );
});

// const getOfficerByUsername = async (req, res) => {
//   const { username } = req.params;

//   try {
//     // Exclude both password and refreshToken fields
//     const officer = await TrafficPolice.findOne({ username }).select(
//       "-password -refreshToken"
//     );

//     if (officer) {
//       return res.status(200).json(officer);
//     } else {
//       return res
//         .status(404)
//         .json({ success: false, message: "Officer not found" });
//     }
//   } catch (error) {
//     console.error("Error fetching officer:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// };

// controllers/officerController.js
const getOfficerByUsername = async (req, res) => {
  const { username } = req.params;

  try {
    // Fetch officer without sensitive fields
    const officer = await TrafficPolice.findOne({ username }).select(
      "-password -refreshToken"
    ).lean();

    if (!officer) {
      return res.status(404).json({ success: false, message: "Officer not found" });
    }

    // Fetch duty info for this officer
    const duty = await Duty.findOne({ policeOfficer: officer._id }).lean();

    // Merge officer + duty
    const result = {
      ...officer,
      duty: duty || null
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error("Error fetching officer:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Controller: Get duty duration in hours for a police officer
const getDutyDuration = asyncHandler(async (req, res) => {
  const { _id } = req.query; // or use req.params if you prefer
  const officerId = _id;

  if (!officerId) {
    return res
      .status(400)
      .json({ success: false, message: "officerId is required" });
  }

  const duty = await Duty.findOne({ policeOfficer: officerId });

  if (!duty) {
    return res
      .status(404)
      .json({ success: false, message: "Duty not found for this officer" });
  }

  const now = new Date();
  const durationMs = now - duty.dutyStartTime; // difference in milliseconds
  const durationMinutes = Math.floor(durationMs / 60000);

  res.status(200).json({
    success: true,
    officerId,
    durationMinutes,
  });
});

const getOfficerNotifications = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const officer = await TrafficPolice.findOne({ username }).select(
    "notifications"
  );

  if (!officer) {
    throw new ApiError(404, "Officer not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        officer.notifications || [],
        "Notifications fetched successfully"
      )
    );
});

// ✅ Clear officer notifications by username
const clearOfficerNotifications = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const result = await TrafficPolice.findOneAndUpdate(
    { username },
    { $set: { notifications: [] } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(404, "Officer not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, [], "Notifications cleared successfully"));
});

const notifyOfficers = async (req, res) => {
  try {
    const { officerIds, startAddress, endAddress } = req.body;

    if (!officerIds?.length || !startAddress || !endAddress) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Build message
    const message = `🚨 Ambulance Alert
From: ${startAddress}
To: ${endAddress}
Please assist in managing traffic along the route.`;

    const notification = {
      message,
      date: new Date(),
      read: false,
    };

    // Save notification in DB
    await TrafficPolice.updateMany(
      { _id: { $in: officerIds } },
      { $push: { notifications: notification } }
    );

    // Fetch officers for WhatsApp
    const officers = await TrafficPolice.find(
      { _id: { $in: officerIds } },
      "name mobile"
    );

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsAppNumber = "whatsapp:+14155238886"; // Twilio Sandbox

    // Send WhatsApp messages
    for (const officer of officers) {
      if (!officer.mobile) {
        console.warn(`Officer ${officer.name} has no mobile number`);
        continue;
      }

      const toWhatsAppNumber = `whatsapp:+91${officer.mobile}`;
      const waMessage = `🚑 *AMBULANCE ALERT* 🚑
      Dear ${officer.name}, please assist in managing traffic along this route.
      *From:* ${startAddress}
      *To:* ${endAddress}`;

      try {
        await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          new URLSearchParams({
            From: fromWhatsAppNumber,
            To: toWhatsAppNumber,
            Body: waMessage,
          }),
          { auth: { username: accountSid, password: authToken } }
        );
        console.log(`✅ WhatsApp sent to ${officer.name} (${officer.mobile})`);
      } catch (err) {
        console.error(
          `❌ Failed WhatsApp to ${officer.name} (${officer.mobile}):`,
          err.response?.data || err.message
        );
        // Continue loop instead of failing all
      }
    }

    return res.json({ message: "Notifications saved and WhatsApp attempted." });
  } catch (error) {
    console.error("Error in notifyOfficers:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getCurrentOfficer = asyncHandler(async (req, res) => {
  const currOfficer = await TrafficPolice.findById(
    req.Police._id, // from auth middleware
    { password: 0, refreshToken: 0, __v: 0 } // projection to exclude sensitive fields
  );

  if (!currOfficer) {
    throw new ApiError(404, "Officer not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        name: currOfficer.name,
        username: currOfficer.username,
      },
      "Current officer"
    )
  );
});

const getAllPoliceWithDuty = asyncHandler(async (req, res) => {
  try {
    const officers = await TrafficPolice.find(
      {},
      { password: 0, refreshToken: 0, __v: 0 }
    ).lean();
    const duties = await Duty.find({}).lean();

    const dutyMap = {};
    duties.forEach((d) => {
      dutyMap[d.policeOfficer.toString()] = d;
    });

    const result = officers.map((o) => {
      const duty = dutyMap[o._id.toString()];
      return {
        _id: o._id,
        name: o.name,
        username: o.username,
        phone: o.mobile,
        onDuty: duty ? o.onDuty : false,
        location: duty ? duty.location : "",
        locationCoords: duty ? duty.locationCoords?.coordinates : null,
        dutyStartTime: duty ? duty.dutyStartTime : null,
      };
    });

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Officers fetched with duty info"));
  } catch (err) {
    throw new ApiError(500, "Error fetching officers");
  }
});

export {
  registerPolice,
  loginPolice,
  logoutPolice,
  refreshAccessToken,
  getAllPolice,
  updateOfficerByUsername,
  getOfficerByUsername,
  getDutyDuration,
  getOfficerNotifications,
  clearOfficerNotifications,
  notifyOfficers,
  getCurrentOfficer,
  getAllPoliceWithDuty,
};
