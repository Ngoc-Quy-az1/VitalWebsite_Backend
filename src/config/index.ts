import dotenv from 'dotenv';

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const envFound = dotenv.config();
if (envFound.error) {
  // This error should crash whole process

  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

export default {
  /**
   * Your favorite port
   */
  port: parseInt(process.env.PORT, 10),

  /**
   * PostgreSQL connection string
   */
  databaseURL: process.env.DATABASE_URL,
  
  /**
   * PostgreSQL connection config
   */
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },

  /**
   * Your secret sauce
   */
  jwtSecret: process.env.JWT_SECRET,
  jwtAlgorithm: process.env.JWT_ALGO,

  /**
   * Used by winston logger
   */
  logs: {
    level: process.env.LOG_LEVEL || 'silly',
  },

  /**
   * API configs
   */
  api: {
    prefix: '/api',
  },

  /**
   * SMTP credentials
   */
  emails: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },

  /**
   * Google Auth Config
   */
  googleClientId: process.env.GOOGLE_CLIENT_ID,

  /**
   * VitalAI Python Backend URLs
   */
  vitalAI: {
    chatbotApiUrl: process.env.VITALAI_CHATBOT_API_URL || 'http://localhost:8000',
    medicalToolsApiUrl: process.env.VITALAI_MEDICAL_TOOLS_API_URL || 'http://localhost:8010',
  },

  /**
   * Refresh Token Config
   */
  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET || 'my_refresh_token_secret_key',
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  },
};
