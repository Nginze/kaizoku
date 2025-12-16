import { SVGProps } from "react";

export function MajesticonsMicrophone(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      {/* Icon from Majesticons by Gerrit Halfmann - https://github.com/halfmage/majesticons/blob/main/LICENSE */}
      <g
        fill="none"
        stroke="#888888"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path
          fill="#888888"
          d="M9 6a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3v0a3 3 0 0 1-3-3z"
        />
        <path d="M12 18a7 7 0 0 1-7-7v0v-1m7 8a7 7 0 0 0 7-7v0v-1m-7 8v3" />
      </g>
    </svg>
  );
}
