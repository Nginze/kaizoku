import { toast } from "sonner";

type ToastType = "default" | "success" | "error" | "info" | "warning";

type ShowArgs = {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  id?: string | number;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type PromiseArgs<T> = {
  loading?: React.ReactNode | string;
  success?: React.ReactNode | string | ((data: T) => React.ReactNode | string);
  error?:
    | React.ReactNode
    | string
    | ((err: unknown) => React.ReactNode | string);
  duration?: number;
  id?: string | number;
  icon?: React.ReactNode;
};

export const notifications = {
  show: ({
    title,
    description,
    type = "default",
    duration,
    id,
    icon,
    action,
  }: ShowArgs) => {
    const opts = { description, duration, id, icon, action };

    switch (type) {
      case "success":
        return toast.success(title, opts);
      case "error":
        return toast.error(title, opts);
      case "info":
        return toast.info(title, opts);
      case "warning":
        return toast.warning(title, opts);
      default:
        return toast(title, opts);
    }
  },

  promise: <T>(
    promise: Promise<T>,
    {
      loading = "Working...",
      success = "Done!",
      error = "Something went wrong",
      icon,
      duration,
      id,
    }: PromiseArgs<T>,
  ) => {
    return toast.promise(promise, { loading, success, error });
  },

  dismiss: (id?: string | number) => toast.dismiss(id),
};