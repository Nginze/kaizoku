import { cn } from "@/lib/utils";
import { Link } from "react-router";

type Props = {
  className?: string;
};

export default function Logo({ className }: Props) {
  return (
    <Link to={"/"}>
      <div>
        <span className={cn("text-2xl", className)}>改 kaizen</span>
      </div>
    </Link>
  );
}
