"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";

import { Appointment } from "@/types/appwrite.types";

import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  PATIENT_COLLECTION_ID,
  databases,
  messaging,
} from "../appwrite.config";
import { formatDateTime, parseStringify } from "../utils";

// CREATE APPOINTMENT
export const createAppointment = async (appointment: CreateAppointmentParams) => {
  try {
    console.log("Appointment data before creation:", appointment);
    const newAppointment = await databases.createDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      ID.unique(),
      appointment
    );

    console.log("New Appointment Created:", newAppointment);
    revalidatePath("/admin");
    return parseStringify(newAppointment);
  } catch (error: unknown) {
    console.error("An error occurred while creating a new appointment:", (error as Error)?.message || error);
    return null;
  }
};

// GET PATIENT
export const getPatient = async (patientId: string) => {
  try {
    console.log("Fetching patient data for patientId:", patientId);
    const patient = await databases.getDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      patientId
    );

    console.log("Patient data fetched:", patient);
    return parseStringify(patient);
  } catch (error: unknown) {
    console.error("No patient found for the given userId:", patientId, "Error:", (error as Error)?.message || error);
    return null;
  }
};

// GET RECENT APPOINTMENTS
export const getRecentAppointmentList = async () => {
  try {
    console.log("Fetching recent appointment list...");
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.orderDesc("$createdAt")]
    );

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = (appointments.documents as Appointment[]).reduce(
      (acc, appointment) => {
        switch (appointment.status) {
          case "scheduled":
            acc.scheduledCount++;
            break;
          case "pending":
            acc.pendingCount++;
            break;
          case "canceled":
            acc.cancelledCount++;
            break;
        }
        return acc;
      },
      initialCounts
    );

    const data = {
      totalCount: appointments.total,
      ...counts,
      documents: appointments.documents,
    };

    console.log("Recent appointments fetched successfully.");
    return parseStringify(data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(
        "An error occurred while retrieving the recent appointments:", error.message
      );
    } else {
      console.error("An unknown error occurred while retrieving the recent appointments:", error);
    }
    return null;
  }
};

// SEND SMS NOTIFICATION
export const sendSMSNotification = async (userId: string, content: string) => {
  try {
    console.log("Sending SMS notification to userId:", userId);
    const message = await messaging.createSms(ID.unique(), content, [], [userId]);

    console.log("SMS sent successfully:", message);
    return parseStringify(message);
  } catch (error: unknown) {
    console.error("An error occurred while sending SMS:", (error as Error)?.message || error);
    return null;
  }
};

// UPDATE APPOINTMENT
export const updateAppointment = async ({
  appointmentId,
  userId,
  timeZone,
  appointment,
  type,
}: UpdateAppointmentParams) => {
  try {
    if (!appointmentId) {
      throw new Error("No appointmentId provided for update.");
    }

    console.log("Attempting to update appointment with ID:", appointmentId);
    const updatedAppointment = await databases.updateDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId,
      appointment
    );

    if (!updatedAppointment) throw new Error("Failed to update appointment");

    const smsMessage = `Greetings from CarePulse. ${
      type === "schedule"
        ? `Your appointment is confirmed for ${formatDateTime(
            appointment.schedule!,
            timeZone
          ).dateTime} with Dr. ${appointment.primaryPhysician}`
        : `We regret to inform that your appointment for ${formatDateTime(
            appointment.schedule!,
            timeZone
          ).dateTime} is cancelled. Reason:  ${appointment.cancellationReason}`
    }.`;
    await sendSMSNotification(userId, smsMessage);

    revalidatePath("/admin");
    console.log("Appointment updated successfully:", updatedAppointment);
    return parseStringify(updatedAppointment);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("An error occurred while scheduling an appointment:", error.message);
    } else {
      console.error("An unknown error occurred while scheduling an appointment:", error);
    }
    return null;
  }
};

// GET APPOINTMENT
export const getAppointment = async (appointmentId: string) => {
  try {
    console.log("Fetching appointment with appointmentId:", appointmentId);
    const appointment = await databases.getDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId
    );

    console.log("Appointment fetched successfully:", appointment);
    return parseStringify(appointment);
  } catch (error: unknown) {
    console.error("An error occurred while retrieving the appointment:", (error as Error)?.message || error);
    return null;
  }
};
