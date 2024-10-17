"use server";

import { Databases, ID, Query } from "node-appwrite";
import { InputFile } from 'node-appwrite/file';
import {
  BUCKET_ID,
  DATABASE_ID,
  ENDPOINT,
  PATIENT_COLLECTION_ID,
  PROJECT_ID,
  // collectionId,
  databases,
  storage,
  users,
} from "../appwrite.config";
import { getBufferImage } from "../utils"; // Add this line to import getBufferImage
import { parseStringify } from "../utils";

// CREATE APPWRITE USER
export const createUser = async (user: CreateUserParams) => {
  try {
    // Create new user -> https://appwrite.io/docs/references/1.5.x/server-nodejs/users#create
    const newUser = await users.create(
      ID.unique(),
      user.email,
      user.phone,
      undefined,
      user.name
    );

    return parseStringify(newUser);
  } catch (error: unknown) {
    // Check existing user
    if (error instanceof Error && (error as { code?: number })?.code === 409) {
      const existingUser = await users.list([
        Query.equal("email", [user.email]),
      ]);

      return existingUser.users[0];
    }
    console.error("An error occurred while creating a new user:", error);
  }
};

// GET USER
export const getUser = async (userId: string) => {
  try {
    const user = await users.get(userId);

    return parseStringify(user);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the user details:",
      error
    );
  }
};

// REGISTER PATIENT
export const registerPatient = async({ identificationDocument, ...patient}: RegisterUserParams) => {
  try {
      let file        
      if(identificationDocument) {
          const docFile =  identificationDocument?.get('blobFile') as File;
          const fileName = identificationDocument?.get('fileName') as string
          const bufferImg: Buffer = await getBufferImage(docFile);
          const inputFile = InputFile.fromBuffer(bufferImg,fileName)            
          file = await storage.createFile(BUCKET_ID!, ID.unique(), inputFile)
      }
      

      const newPatient = await databases.createDocument(
        DATABASE_ID!, // This should be your database ID
        PATIENT_COLLECTION_ID!, // This should be the collection ID, ensure it's defined
        ID.unique(), // Unique document ID
        { 
            // userId,
            identificationDocumentId: file?.$id || null,
            identificationDocumentUrl: file?.$id ? `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}` : null,
            ...patient // Patient data
        }
    );
    
      return parseStringify(newPatient)
      // return 
  } catch (error: any) {
      console.log("Error", error);
      
  }
}



// GET PATIENT
export const getPatient = async (userId: string) => {
  try {
    const patients = await databases.listDocuments(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    if (patients.documents.length === 0) {
      console.error("No patient found for the given userId.");
      return null;
    }

    console.log("Fetched patient:", patients.documents[0]);
    return parseStringify(patients.documents[0]);
  } catch (error) {
    console.error("Error fetching patient details:", error);
    throw error;
  }
};


