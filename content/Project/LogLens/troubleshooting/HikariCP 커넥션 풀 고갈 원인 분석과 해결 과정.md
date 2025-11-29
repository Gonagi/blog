## 1. 문제
### 1.1 문제 상황

> 운영 환경에서 일정 주기로 **HikariCP 커넥션 풀 고갈 문제**가 발생했습니다.  
> 
> 10분마다 실행되는 배치 로직이 DB 커넥션을 장시간 점유하고 있었고, 아래와 같은 오류가 반복되었습니다.

``` text
HikariPool-1 - Connection is not available, request timed out after 30000ms
```

### 1.2 문제 원인

> 여러 컴포넌트에서 공통적으로 **트랜잭션 내부에서 외부 I/O 호출**을 하고 있었습니다.

- OpenSearch 조회    
- Jira API 호출
- WebClient.block()
- 배치/스케줄러 내 전체 프로젝트 순회

이 로직들이 **트랜잭션 시작 이후 실행**되고 있었고, 그 동안 DB 커넥션이 반환되지 않아 풀 고갈로 이어졌습니다.

---
# 2. LogMetricsBatchServiceImpl 개선
### 2.1 원인

> 전체 프로젝트를 하나의 트랜잭션에서 처리하고 있었고, 그 안에서 OpenSearch I/O가 반복 호출되고 있었습니다.

```java
@Transactional  // ❌ 전체 트랜잭션
public void aggregateAllProjects() {
    List<Project> projects = projectRepository.findAll();
    for (Project project : projects) {
        aggregateProjectMetrics(project, aggregatedAt);  
        // 내부에서 OpenSearch 호출 + DB 저장
    }
}
```

프로젝트가 많을수록 트랜잭션 길이가 20~60초까지 늘어나면서 커넥션이 점유된 채 회수되지 않았습니다.

---
### 2.2 해결

> OpenSearch 호출은 트랜잭션 밖에서 실행하고,  DB 저장만 별도 트랜잭션으로 분리했습니다.

```java
public void aggregateAllProjects() {
    List<Project> projects = projectRepository.findAll();

    for (Project project : projects) {
        // OpenSearch I/O는 트랜잭션 밖에서 처리
        var backend = executeOpenSearchQuery(...);
        var frontend = executeOpenSearchQuery(...);

        saveMetricsInNewTx(project, backend, frontend);  // ✔ DB 저장만 트랜잭션
    }
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
private void saveMetricsInNewTx(Project project, 
                                SearchResponse<Void> backend, 
                                SearchResponse<Void> frontend) {
    // ... 엔티티 생성
    logMetricsRepository.save(/* metrics */);
}
```    
- 커넥션 점유 시간 **40초 → 1초 미만**
- 스케줄러 실행 시 커넥션 고갈 현상 사라짐
---
# 3. MetricsUpdateScheduler 개선
### 3.1 문제

> 마찬가지로 전체 프로젝트 순회를 @Transactional 로 묶고 있었습니다.

```java
@Scheduled(cron = "0 */10 * * * *")
@Transactional  // ❌
public void updateMetrics() {
    List<Project> allProjects = projectRepository.findAll();

    for (Project project : allProjects) {
        updateProjectMetrics(project);  // 내부에서 OpenSearch I/O
    }
}
```

10분마다 실행되는데 매번 40초 이상 커넥션이 점유되었습니다.

---
### 3.2 해결

> 트랜잭션을 제거하고, 저장 로직만 새 트랜잭션으로 분리했습니다.

```java
@Scheduled(cron = "0 */10 * * * *")
public void updateMetrics() {
    List<Project> allProjects = projectRepository.findAll();

    for (Project project : allProjects) {
        var backend = getBackendMetrics(project);
        var frontend = getFrontendMetrics(project);
        saveMetricsInNewTx(project, backend, frontend);
    }
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
private void saveMetricsInNewTx(Project project, 
                                MetricsData backend, 
                                MetricsData frontend) {
    project.updateMetrics(backend, frontend);
    projectRepository.save(project);
}
```

---
# 4. JiraIntegrationService 개선

### 4.1 문제

> 트랜잭션 내부에서 Jira API 호출(WebClient.block)이 실행되고 있었습니다.

```java
@Transactional  // ❌
public JiraConnectResponse connect(JiraConnectRequest request) {
    var project = projectRepository.findById(...).orElseThrow();

    boolean connected = jiraApiClient.testConnection(...); // 5~10초 block
    // ...
    jiraConnectionRepository.save(connection);
}
```
### 4.2 해결

> 외부 API 호출을 트랜잭션에서 분리했습니다.

```java
public JiraConnectResponse connect(JiraConnectRequest request) {
    var project = projectRepository.findById(...).orElseThrow();

    boolean connected = jiraApiClient.testConnection(...);  // ✔ 트랜잭션 밖
    String encrypted = encryptionUtils.encrypt(request.jiraApiToken());

    return saveConnection(project, request, encrypted);
}

@Transactional
private JiraConnectResponse saveConnection(...) {
    JiraConnection saved = jiraConnectionRepository.save(connection);
    return jiraMapper.toConnectResponse(saved, ...);
}
```

---
# 5. WebClient 매번 생성 문제 해결

### 5.1 문제

> 요청마다 WebClient 인스턴스를 매번 새로 생성하고 있었습니다.

```java
public AiAnalysisResponse analyzeLog(...) {
    WebClient webClient = createWebClient();  // ❌ 매 요청마다 생성
    return webClient.get().retrieve().bodyToMono(...).block();
}
```

### 5.2 해결

> 싱글톤으로 관리하도록 변경했습니다.

```java
@Component
public class AiServiceClient {

    private final WebClient webClient;

    public AiServiceClient(WebClient.Builder builder, 
                           @Value("${ai.service.base-url}") String baseUrl) {

        this.webClient = builder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();  // ✔ 애플리케이션당 1개
    }
}
```

---
# 6. JiraApiClient 캐싱 도입

> Jira API는 프로젝트마다 인증 정보가 다르기 때문에 프로젝트별 WebClient를 **LRU 캐시**로 관리했습니다.

```java
private final Map<String, WebClient> clientCache =
    Collections.synchronizedMap(new LinkedHashMap<>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, WebClient> eldest) {
            return size() > 50;  // 최대 50개 유지
        }
    });
```

---
# 7. Silent Failure 제거

> 기존에는 OpenSearch 예외를 무시하고 있었습니다.

```java
catch (IOException e) {
    return new HashMap<>();  // ❌ 조용히 실패
}
```

> 명시적으로 기록하고 알 수 있도록 수정했습니다.

```java
catch (IOException e) {
    log.error("OpenSearch 메트릭 조회 실패: projectUuid={}", projectUuid, e);
    throw new InfrastructureException("메트릭 조회 중 오류가 발생했습니다.", e);
}
```
---
# 8. 결론

정리해보면, 주요 문제는 **트랜잭션의 경계 설정이 잘못된 것**이었습니다.

### 배운 점

- 트랜잭션에는 DB 작업만 포함해야 한다
- OpenSearch 호출, 외부 API 호출, 파일 I/O는 모두 트랜잭션 밖에서 처리해야 한다
- WebClient는 싱글톤으로 관리해야 한다
- 예외는 조용히 무시하지 말고 반드시 로깅해야 한다