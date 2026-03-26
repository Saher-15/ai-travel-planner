/**
 * Shared MongoDB in-memory setup/teardown for all test suites.
 * Import setupDB() in beforeAll, teardownDB() in afterAll,
 * and clearDB() in afterEach.
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod;

export async function setupDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function teardownDB() {
  await mongoose.disconnect();
  await mongod.stop();
}

export async function clearDB() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}
