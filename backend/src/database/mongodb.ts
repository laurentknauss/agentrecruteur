import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

class MongoDBConnection {
  private static instance: MongoDBConnection;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('🟢 MongoDB: Already connected');
      return;
    }

    try {
      const mongoUri = process.env.MONGODB_ATLAS_URI;
      
      if (!mongoUri) {
        throw new Error('MONGODB_ATLAS_URI environment variable is required');
      }

      console.log('🔄 MongoDB: Connecting to Atlas...');
      
      await mongoose.connect(mongoUri, {
        dbName: process.env.MONGODB_DATABASE || 'cv-inspector',
        maxPoolSize: 10, // Maximum number of connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close connections after 45 seconds of inactivity
        bufferCommands: false, // Disable mongoose buffering
      });

      this.isConnected = true;
      console.log('✅ MongoDB: Connected to Atlas successfully');

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB: Connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('🔌 MongoDB: Disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB: Reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      console.error('❌ MongoDB: Connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('🔌 MongoDB: Disconnected successfully');
    } catch (error) {
      console.error('❌ MongoDB: Disconnection error:', error);
    }
  }

  public isMongoConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public getConnection() {
    return mongoose.connection;
  }
}

export default MongoDBConnection;