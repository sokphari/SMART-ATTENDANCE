export function cx(...classes: unknown[]) {
  return classes
    .filter((cls): cls is string => typeof cls === "string" && cls.length > 0)
    .join(" ");
}
