import { useState } from "react";
import { Modal } from "@/components/modal";
import { RequestForm } from "./request-form";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubmitRequest } from "../mutations/submit-request";
import { notifications } from "@/lib/notifications";

export function RequestModal() {
  const [open, setOpen] = useState(false);
  const submitRequest = useSubmitRequest();

  const handleSubmit = (data: any) => {
    submitRequest.mutate(data, {
      onSuccess: () => {
        notifications.show({
          title: "Request submitted successfully!",
          description: "We'll review your request and get back to you soon.",
          type: "success",
        });
        setOpen(false);
      },
      onError: (error) => {
        console.error("Error submitting request:", error);
        notifications.show({
          title: "Failed to submit request",
          description: "Please try again later.",
          type: "error",
        });
      },
    });
  };

  return (
    <Modal
      className="w-[400px]"
      open={open}
      setOpen={setOpen}
      trigger={
        <button className="text-sm opacity-80 hover:opacity-100 transition-opacity">
          Request
        </button>
      }
      content={
        <div className="space-y-4 ">
          <DialogHeader>
            <DialogTitle className="text-md opacity-80">Submit a Request</DialogTitle>
            <DialogDescription className="text-sm opacity-60">
              Let us know if you're experiencing issues or need help with
              something.
            </DialogDescription>
          </DialogHeader>
          <RequestForm
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            isSubmitting={submitRequest.isPending}
          />
        </div>
      }
      showClose={true}
    />
  );
}
