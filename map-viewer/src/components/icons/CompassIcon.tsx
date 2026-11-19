import { CSSProperties, Signalish } from "preact";

export type CompassIconProps = {
  class?: Signalish<string>;
  style?: Signalish<string | CSSProperties | undefined>;
  size?: number;
  viewBox?: string;
  color?: string;
};

export default function CompassIcon({
  class: className,
  style,
  size = 800,
  viewBox = "0 4 23 23",
  color = "#000000",
}: CompassIconProps) {
  const sizePx = `${size}px`;

  return (
    <svg
      fill={color}
      width={sizePx}
      height={sizePx}
      viewBox={viewBox}
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      class={className}
      style={style}
    >
      {/* <title>compass</title> */}
      <path d="M11.188 4.781c6.188 0 11.219 5.031 11.219 11.219s-5.031 11.188-11.219 11.188-11.188-5-11.188-11.188 5-11.219 11.188-11.219zM11.188 24.594c4.75 0 8.625-3.844 8.625-8.594s-3.875-8.625-8.625-8.625-8.594 3.875-8.594 8.625 3.844 8.594 8.594 8.594zM13.031 17.813l-6.688 3.031 3.031-6.688 6.688-3.031zM7.563 19.656l4.844-2.438-2.438-2.438z">
      </path>
    </svg>
  );
}
