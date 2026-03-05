/*type IpGeoResponse = {
  ip: string;
  city?: string;
  country_name?: string;
  latitude?: string;
  longitude?: string;
};

export async function ipGeolocate(ip: string) {
  const apiKey = process.env.IPGEOLOCATION_API_KEY;

  if (!apiKey) {
    throw new Error("Missing IPGEOLOCATION_API_KEY");
  }

  const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to call IP Geolocation API");
  }

  const data = (await res.json()) as IpGeoResponse;

  return {
    ip: data.ip,
    city: data.city,
    country: data.country_name,
    latitude: data.latitude ? Number(data.latitude) : null,
    longitude: data.longitude ? Number(data.longitude) : null,
  };
}
*/
type IpGeoResponse = {
  ip: string;
  city?: string;
  country_name?: string;
  latitude?: string;
  longitude?: string;
  state_prov?: string;
  time_zone?: { name?: string };
};

function normalizeIp(ip: string): string {
  // rimuove IPv6-mapped IPv4 tipo ::ffff:1.2.3.4
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  // rimuove eventuali spazi
  return ip.trim();
}

export async function ipGeolocate(ipRaw: string) {
  const apiKey = process.env.IPGEOLOCATION_API_KEY;
  if (!apiKey) throw new Error("Missing IPGEOLOCATION_API_KEY");

  const ip = normalizeIp(ipRaw);

  // evita chiamate inutili in locale
  if (ip === "127.0.0.1" || ip === "::1") {
    return {
      ip,
      city: undefined,
      country: undefined,
      latitude: null,
      longitude: null,
    };
  }

  const url = new URL("https://api.ipgeolocation.io/ipgeo");
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("ip", ip);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (e: unknown) {
    throw new Error(`IPGeolocation network error: ${e instanceof Error ? e.message : String(e)}`, {
      cause: e,
    });
  }

  const text = await res.text(); // leggi body SEMPRE, poi parse
  if (!res.ok) {
    // qui vedrai 401/403/429 ecc + body con dettagli
    throw new Error(`IPGeolocation HTTP ${res.status}: ${text}`);
  }

  const data: IpGeoResponse = JSON.parse(text);

  return {
    ip: data.ip,
    city: data.city,
    country: data.country_name,
    latitude: data.latitude ? Number(data.latitude) : null,
    longitude: data.longitude ? Number(data.longitude) : null,
    region: data.state_prov,
    timezone: data.time_zone?.name,
  };
}
