import {Status as AdvStatus} from '../entities/advertisement.js';
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

export type CounterAgentOfferAsAccountParams = {
  advertisementId: number;
  accountId: number;
  price: number;
};

export type CounterAgentOfferAsAccountResult = {
  rejectedOfferId: number;
  counterOfferId: number;
  advertisementId: number;
  accountId: number;
  agentId: number;
};
