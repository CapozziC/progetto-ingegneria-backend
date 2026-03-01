import type { Response } from "express";
import { RequestAccount } from "../types/express.js";
import { findAllAdvertisements } from "../repositories/advertisement.repository.js";
import { requireAccount } from "../utils/require.utils.js";

export const getAllAdvertisements = async (
  req: RequestAccount,
  res: Response,
) => {
  const account = requireAccount(req, res);
  if (!account) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const take = Number(req.query.take ?? 20);
  const skip = Number(req.query.skip ?? 0);
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;
  const type = typeof req.query.type === "string" ? req.query.type : undefined;

  try {
    const result = await findAllAdvertisements({ take, skip, status, type });

    return res.status(200).json({
      items: result.items.map((a) => ({
        id: a.id,
        description: a.description,
        price: a.price,
        type: a.type,
        status: a.status,
        agentId: a.agent?.id,
        realEstate: a.realEstate,
        photos: (a.photos ?? []).sort((x, y) => x.position - y.position),
        pois: a.pois ?? [],
      })),
      count: result.count,
      take: result.take,
      skip: result.skip,
    });
  } catch (err) {
    console.error("getAllAdvertisements error:", err);
    return res.status(500).json({ error: "Failed to fetch advertisements" });
  }
};
