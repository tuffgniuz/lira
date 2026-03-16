import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type CardProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children: ReactNode;
  interactive?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Card<T extends ElementType = "div">({
  as,
  className,
  children,
  interactive = false,
  ...rest
}: CardProps<T>) {
  const Component = as ?? "div";
  const resolvedClassName = [
    "app-card",
    interactive ? "app-card--interactive" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={resolvedClassName} {...rest}>
      {children}
    </Component>
  );
}
