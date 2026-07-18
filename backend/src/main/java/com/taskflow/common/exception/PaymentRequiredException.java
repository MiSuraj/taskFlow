package com.taskflow.common.exception;

/** Mirrors the Node backend's 402 responses for inactive subscriptions / incomplete mock payment. */
public class PaymentRequiredException extends ApiException {
    public PaymentRequiredException(String message) {
        super(402, message);
    }
}
