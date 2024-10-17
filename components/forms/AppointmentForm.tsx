"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SelectItem } from "@/components/ui/select";
import { Doctors } from "@/constants";
import {
  createAppointment,
  updateAppointment,
} from "@/lib/actions/appointment.actions";
import { getAppointmentSchema } from "@/lib/validation";
import { Appointment } from "@/types/appwrite.types";

import "react-datepicker/dist/react-datepicker.css";

import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { Form } from "../ui/form";
import { CANCELLED } from "dns";

export const AppointmentForm = ({
  type = "create",
  userId,
  patientId,
  appointment,
  setOpen,
}: {
  userId: string;
  patientId: string;
  type: "create" | "schedule" | "cancel";
  appointment?: Appointment;
  setOpen?: Dispatch<SetStateAction<boolean>>;
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const AppointmentFormValidation = getAppointmentSchema(type);

  const form = useForm<z.infer<typeof AppointmentFormValidation>>({
    resolver: zodResolver(AppointmentFormValidation),
    defaultValues: {
      primaryPhysician: appointment ? appointment?.primaryPhysician : "",
      schedule: appointment
        ? new Date(appointment?.schedule!)
        : new Date(Date.now()),
      reason: appointment ? appointment.reason : "",
      note: appointment?.note || "",
      cancellationReason: appointment?.cancellationReason || "",
    },
  });


  const onSubmit = async (
    values: z.infer<typeof AppointmentFormValidation>
  ) => {
    setIsLoading(true);
  
    let status;
    switch (type) {
      case "schedule":
        status = "scheduled";
        break;
      case "cancel":
        status = "canceled";
        break;
      default:
        status = "pending";
        break;
    }
    
    try {
      if (type === "create" && patientId) {
        // Fetch the patient data before creating an appointment
        const patient = await getPatient(patientId);  // Assuming userId is used to fetch the patient
  
        if (!patient) {
          console.error("No patient found for the given userId.");
          setIsLoading(false);  // Stop loading
          return;  // Exit the function if no patient is found
        }

        const appointmentData = {
          userId,
          patient: patientId,
          primaryPhysician: values.primaryPhysician,
          schedule: new Date(values.schedule),
          reason: values.reason!,
          status: status as Status,
          note: values.note,
        };
  
        // Add logs before creating the appointment
        console.log("Appointment Data:", appointmentData); // Log appointment data before creation
  
        const appointment = await createAppointment(appointmentData); // Attempt to create the appointment
        
  
        // Add logs after creating the appointment
        console.log("Appointment created:", appointment); // Log the created appointment
  
        if (appointment && appointment.$id) {
          form.reset();
          router.push(
            `/patients/${userId}/new-appointment/success?appointmentId=${appointment.$id}`
          );
        }
      } else {
        const appointmentToUpdate = {
          userId,
          appointmentId: appointment?.$id!,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          appointment: {
            primaryPhysician: values.primaryPhysician,
            schedule: new Date(values.schedule),
            status: status as Status,
            cancellationReason: values.cancellationReason,
          },
          type,
        };
  
        const updatedAppointment = await updateAppointment(appointmentToUpdate);
  
        if (updatedAppointment) {
          setOpen && setOpen(false);
          form.reset();
        }
      }
    } catch (error) {
      console.log("Error creating/updating appointment:", error); // Log any errors
    }
  
    setIsLoading(false);
  };
  
  

  // const onSubmit = async (values: z.infer<typeof AppointmentFormValidation>) => {
  //   console.log("Form Submitted", values);  // Ensure onSubmit is triggered
    
  //   setIsLoading(true);

  //   let status;
  //   switch (type) {
  //     case "schedule":
  //       status = "scheduled";
  //       break;
  //     case "cancel":
  //       status = "canceled";
  //       break;
  //     default:
  //       status = "pending";
  //       break;
  //   }

  //   try {
  //     if (type === "create" && patientId) {
        

  //       const appointmentData = {
  //         userId,
  //         patient: patientId,
  //         primaryPhysician: values.primaryPhysician,
  //         schedule: new Date(values.schedule),
  //         reason: values.reason!,
  //         status: status as Status,
  //         note: values.note,
  //       };
        
  //           console.log("Appointment Data:", appointmentData);  // Log data before creation

  //           const appointment = await createAppointment(appointmentData);

  //           console.log(appointment);

  //       if (appointment && appointment) {
  //         form.reset();
  //         router.push(
  //           `/patients/${userId}/new-appointment/success?appointmentId=${appointment.$id}`
  //         );
  //       }
  //     } else {
  //       const appointmentToUpdate = {
  //         userId,
  //         appointmentId: appointment?.$id!,
  //         timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  //         appointment: {
  //           primaryPhysician: values.primaryPhysician,
  //           schedule: new Date(values.schedule),
  //           status: status as Status,
  //           cancellationReason: values.cancellationReason,
  //         },
  //         type,
  //       };

  //       const updatedAppointment = await updateAppointment(appointmentToUpdate);

  //       if (updatedAppointment) {
  //         setOpen && setOpen(false);
  //         form.reset();
  //       }
  //     }
  //   } catch (error) {
  //     console.log(error);
  //   }
  //   setIsLoading(false);
  // };

  let buttonLabel;
  switch (type) {
    case "cancel":
      buttonLabel = "Cancel Appointment";
      break;
    case "schedule":
      buttonLabel = "Schedule Appointment";
      break;
    default:
      buttonLabel = "Submit Apppointment";
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6 text-dark-700">
        {type === "create" && (
          <section className="mb-12 space-y-4 text-dark-700">
            <h1 className="header">New Appointment</h1>
            <p className="text-dark-700">
              Request a new appointment in 10 seconds.
            </p>
          </section>
        )}

        {type !== "cancel" && (
          <>
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="primaryPhysician"
              label="Doctor"
              placeholder="Select a doctor"
            >
              {Doctors.map((doctor, i) => (
                <SelectItem key={doctor.name + i} value={doctor.name}>
                  <div className="flex cursor-pointer items-center gap-2">
                    <Image
                      src={doctor.image}
                      width={32}
                      height={32}
                      alt="doctor"
                      className="rounded-full border border-dark-500"
                    />
                    <p>{doctor.name}</p>
                  </div>
                </SelectItem>
              ))}
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="schedule"
              label="Expected appointment date"
              showTimeSelect
              dateFormat="MM/dd/yyyy  -  h:mm aa"
            />

            <div
              className={`flex flex-col gap-6  ${type === "create" && "xl:flex-row"}`}
            >
              <CustomFormField
                fieldType={FormFieldType.TEXTAREA}
                control={form.control}
                name="reason"
                label="Appointment reason"
                placeholder="Annual montly check-up"
                disabled={type === "schedule"}
              />

              <CustomFormField
                fieldType={FormFieldType.TEXTAREA}
                control={form.control}
                name="note"
                label="Comments/notes"
                placeholder="Prefer afternoon appointments, if possible"
                disabled={type === "schedule"}
              />
            </div>
          </>
        )}

        {type === "cancel" && (
          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="cancellationReason"
            label="Reason for cancellation"
            placeholder="Enter reason for cancellation"
          />
        )}

        <SubmitButton
          isLoading={isLoading}
          className={`${type === "cancel" ? "shad-danger-btn" : "shad-primary-btn"} w-full`}
        >
          {buttonLabel}
        </SubmitButton>
      </form>
    </Form>
  );
};