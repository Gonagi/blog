## 1. 문제 상황
### 1.1 발생한 에러

Spring Boot 애플리케이션에서 Redis 연결 시 다음과 같은 에러가 발생했습니다.
``` text
org.springframework.data.redis.RedisConnectionFailureException: Unable to connect to Redis
    at org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory$ExceptionTranslatingConnectionProvider.translateException(LettuceConnectionFactory.java:1866)
    at org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory$ExceptionTranslatingConnectionProvider.getConnection(LettuceConnectionFactory.java:1797)
```
``` text
Caused by: io.lettuce.core.RedisCommandExecutionException:
NOAUTH HELLO must be called with the client already authenticated
```

**핵심 에러 메시지**: `NOAUTH HELLO must be called with the client already authenticated`
- Spring Boot가 Redis에 **비밀번호 없이 연결을 시도**했다는 의미

---
### 1.2 환경 정보

**배포 환경**
- Docker Compose 기반 Blue-Green 배포
- 네트워크: `loglens-network` (Docker bridge network)

**컨테이너 구성**
- `loglens-app-green`: Spring Boot Application
- `loglens-mysql`: MySQL 8.0
- `loglens-redis`: Redis
- `loglens-jenkins`: Jenkins

**Redis 설정**
- 비밀번호: `Loglens306#)^` (특수문자 포함)
- 포트: `6379`

---
## 2. 문제 진단 과정

### 2.1 컨테이너 상태 확인
```bash
docker ps | grep loglens
```

**결과**: 모든 컨테이너 정상 실행 중

| 컨테이너 | 상태 |
|---------|------|
| `loglens-app-green` | healthy |
| `loglens-mysql` | healthy |
| `loglens-redis` | healthy |
| `loglens-jenkins` | healthy |

---
### 2.2 환경 변수 확인
```bash
docker exec loglens-app-green env | grep REDIS
```

**결과**: 환경 변수 정상 설정됨
``` text
REDIS_PASSWORD=Loglens306#)^
SPRING_REDIS_HOST=loglens-redis
SPRING_REDIS_PORT=6379
SPRING_REDIS_PASSWORD=Loglens306#)^
```

---
### 2.3 네트워크 연결 확인
```bash
docker network inspect loglens-network | grep -E "loglens-redis|loglens-app"
```

**결과**: 같은 네트워크에 존재
- `loglens-app-green`: 172.19.0.6
- `loglens-redis`: 같은 `loglens-network`에 연결됨

---
### 2.4 Redis 서버 동작 확인
```bash
# 비밀번호 없이 연결 시도 (실패해야 정상)
docker exec loglens-redis redis-cli ping
```

**결과**: `NOAUTH Authentication required.` (정상)
```bash
# 비밀번호로 연결 시도 (성공해야 정상)
docker exec loglens-redis redis-cli -a 'Loglens306#)^' ping
```

**결과**: `PONG` (정상)
**결론**: Redis 서버 자체는 정상 작동 중

---
## 3. 원인 분석

### 3.1 의심했던 원인들 (실제 원인 아님)

**특수문자 문제**
- **가설**: 비밀번호의 `#)^` 특수문자가 환경 변수에서 주석으로 인식되는 문제
- **검증 결과**: 
  - MySQL도 같은 비밀번호를 사용하는데 정상 작동
  - 환경 변수 확인 결과 전체 비밀번호가 제대로 전달됨

**네트워크 문제**
- **가설**: Docker 네트워크 연결 문제 또는 DNS 해석 실패
- **검증 결과**: 
  - `docker network inspect`로 같은 네트워크 확인
  - Redis 서버에 직접 연결 시 정상 작동

**비밀번호 불일치**
- **가설**: application.yml의 비밀번호와 Redis 서버의 비밀번호 불일치
- **검증 결과**: 
  - 환경 변수 `SPRING_REDIS_PASSWORD`에 올바른 비밀번호 존재
  - Redis 서버에 해당 비밀번호로 연결 시 성공
---
### 3.2 실제 원인 발견

**application-prod.yml 확인**
```yaml
spring:
  data:
    redis:
      host: ${SPRING_REDIS_HOST:loglens-redis}
      port: ${SPRING_REDIS_PORT:6379}
      password: ${SPRING_REDIS_PASSWORD}  # 환경 변수로 설정됨
```

YAML 설정은 정상적으로 되어 있습니다.

**RedisConfig.java 확인 (문제 발견)**
```java
@Configuration
public class RedisConfig {

    @Value("${spring.data.redis.host}")
    private String host;

    @Value("${spring.data.redis.port}")
    private int port;

    // ❌ 비밀번호를 읽어오는 코드가 없음!
    // @Value("${spring.data.redis.password}")
    // private String password;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        // ❌ 비밀번호 설정 없이 ConnectionFactory 생성
        LettuceConnectionFactory factory = new LettuceConnectionFactory(host, port);
        return factory;
    }

    // ...
}
```

**문제점**
1. `@Value("${spring.data.redis.password}")`로 비밀번호를 주입받는 코드 누락
2. `LettuceConnectionFactory` 생성 시 비밀번호 설정 로직 누락
3. **application.yml에 비밀번호가 설정되어 있어도, 커스텀 RedisConfig가 이를 무시하고 비밀번호 없이 연결 시도**

---
## 4. 해결 방법

### 4.1 RedisConfig 수정
```java
@Configuration
public class RedisConfig {

    @Value("${spring.data.redis.host}")
    private String host;

    @Value("${spring.data.redis.port}")
    private int port;

    @Value("${spring.data.redis.password}")  // 추가
    private String password;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        LettuceConnectionFactory factory = new LettuceConnectionFactory(host, port);

        // 비밀번호 설정 로직 추가
        if (!Objects.isNull(password) && !password.isEmpty()) {
            factory.getStandaloneConfiguration().setPassword(password);
        }

        return factory;
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(
            RedisConnectionFactory factory, ObjectMapper objectMapper) {
        RedisTemplate<String, Object> redisTemplate = new RedisTemplate<>();
        redisTemplate.setConnectionFactory(factory);
        GenericJackson2JsonRedisSerializer json = 
            new GenericJackson2JsonRedisSerializer(objectMapper);

        redisTemplate.setKeySerializer(new StringRedisSerializer());
        redisTemplate.setValueSerializer(json);
        redisTemplate.setHashKeySerializer(new StringRedisSerializer());
        redisTemplate.setHashValueSerializer(json);
        redisTemplate.afterPropertiesSet();

        return redisTemplate;
    }
}
```
---
### 4.2 변경 사항 요약

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 비밀번호 주입 | 없음 | `@Value("${spring.data.redis.password}")` 추가 |
| 비밀번호 설정 | 없음 | `factory.getStandaloneConfiguration().setPassword(password)` 추가 |
| Null 체크 | 없음 | `if (!Objects.isNull(password) && !password.isEmpty())` 추가 |

---

### 4.3 배포 및 검증
```bash
# 코드 수정 후 커밋 & 푸시
git add src/main/java/S13P31A306/loglens/global/config/redis/RedisConfig.java
git commit -m "fix: RedisConfig에 비밀번호 설정 로직 추가"
git push

# Jenkins CI/CD 파이프라인 실행

# 배포 후 로그 확인
docker logs loglens-app-green | grep -i redis
```

**결과**: 에러 없이 정상 실행 확인