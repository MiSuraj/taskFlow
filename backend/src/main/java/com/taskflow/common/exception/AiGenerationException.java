package com.taskflow.common.exception;

/** The upstream AI provider call failed or returned something we couldn't parse. */
public class AiGenerationException extends ApiException {
    public AiGenerationException(String message) {
        super(502, message);
    }
}
