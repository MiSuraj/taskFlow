package com.taskflow.platform.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record RegisterOrganizationRequest(
        @NotBlank String organizationName,
        String slug,
        String ownerEmail,
        @NotBlank String username,
        @NotBlank String password,
        String logoUrl,
        String primaryColor,
        String subscriptionPlan,
        MockPaymentRequest mockPayment,
        FeaturesRequest features,
        List<CustomRoleRequest> customRoles
) {
}
