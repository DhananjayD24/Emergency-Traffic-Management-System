import cors from "cors";

const corsOptions = {
  origin: "http://localhost:5173", // frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

// export the ready-to-use middleware
export const corsMiddleware = cors(corsOptions);