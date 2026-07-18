package com.taskflow.platform.repository;

import com.taskflow.platform.domain.PlatformVisit;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;

public interface PlatformVisitRepository extends MongoRepository<PlatformVisit, String> {
    long countByCreatedAtGreaterThanEqual(Instant since);
}
