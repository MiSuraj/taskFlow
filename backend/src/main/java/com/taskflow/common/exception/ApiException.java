package com.taskflow.common.exception;

/** Base type for exceptions that carry their own HTTP status, mapped straight to JSON by GlobalExceptionHandler. */
public class ApiException extends RuntimeException {

    private final int status;

    public ApiException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}
