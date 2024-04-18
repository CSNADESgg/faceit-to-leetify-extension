export const global = {
  initialQueryParams: new URLSearchParams(),
};

export function isQueryParamDone() {
  return (
    new URLSearchParams(global.initialQueryParams).get("faceit-to-leetify") ===
    "done"
  );
}
export function isQueryParamOld() {
  return (
    new URLSearchParams(global.initialQueryParams).get(
      "faceit-to-leetify-is-old",
    ) === "true"
  );
}
