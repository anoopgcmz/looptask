import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

(async () => {
  await dbConnect();
  console.log(mongoose.modelNames());
  await mongoose.disconnect();
})();
