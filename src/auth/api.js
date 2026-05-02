import { httpJson } from "@/lib/http";

const usersApi = "/api/users";

export function signup(payload) {
  return httpJson(`${usersApi}/register`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload) {
  return httpJson(`${usersApi}/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getProfile() {
  return httpJson(`${usersApi}/profile`, {
    method: "GET",
    auth: true,
  });
}
