package com.taskflow.common.util;

public final class SlugUtil {

    private SlugUtil() {
    }

    public static String slugify(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase().trim()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    public static String makeDbName(String slug) {
        return "taskflow_tenant_" + slug.replaceAll("[^a-z0-9_]", "_");
    }
}
