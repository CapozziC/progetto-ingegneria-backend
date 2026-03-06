import { normalizeIp } from "../utils/ip.utils.js";

type GeoapifyIpInfo = {
  ip?: string;
  city?: { name?: string };
  country?: { name?: string };
  location?: { latitude?: number; longitude?: number };
};

export async function geopifyIpGeolocate(ipRaw?: string) {
  const apiKey = process.env.IPGEOLOCATION_API_KEY; 
  console.log(
    "IPGEOLOCATION_API_KEY present?",
    Boolean(process.env.IPGEOLOCATION_API_KEY),
  );

  if (!apiKey) throw new Error("Missing IPGEOLOCATION_API_KEY");

  const url = new URL("https://api.geoapify.com/v1/ipinfo");
  url.searchParams.set("apiKey", apiKey);

  // indirizzo IP da header (es. "cf-connecting-ip" o "x-forwarded-for")
  if (ipRaw) url.searchParams.set("ip", normalizeIp(ipRaw));

  const res = await fetch(url.toString());
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Geoapify ipinfo HTTP ${res.status}: ${text}`);
  }

  const data: GeoapifyIpInfo = JSON.parse(text);

  return {
    ip: data.ip ?? ipRaw ?? null,
    city: data.city?.name ?? null,
    country: data.country?.name ?? null,
    latitude: data.location?.latitude ?? null,
    longitude: data.location?.longitude ?? null,
  };
}
