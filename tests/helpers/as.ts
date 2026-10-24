import { api } from "./http";
import { authCookie } from "./users";

type U = Parameters<typeof authCookie>[0];

/** actAs(user).post(path, body) -> supertest response, authenticated via cookie. */
export function actAs(user: U) {
  return {
    get: async (path: string) =>
      api.get(path).set("Cookie", await authCookie(user)),
    post: async (path: string, body: object = {}) =>
      api.post(path).set("Cookie", await authCookie(user)).send(body),
    patch: async (path: string, body: object = {}) =>
      api.patch(path).set("Cookie", await authCookie(user)).send(body),
    delete: async (path: string, body?: object) => {
      const req = api.delete(path).set("Cookie", await authCookie(user));
      return body ? req.send(body) : req;
    },
  };
}
