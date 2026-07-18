package com.taskflow.platform.service;

import com.taskflow.platform.domain.PlatformVisit;
import com.taskflow.platform.repository.PlatformVisitRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

/** Records anonymous landing-page visits and answers the aggregate questions the owner dashboard needs. */
@Service
public class PlatformVisitService {

    private final PlatformVisitRepository platformVisitRepository;
    private final MongoTemplate primaryMongoTemplate;

    public PlatformVisitService(
            PlatformVisitRepository platformVisitRepository,
            @Qualifier("primaryMongoTemplate") MongoTemplate primaryMongoTemplate) {
        this.platformVisitRepository = platformVisitRepository;
        this.primaryMongoTemplate = primaryMongoTemplate;
    }

    public void trackVisit(String visitorId, String path, String userAgent, String ip) {
        if (visitorId == null || visitorId.isBlank()) {
            throw new com.taskflow.common.exception.BadRequestException("visitorId required");
        }
        PlatformVisit visit = PlatformVisit.builder()
                .visitorId(truncate(visitorId, 80))
                .path(truncate(path == null ? "/" : path, 200))
                .userAgent(truncate(userAgent == null ? "" : userAgent, 300))
                .ip(ip == null ? "" : ip)
                .build();
        platformVisitRepository.save(visit);
    }

    public long countAll() {
        return platformVisitRepository.count();
    }

    public long countSince(Instant since) {
        return platformVisitRepository.countByCreatedAtGreaterThanEqual(since);
    }

    public long countDistinctVisitors() {
        return distinctVisitorIds(null).size();
    }

    public long countDistinctVisitorsSince(Instant since) {
        return distinctVisitorIds(since).size();
    }

    private Set<String> distinctVisitorIds(Instant since) {
        Query query = since == null ? new Query() : Query.query(Criteria.where("createdAt").gte(since));
        return new HashSet<>(primaryMongoTemplate.query(PlatformVisit.class)
                .distinct("visitorId")
                .as(String.class)
                .matching(query)
                .all());
    }

    private static String truncate(String value, int max) {
        return value.length() > max ? value.substring(0, max) : value;
    }
}
