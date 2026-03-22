import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type PanelProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children: ReactNode;
  interactive?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Panel<T extends ElementType = "div">({
  as,
  className = "",
  children,
  interactive = false,
  ...rest
}: PanelProps<T>) {
  const Component = as ?? "div";

  return (
    <Component
      className={`ui-panel ${interactive ? "ui-panel--interactive" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Component>
  );
}
