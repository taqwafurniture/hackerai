export const isPublicFreeMode = (): boolean =>
  process.env.PUBLIC_FREE_MODE !== "false";
