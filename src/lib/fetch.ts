import { redirect } from "next/navigation"
import { toast } from "sonner"
type FetchOptions = RequestInit & {
    params?: Record<string, string>
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type RefreshOutcome = "ok" | "unauthenticated" | "error"

// Every request that hits a 401 at the same moment shares one refresh call.
let refreshing: Promise<RefreshOutcome> | null = null

export function refreshSession(): Promise<RefreshOutcome> {
    refreshing ??= (async (): Promise<RefreshOutcome> => {
        try {
            // Raw fetch on purpose: going through `api` would recurse on a 401.
            const res = await fetch("/api/auth/refresh", {
                method: "POST",
                credentials: "include",
            })
            if (res.ok) return "ok"
            if (res.status === 409) {
                // Another tab or request just rotated; its cookies are on the way.
                await sleep(250)
                return "ok"
            }
            return res.status === 401 ? "unauthenticated" : "error"
        } catch {
            return "error"
        }
    })().finally(() => {
        refreshing = null
    })
    return refreshing
}
async function fetchClient<T>(
    endpoint: string,
    options: FetchOptions = {},
    retried = false
): Promise<T> {
    const { params, ...init } = options
    const isServer = typeof window === "undefined"
    let baseURL = ""
    if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
        baseURL = isServer
            ? (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
            : window.location.origin
    }

    const url = new URL(endpoint, baseURL)
    if (params) {
        Object.entries(params).forEach(([key, value]) =>
            url.searchParams.set(key, value)
        )
    }

    const response = await fetch(url.toString(), {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...init.headers,
        },
    })

    if (response.status === 401) {
        if (isServer) {
            redirect("/login")
        }
        if (!retried) {
            const outcome = await refreshSession()
            if (outcome === "ok") return fetchClient<T>(endpoint, options, true)
            if (outcome === "error") throw new Error("Could not refresh session")
        }
        window.location.href = "/login"
        throw new Error("Unauthenticated")
    }
    if(response.status === 429){
        if(!isServer){
            const retryAfter = response.headers.get("Retry-After");
            const seconds = retryAfter?parseInt(retryAfter,10):null;
            toast.message(
                seconds?
                    `Too many requests. Try again in sometime`:
                    "Too many request. Try again later."
            )
        }
        throw new Error("RateLimited");
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message ?? "Request failed")
    }

    if (response.status === 204) {
        return {} as T
    }

    return response.json() as Promise<T>
}

export const api = {
    get: <T>(endpoint: string, options?: FetchOptions) =>
        fetchClient<T>(endpoint, { ...options, method: "GET" }),

    post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
        fetchClient<T>(endpoint, {
            ...options,
            method: "POST",
            body: body ? JSON.stringify(body) : undefined,
        }),

    patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
        fetchClient<T>(endpoint, {
            ...options,
            method: "PATCH",
            body: body ? JSON.stringify(body) : undefined,
        }),

    delete: <T = void>(endpoint: string, options?: FetchOptions) =>
        fetchClient<T>(endpoint, { ...options, method: "DELETE" }),
}