import { cn } from "@/lib/utils";
import { Link } from "react-router";

type Props = {
  className?: string;
};

export default function Logo({ className }: Props) {
  return (
    <Link to={"/"}>
      <div className="flex items-center gap-1.5">
        <img
          className="w-[35px] hidden md:block lg:block object-contain"
          src="/logo/kaizoku-mugiwara.png"
        />
        <span className={cn("text-xl", className, "logo")}>
          kaizo<span className="text-primary">ku</span>
        </span>
      </div>
    </Link>
  );
}
