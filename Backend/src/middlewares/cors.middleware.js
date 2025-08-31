import cors from "cors";

const frontend_link = process.env.FRONTEND_URL
const corsOptions = {
  origin: `${frontend_link}`, // frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

// export the ready-to-use middleware
export const corsMiddleware = cors(corsOptions);