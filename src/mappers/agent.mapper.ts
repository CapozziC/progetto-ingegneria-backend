export const mapDeleteFounderError = (
  error: unknown,
): { status: number; body: object } => {
  if (!(error instanceof Error)) {
    return {
      status: 500,
      body: { error: "Internal server error" },
    };
  }

  switch (error.message) {
    case "AGENT_NOT_FOUND":
      return {
        status: 404,
        body: { error: "Agent not found" },
      };

    case "AGENCY_NOT_FOUND":
      return {
        status: 404,
        body: { error: "Agency not found" },
      };

    case "NOT_FOUNDER":
      return {
        status: 400,
        body: {
          error: "Only the founder agent can be deleted with the agency",
        },
      };

    case "AGENCY_HAS_OTHER_AGENTS":
      return {
        status: 400,
        body: {
          error: "Cannot delete agency because other agents still belong to it",
        },
      };

    default:
      return {
        status: 500,
        body: { error: "Internal server error" },
      };
  }
};



