import React from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";

type ModalProps = {
  trigger: React.ReactNode;
  content: React.ReactNode;
  showClose?: boolean;
  className?: string;
};

export const Modal: React.FC<ModalProps> = ({
  trigger,
  content,
  showClose,
  className,
}) => {
  return (
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className={className} showCloseButton={showClose}>
        {content}
      </DialogContent>
    </Dialog>
  );
};
