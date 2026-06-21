import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mediconnect');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n[DATABASE WARNING] Error connecting to MongoDB: ${error.message}`);
    console.error(`Ensure your MongoDB service is running or supply a MONGO_URI in backend/.env to use database features.\n`);
  }
};

export default connectDB;
