type IpGeoResponse = {
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
