import { Router } from "express";
import { clearOfficerNotifications, getAllPolice, getAllPoliceWithDuty, getCurrentOfficer, getDutyDuration, getOfficerByUsername, getOfficerNotifications, loginPolice, logoutPolice, notifyOfficers, registerPolice, updateOfficerByUsername } from "../controllers/Traffic_police.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.route("/signup").post(
   // upload.single('profilePic'), commenting this line because we are not taking profilePic while registering Traffic Police. We will add profilePic in update section
    registerPolice
)
router.route("/login").post(loginPolice)
router.route("/logout").post(verifyJWT,logoutPolice) //first auth.middleware.js will run before logout.
router.route("/officers").get(getAllPoliceWithDuty)

router.route("/officers/:username").put(updateOfficerByUsername)
router.route("/officers/:username").get(getOfficerByUsername)
router.route("/api/currentUser").get(verifyJWT,getCurrentOfficer)
router.route("/duty-duration").get(getDutyDuration)
router.route("/officers/:username/notifications").get(getOfficerNotifications)
router.route("/officers/:username/notifications").delete(clearOfficerNotifications)
router.route("/api/notify-officers").post(notifyOfficers)


export default router