import { cn } from "@/lib/utils";
import { Link } from "react-router";

type Props = {
  className?: string;
};

export default function Logo({ className }: Props) {
  return (
    <Link to={"/"}>
      <div className="flex items-center gap-3">
        <img
          className="w-[35px] object-contain"
          src="/public/logo/kaizoku-transparent.png"
        />
        <span className={cn("text-2xl", className)}> kaizoku</span>
      </div>
    </Link>
  );
}
