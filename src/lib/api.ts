import { NextResponse } from "next/server";

export function success<T>(
  data: T,
  message = "Success",
  statusCode = 200
) {
  return NextResponse.json( 
    {
        statusCode,
        message,
        data,
        success: true,
    },
    {status: statusCode}
  );
}

export function failure(
  message: string,
  statusCode = 400,
  error?: unknown
) {
    const serializedError = error instanceof Error ? error.message : error
    return NextResponse.json(
        {
            statusCode,
            message,
            error: serializedError,
            success: false,
        },
        {status: statusCode}
    );
}
