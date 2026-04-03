export const mapDeleteFounderError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

  switch (message) {
    case "FOUNDER_NOT_FOUND":
      return {
        status: 404,
        body: { error: "Founder agent not found" },
      };

    case "FOUNDER_IS_NOT_ADMIN":
      return {
        status: 403,
        body: { error: "Founder agent is not an admin" },
      };

    case "AGENCY_NOT_FOUND":
      return {
        status: 404,
        body: { error: "Agency not found" },
      };

    case "AGENCY_HAS_OTHER_AGENTS":
      return {
        status: 409,
        body: { error: "Cannot delete agency because it has other agents" },
      };

    default:
      return {
        status: 500,
        body: { error: "Internal server error" },
      };
  }
};
