package com.taskflow.identity.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Lives in the tenant's own database (resolved via {@code TenantContext}), never in the
 * control-plane database. {@code role} is intentionally a free-form string, not an enum — a
 * tenant's admin-defined custom roles (see {@code Tenant.customRoles}) are just as valid a value
 * as the fixed roles (admin/manager/developer/qa); only 'admin' and 'manager' are reserved.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    private String password; // bcrypt hash

    private String role;
}
