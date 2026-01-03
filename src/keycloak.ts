type KeycloakUser = {
  sub?: string;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  [key: string]: any;
};

const AUTH_BASE_URL = process.env.AUTH_BASE_URL || '';
const AUTH_REALM = process.env.AUTH_REALM || '';

function userinfoUrl(): string {
  const base = AUTH_BASE_URL.replace(/\/$/, '');
  return `${base}/realms/${AUTH_REALM}/protocol/openid-connect/userinfo`;
}

export async function getKeycloakUserInfo(token: string): Promise<KeycloakUser> {
  if (!token) throw new Error('no token');
  if (!AUTH_BASE_URL || !AUTH_REALM) throw new Error('Keycloak not configured');

  const res = await fetch(userinfoUrl(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const msg = `Keycloak userinfo error ${res.status}: ${text}`;
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }

  const json = await res.json().catch(() => ({}));
  return json as KeycloakUser;
}

export type { KeycloakUser };
