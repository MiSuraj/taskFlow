package com.taskflow.platform.repository;

import com.taskflow.platform.domain.PlatformSettings;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PlatformSettingsRepository extends MongoRepository<PlatformSettings, String> {
    Optional<PlatformSettings> findByKey(String key);
}
