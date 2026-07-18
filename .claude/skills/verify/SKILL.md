---
name: verify
description: Build, boot, and drive the TaskFlow Java backend (backend/) against a real MongoDB to verify a change actually works. Use before considering any backend change done.
---

# TaskFlow backend verification

The backend is a Spring Boot 3.3 / Java 21 app at `backend/` (Maven). It needs a real MongoDB
instance — there is no in-memory/embedded fallback configured. This sandbox has no system JDK,
Maven, MongoDB, or Docker daemon by default, but all three can be installed portably to
`~/.local/opt/` without sudo (confirmed working — internet access is available).

## One-time setup (skip if `~/.local/opt/{jdk21,maven,mongodb}` already exist)

```bash
mkdir -p ~/.local/opt && cd ~/.local/opt

# JDK 21 (Temurin)
curl -sL -o jdk21.tar.gz "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse"
mkdir -p jdk21 && tar xzf jdk21.tar.gz -C jdk21 --strip-components=1

# Maven — use archive.apache.org, NOT dlcdn.apache.org (dlcdn 404s on older point releases)
curl -sL -o maven.tar.gz "https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.tar.gz"
mkdir -p maven && tar xzf maven.tar.gz -C maven --strip-components=1

# MongoDB server (community, generic Linux build works fine here)
curl -sL -o mongodb.tgz "https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-7.0.14.tgz"
mkdir -p mongodb && tar xzf mongodb.tgz -C mongodb --strip-components=1
```

## Every verification run

```bash
export JAVA_HOME=~/.local/opt/jdk21
export PATH=$JAVA_HOME/bin:~/.local/opt/maven/bin:$PATH

# Fresh Mongo instance (use --fork, not manual nohup/disown — the sandbox's bash tool
# fights hand-rolled backgrounding; --fork daemonizes cleanly and returns).
rm -rf ~/.local/mongodata && mkdir -p ~/.local/mongodata
~/.local/opt/mongodb/bin/mongod --dbpath ~/.local/mongodata --port 27117 --bind_ip 127.0.0.1 \
  --logpath ~/.local/mongodata/mongod.log --fork

cd /home/dell/Videos/tf/taskFlow/backend
mvn -q -DskipTests package   # 0 errors expected; jar lands at target/taskflow-backend.jar
```

Boot the jar using the Bash tool's `run_in_background: true` parameter (not shell-level
`nohup ... & disown` — that pattern reliably produces a spurious "exit code 144" in this sandbox
even when the command actually launched fine; `run_in_background` is the intended mechanism):

```bash
MONGO_BASE_URI="mongodb://127.0.0.1:27117" PORT=5051 \
  $JAVA_HOME/bin/java -jar target/taskflow-backend.jar
```

No JVM flags needed at all, on any launcher (jar, `mvn spring-boot:run`, or an IDE's own "Run" on
the main class) — as of 2026-07-16 `@EnableMongoAuditing`/`@CreatedDate` was removed entirely in
favor of setting `createdAt = Instant.now()` as a plain Lombok `@Builder.Default` in each entity.
The earlier `InaccessibleObjectException` reflecting into `java.time.Instant` (JPMS vs. Spring
Data's reflection-based auditing) can no longer happen because nothing reflects into `Instant`
anymore — this wasn't a per-launcher flag fix, it removed the code path that needed the flag. If
you see that exception again, something reintroduced `@EnableMongoAuditing`/`@CreatedDate` /
`@LastModifiedDate` — grep for those annotations rather than reaching for `--add-opens`.
`JWT_SECRET` also no longer needs setting for a quick verification run — `application.yml`
defaults it to a labeled dev-only placeholder; set a real one only if the run needs to be
trustworthy beyond this sandbox.

Poll for readiness instead of a fixed sleep:
```bash
for i in 1 2 3 4 5 6 7 8; do
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5051/api/tenants/plans)" = "200" ] && break
  sleep 1
done
```

## Driving the API

Runs on port 5051 (or whatever `PORT` you set) at `/api/...`. There's a seeded platform account:
tenant slug `default`, username `admin`, password `admin123`, role `owner` — only usable if the
platform DB was empty at boot (`SEED_ON_STARTUP=true` by default).

Typical flow: `POST /api/auth/login {tenantSlug, username, password}` → JWT → every subsequent
request needs `Authorization: Bearer <token>` **and** `X-Tenant-Slug: <slug>` headers.
`POST /api/tenants/register` self-serves a brand-new tenant + admin user (requires a
`mockPayment: {paid: true, paymentId: "..."}` block and a real `subscriptionPlan` key —
`basic`/`starter`/`business`/`enterprise`).

Worth probing on any auth/multi-tenancy change: register two separate tenants and confirm one
tenant's admin can't read the other's data by guessing a project/task ID (tenant-level isolation
holds via the per-tenant database even where app-level `ProjectAccessService.canAccess()` grants
admins a blanket pass — see the finding below, still worth re-checking after changes there).

## Known non-bug: WebSocket (STOMP/chat/docs realtime) isn't covered by this recipe

curl can't drive STOMP frames. If a change touches `common/security/StompAuthChannelInterceptor`,
`docs/web/DocWebSocketController`, or `chat/web/ChatWebSocketController`, the REST counterparts
(`/api/docs/{projectId}`, `/api/chat/...`) can be verified this way but the WebSocket path itself
cannot without a STOMP-capable client (e.g. a small Node script with `@stomp/stompjs`, or
`websocat` if installed). Flag this as unverified rather than skipping it silently.

## Known finding (as of 2026-07-15, not yet fixed): orphaned cross-tenant-shaped references for admins

`ProjectAccessService.canAccess()` and `.isManagerOrAdmin()` both short-circuit `true` for
`role == admin` **without checking the project actually exists**. Reproduced live: an admin can
`POST /api/tasks` (or hit `GET /api/docs/{projectId}`, which auto-creates) with a `projectId` that
doesn't exist anywhere, even in their own tenant, and it succeeds (201 / auto-created doc) instead
of 404. No cross-tenant data leak occurs — the per-tenant database is the real isolation boundary
and holds regardless of this gap — but it lets an admin create task/doc/chat-room records with a
dangling `project` reference. This behavior is inherited unchanged from the original Node backend
(`if (userRole === 'admin') return true` in `utils/access.js`), not a regression introduced in the
Java port. Worth fixing (`canAccess`/`isManagerOrAdmin` should look up the project even for admins
and only skip the *ownership* check, not the *existence* check) but out of scope until asked.

## Cleanup

```bash
pkill -f taskflow-backend.jar
pkill -f "mongod --dbpath"
```
(These reliably report a nonzero/odd exit code in this sandbox even on success — that's the
sandbox's handling of a killed background process, not a failure. Confirm with a plain
`ps aux | grep -E "mongod|taskflow-backend"` afterward instead of trusting the pkill exit code.)
