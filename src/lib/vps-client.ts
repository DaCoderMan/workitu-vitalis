const VPS_IP = process.env.VPS_IP || "65.109.230.136";
const VPS_PORT = process.env.VPS_PORT || "8000";
const VPS_API_KEY = process.env.VPS_API_KEY;

export async function vpsPost(path: string, body: unknown) {
  if (!VPS_API_KEY) {
    throw new Error("VPS_API_KEY not configured");
  }

  const res = await fetch(`http://${VPS_IP}:${VPS_PORT}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": VPS_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`VPS error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function vpsGet(path: string) {
  if (!VPS_API_KEY) {
    throw new Error("VPS_API_KEY not configured");
  }

  const res = await fetch(`http://${VPS_IP}:${VPS_PORT}${path}`, {
    headers: {
      "X-API-Key": VPS_API_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`VPS error ${res.status}: ${text}`);
  }

  return res.json();
}
