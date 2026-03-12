import { Status as AdvStatus } from "../entities/advertisement.js";
/**
 * Parameters for accepting an offer by an agent
 */
export type AcceptOfferByAgentParams = {
  offerId: number;
  agentId: number;
};

export type AcceptOfferByAgentResult = {
  offerId: number;
  advertisementId: number;
  advertisementStatus: AdvStatus;
  soldPrice: number;
  soldAt: Date;
};

/**
 * Parameters for creating a counteroffer by an agent
 */
export type CreateAgentCounterOfferParams = {
  advertisementId: number;
  accountId: number;
  agentId: number;
  price: number;
};

export type CreateAgentCounterOfferResult = {
  agentId: number;
  advertisementId: number;
  accountId: number;
  rejectedOfferId: number;
  counterOffer: {
    id: number;
    price: number;
    status: string;
    madeBy: string;
    createdAt: Date;
  };
};
/**
 * Parameters for accepting an agent's offer as an account
 */

export type AcceptAgentOfferAsAccountParams = {
  advertisementId: number;
  accountId: number;
};

/**
 * Result type for accepting an agent's offer as an account, including details of the accepted offer and the associated advertisement status.
 */
export type AcceptAgentOfferAsAccountResult = {
  acceptedOfferId: number;
  advertisementId: number;
  advertisementStatus: AdvStatus;
  soldPrice: number;
  soldAt: Date;
};

/**
 * Parameters for creating a counteroffer by an account in response to an agent's offer
 */
export type CounterAgentOfferAsAccountParams = {
  advertisementId: number;
  accountId: number;
  price: number;
};

/**
 * Result type for creating a counteroffer by an account in response to an agent's offer, including details of the rejected offer and the newly created counteroffer.
 */
export type CounterAgentOfferAsAccountResult = {
  rejectedOfferId: number;
  counterOfferId: number;
  advertisementId: number;
  accountId: number;
  agentId: number;
};
/**
 * Parameters for finding negotiations associated with a specific account, including pagination options.
 */

export type FindAccountNegotiationsParams = {
  accountId: number;
  take: number;
  skip: number;
};

/**
 * Parameters for finding detailed negotiation information for a specific account, advertisement, and agent combination. This type is used to specify the criteria for retrieving detailed information about negotiations, including the account ID, advertisement ID, and agent ID.
 */
export type FindAccountNegotiationDetailParams = {
  accountId: number;
  advertisementId: number;
  agentId: number;
};

export type FindAgentNegotiationsParams = {
  agentId: number;
  take: number;
  skip: number;
};

export type FindAgentNegotiationDetailParams = {
  agentId: number;
  advertisementId: number;
  accountId: number;
};