import type { Request } from "express";

/**
 * Defines the structure of the payload required to create a new agency along with its first agent. 
 * This type includes properties for the agency's name, email, and phone number, as well as the first agent's first name, last name, and phone number. 
 * The CreateAgencyPayload type is used to ensure that all necessary information is provided when creating a new agency and its first agent, 
 * and it serves as a contract for the expected data structure in the request body when handling agency creation requests.
 */
export type CreateAgencyPayload = {
  name: string;
  email: string;    
  agencyPhoneNumber: string;
  firstName: string;
  lastName: string;
  agentPhoneNumber: string;
};

/** Extracts the necessary information from the request body to create a new agency and its first agent. The function takes an Express Request object as input and returns a CreateAgencyPayload object containing the agency's name, email, phone number, as well as the first agent's first name, last name, and phone number. The function ensures that all string values are trimmed of whitespace, and the email is converted to lowercase for consistency. This function is intended to be used as a helper to extract and format the data from the request body before processing the creation of a new agency and its first agent in the database.
 * @param req - The Express Request object containing the body of the request with the necessary information for creating a new agency and its first agent.
 * @returns A CreateAgencyPayload object containing the extracted and formatted information from the request body.
 */
export const extractCreateAgencyPayload = (req: Request): CreateAgencyPayload => {
  return {
    name: String(req.body.name).trim(),
    email: String(req.body.email).trim().toLowerCase(),
    agencyPhoneNumber: String(req.body.agencyPhoneNumber).trim(),
    firstName: String(req.body.firstName).trim(),
    lastName: String(req.body.lastName).trim(),
    agentPhoneNumber: String(req.body.agentPhoneNumber).trim(),
  };
};
