import React from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";

type ModalProps = {
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  trigger: React.ReactNode;
  content: React.ReactNode;
  showClose?: boolean;
  className?: string;
};

export const Modal: React.FC<ModalProps> = ({
  open,
  setOpen,
  trigger,
  content,
  showClose,
  className,
}) => {
  return (
    <Dialog {...{ open, onOpenChange: setOpen }}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className={className} showCloseButton={showClose}>
        {content}
      </DialogContent>
    </Dialog>
  );
};
