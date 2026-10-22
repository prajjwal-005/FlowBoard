export function safeNextPath(next:string | null):string {
    const ALLOWED_REDIRECT_PATHS = /^\/(?!\/)[a-zA-Z0-9\-_/?=&]*$/;
    const BLOCKED = /^\/(api|login|register)(\/|\?|$)/;
    return next && ALLOWED_REDIRECT_PATHS.test(next) && !BLOCKED.test(next) ? next : "/dashboard"
}