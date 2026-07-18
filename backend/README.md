# TaskFlow Backend (Java / Spring Boot)

A from-scratch Java port of the original Node/Express backend, which this replaces. Same domain,
same REST contract (response shapes match, so the React frontend in `../frontend` needs no changes
beyond pointing `REACT_APP_API_ORIGIN` at this service), same multi-tenant architecture — but with
the security gaps found during the Node backend's review closed from the start instead of
retrofitted, and a handful of intentional design-pattern choices called out below.

## Stack

Java 21, Spring Boot 3.3, Spring Data MongoDB, Spring Security (stateless JWT), Spring WebSocket
(STOMP, replacing Socket.io), Maven, Lombok.

## Architecture

**Package-by-feature, not package-by-layer.** Each business area is a self-contained module under
`com.taskflow.<module>` with its own `domain` / `repository` / `service` / `web` / `dto`
sub-packages: `platform` (tenants, plans, owner console), `identity` (auth, users), `project`,
`task`, `docs`, `chat`, `ai`. `common` holds cross-cutting concerns (security, multitenancy,
exception handling) shared by all of them.

**Multi-tenancy: one physical MongoDB database per tenant**, same as the Node backend, but
implemented differently. Instead of opening a new `mongoose.createConnection()` per tenant and
never closing any of them (the Node backend's actual behavior — an unbounded connection leak),
`TenantAwareMongoDbFactory` resolves the target database dynamically per-request from a
`ThreadLocal` (`TenantContext`), while every tenant shares one `MongoClient` connection pool.
`TenantResolvingFilter` sets that ThreadLocal after JWT auth succeeds, re-validating the tenant's
status/subscription **on every request** (not just at login) — see `common/security/`. The
platform's own data (`Tenant`, `PlatformSettings`, `PlatformVisit`) lives in a separate, fixed
"control-plane" database, wired up as a second `MongoTemplate` in `common/config/MongoConfig.java`.

**Auth**: stateless JWT (`common/security/JwtService.java`), same claim shape as the Node backend
(`sub`, `username`, `role`, `tenantId`, `tenantSlug`). Roles map to Spring Security authorities;
`admin` is granted the base business-role authorities too (`JwtAuthenticationFilter`), reproducing
the Node backend's "admin implicitly passes every role check" rule via plain `hasRole(...)`
instead of custom logic per route. The platform owner role is additionally gated by
`@tenantGuard.isDefaultTenant()` — see `common/security/TenantGuard.java`.

**Realtime**: STOMP over WebSocket (SockJS fallback) at `/ws`, replacing Socket.io. Destinations
mirror the Node backend's room names (`/topic/tenant.<slug>.doc.<projectId>`,
`/topic/tenant.<slug>.chat.<roomId>`). `StompAuthChannelInterceptor` authenticates the JWT on
CONNECT and **re-validates tenant status on every single frame**, not just at handshake — the Node
backend only checked once at connect, so a suspended tenant's users could keep chatting/editing
docs in realtime for up to 7 days (the JWT lifetime) after suspension. That gap is closed here.

## Design patterns, and why

- **State pattern** (`task/domain/TaskStatus.java`): each status enum constant owns its own set of
  legal next states. The Node backend let a developer skip QA entirely (`in-progress` straight to
  `done`) because the transition rule was an incomplete `if` chain; here it's structurally
  impossible — `IN_PROGRESS.allowedNextStates()` only contains `IN_QA`. Managers/admins still
  override the structural check (`task/service/TaskWorkflowService.java`) for oversight, same
  capability the Node backend granted them.
- **Strategy pattern** (`ai/service/AiProvider.java` + `OpenAiProvider`/`GeminiProvider`): replaces
  the Node backend's `model.startsWith('gpt') ? ... : ...` branching. Adding a new AI vendor means
  adding a new `@Component`, not editing an existing file.
- **Shared authorization service** (`project/service/ProjectAccessService.java`): the single
  `canAccess(...)` check used by `task`, `docs`, and `chat` before touching any project-scoped
  data. In the Node backend this check existed correctly in exactly one route file (`docs.js`);
  `tasks.js` and `chat.js` each had routes that skipped it — any tenant member could read/write
  any other project's tasks or chat rooms by guessing an ID. Centralizing it means every module
  gets the same rule for free.
- **Mapper/Assembler components** (`TenantMapper`, `ProjectMapper`, `TaskMapper`, `ChatMapper`,
  `ProjectDocMapper`) separate persistence entities from API responses, and are where the
  AI-key/webhook-token masking lives — closing a Node backend bug where `GET /api/tenants/me` and
  the fully **public**, unauthenticated `GET /api/tenants/public/:slug` both returned tenants'
  plaintext AI provider keys and WhatsApp/Teams tokens to anyone.
- **Service-layer authorization, not per-route** (`chat/service/ChatService.java`): both the REST
  controller and the WebSocket handler call the same service methods, so the two transports can't
  drift out of sync the way the Node backend's REST route and Socket.io handler did for
  reaction-toggling (implemented twice, separately).

## Fixes carried over from the Node backend review

Beyond the ones above: `POST /api/auth/invite` (manager-provisioning) now applies the same
role-allowlist as admin-provisioning, closing a privilege-escalation path where a manager could
invite a user with role `owner`.

## Running locally

Prerequisites: JDK 21, Maven (or use the wrapper if you add one), a MongoDB instance.

```bash
export MONGO_BASE_URI="mongodb://localhost:27017"   # no database name in the URI
export CORS_ORIGIN="http://localhost:3000"
mvn spring-boot:run
```

Or build and run the jar directly:

```bash
mvn -DskipTests package
java -jar target/taskflow-backend.jar
```

`JWT_SECRET` defaults to a labeled dev-only placeholder (see `application.yml`) so both commands
above work with zero setup beyond a running MongoDB — override it with a real secret for anything
beyond a local throwaway run.

No JVM flags are needed to run this on any JDK 17+ — including launching
`com.taskflow.TaskflowApplication` directly from an IDE. Earlier versions of this backend used
Spring Data's reflection-based auditing (`@EnableMongoAuditing`/`@CreatedDate`), which needs
`--add-opens java.base/java.time=ALL-UNNAMED` on JDK 17+ (a known interaction between that
reflection and the JDK module system) — a flag that has to be configured per launcher (jar
manifest, Maven plugin, *and* separately in every IDE's run configuration) and is easy to miss.
Rather than keep documenting three different places to add it, `createdAt` timestamps are now set
directly in application code (`Instant.now()` as a Lombok `@Builder.Default`, in each entity) —
same result, zero configuration, works identically everywhere.

On first boot with an empty platform database, `PlatformSeeder` creates the reserved `default`
tenant with an `owner` user (`admin` / `admin123`, same as the Node backend's `seed.js`) — set
`SEED_ON_STARTUP=false` to disable this.

## What's not done

This is a first pass covering full REST + realtime parity. Not carried over from the Node
backend's remaining known gaps (flagged during the original review, not fixed in either backend):
rate limiting on login/register, request-body schema validation beyond `jakarta.validation`
annotations already on the DTOs, and encryption-at-rest for the AI/webhook secret fields (they're
stored in plaintext in Mongo, same as before — only in-transit exposure via the API was fixed).
