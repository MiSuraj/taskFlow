package com.taskflow.platform.repository;

import com.taskflow.platform.domain.Tenant;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface TenantRepository extends MongoRepository<Tenant, String> {
    Optional<Tenant> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Tenant> findAllByOrderByCreatedAtDesc();
}
