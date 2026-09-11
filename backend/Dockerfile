# --- build stage ---
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Cache dependencies separately from source so a source-only change
# doesn't force a full dependency re-download.
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN ./mvnw -q dependency:go-offline

COPY src src
RUN ./mvnw -q package -DskipTests

# --- runtime stage ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/target/*.jar app.jar
RUN chown app:app app.jar
USER app

EXPOSE 8080
# MaxRAMPercentage caps the heap at 75% of the *container* limit, leaving room
# for thread stacks, metaspace and JIT code. Without it the JVM can size a heap
# that overruns a small (512MB) instance and get OOM-killed with no stack trace.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
