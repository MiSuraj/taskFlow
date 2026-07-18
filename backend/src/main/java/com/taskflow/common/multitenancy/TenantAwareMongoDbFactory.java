package com.taskflow.common.multitenancy;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoDatabase;
import org.springframework.dao.DataAccessException;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;

/**
 * Resolves the physical MongoDB database dynamically from {@link TenantContext} for every
 * operation, instead of pointing at one fixed database. This is what gives every tenant its own
 * database (mirroring the Node backend's one-database-per-tenant design) while sharing a single
 * {@link MongoClient} connection pool across all of them — unlike the Node backend, which opened
 * one dedicated {@code mongoose.createConnection()} per tenant and never evicted it. The MongoDB
 * Java driver already pools connections per cluster internally, so no per-tenant connection
 * bookkeeping (and no unbounded-growth leak) is needed here at all.
 */
public class TenantAwareMongoDbFactory extends SimpleMongoClientDatabaseFactory {

    public TenantAwareMongoDbFactory(MongoClient mongoClient, String fallbackDatabaseName) {
        super(mongoClient, fallbackDatabaseName);
    }

    @Override
    public MongoDatabase getMongoDatabase() throws DataAccessException {
        String dbName = TenantContext.getDbName();
        if (dbName == null || dbName.isBlank()) {
            throw new IllegalStateException(
                    "No tenant selected for this operation — TenantContext must be set before a "
                            + "tenant-scoped repository is used.");
        }
        return getMongoDatabase(dbName);
    }
}
