package com.taskflow.docs.dto;

/** Inbound: a client editing one section live. sectionIndex is the position in ProjectDoc.sections. */
public record DocChangeMessage(int sectionIndex, String content) {
}
