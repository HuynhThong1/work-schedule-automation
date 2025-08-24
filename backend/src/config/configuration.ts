export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://huynhminhthong1912:Y6NbEpnJrL97jsgu@cinema-schedule.skzeig9.mongodb.net/ecinema-scheduling',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  timezone: process.env.TZ || 'Asia/Ho_Chi_Minh',
});
