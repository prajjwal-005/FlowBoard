import { redirect } from "next/navigation"
import { toast } from "sonner"
type FetchOptions = RequestInit & {
    params?: Record<string, string>
}

async function fetchClient<T>(
    endpoint: string,
    options: FetchOptions = {}
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
        } else {
            window.location.href = "/login"
            throw new Error("Unauthenticated")
        }
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