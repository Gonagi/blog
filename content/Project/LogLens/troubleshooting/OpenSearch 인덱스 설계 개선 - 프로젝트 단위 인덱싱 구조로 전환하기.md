## 1. 문제 상황

### 1.1 발생한 문제

모든 프로젝트의 로그가 OpenSearch의 **단일 인덱스**에 저장되고 있었습니다.

**문제 증상**
- 모든 프로젝트 로그가 `logs-2025.11` 같은 하나의 인덱스에 통합 저장
- 프로젝트별로 로그가 구분되지 않아 검색 효율 저하
- 특정 프로젝트 로그만 삭제하거나 백업하는 것이 불가능
- 프로젝트 수가 증가할수록 검색 성능 저하

---
### 1.2 목표

인덱스를 **프로젝트 단위로 분리**하여 `{PROJECT_UUID}-YYYY.MM` 형식으로 저장

**예시**
```
S13P31A306-2025.11 (프로젝트 A의 2025년 11월 로그)
S13P21A111-2025.11 (프로젝트 B의 2025년 11월 로그)
S13P31A306-2025.12 (프로젝트 A의 2025년 12월 로그)
```
---

### 1.3 환경 정보

**기술 스택**
- Fluent Bit 2.2
- Kafka 7.5.0 (KRaft)
- Logstash OSS 8.9.0
- OpenSearch 2.11.0
- Spring Boot 3.x

**데이터 흐름**
```
Spring Boot → Fluent Bit → Kafka → Logstash → OpenSearch
```
---
## 2. 원인 분석
### 2.1 Logstash 설정 문제

**기존 설정**
```ruby
output {
	opensearch {
		index => "logs-%{+YYYY.MM}" # 고정된 인덱스명
	}
}
```
**문제점**: Kafka에서 들어오는 모든 로그가 동일한 인덱스에 저장됨

---
### 2.2 Spring Boot Repository 문제
**기존 LogRepositoryImpl.java**
```java
private static final String INDEX_PATTERN = "logs-*"; // 모든 로그 검색

@Override
public LogSearchResult findWithCursor(String projectUuid, LogSearchRequest request) {
	SearchRequest searchRequest = new SearchRequest.Builder()
		.index(INDEX_PATTERN) // 고정된 인덱스 패턴
		.query(buildSearchQuery(projectUuid, request))
		.build();
		// ...
}
```
**문제점**: `logs-*` 패턴으로 모든 인덱스를 검색하여 프로젝트별 분리 불가능

---
### 2.3 파이프라인 일관성 부족

**현재 상황**
- Fluent Bit: `project_uuid`를 로그에 포함하여 Kafka로 전송
- Logstash: `project_uuid`를 받지만 인덱스 이름에 반영하지 않음
- OpenSearch: 프로젝트 구분 없이 단일 인덱스에 저장

**결과**: `project_uuid` 정보가 있음에도 활용되지 않음

---
## 3. 해결 방법
### 3.1 인덱스 네이밍 규칙 변경

**새로운 규칙**
```
{project_uuid}-%{+YYYY.MM}
```

**예시**
```
S13P31A306-2025.11 (프로젝트 S13P31A306의 2025년 11월 로그)
S13P31A306-2025.12 (프로젝트 S13P31A306의 2025년 12월 로그)
S13P21A111-2025.11 (프로젝트 S13P21A111의 2025년 11월 로그)
```

---
### 3.2 수정 사항 요약

| 구성 요소                            | 수정 내용                                    | 목적                  |
| -------------------------------- | ---------------------------------------- | ------------------- |
| **docker-compose-fluentbit.yml** | `PROJECT_UUID` 환경 변수 전달 유지               | project_uuid 전송 보존  |
| **fluent-bit.conf**              | `project_uuid` 필드 Kafka 전송               | 로그에 프로젝트 식별자 포함     |
| **transform.lua**                | `new_record["project_uuid"]` 유지          | Logstash가 인덱스 식별 가능 |
| **logstash.conf**                | `index => "%{project_uuid}-%{+YYYY.MM}"` | 프로젝트별 인덱스 생성        |
| **LogRepositoryImpl.java**       | `getProjectIndexPattern()` 추가            | 프로젝트별 로그 조회 가능      |

---
## 4. 상세 수정 내역
### 4.1 docker-compose-fluentbit.yml

**환경 변수 확인**
```yaml
services:
  fluent-bit:
    image: fluent/fluent-bit:2.2
  
  environment:
    - PROJECT_UUID=${PROJECT_UUID} # 프로젝트 식별자

volumes:
  - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf:ro
  - ./transform.lua:/fluent-bit/scripts/transform.lua:ro
```
**변경 사항**: 없음 (기존 설정 유지)

---
### 4.2 fluent-bit.conf

**project_uuid 필드 추가**
```conf

[FILTER]
	Name record_modifier
	Match app.logs
	Record project_uuid ${PROJECT_UUID}
```
- 모든 로그에 `project_uuid` 필드 추가
- 환경 변수 `${PROJECT_UUID}` 값을 로그에 포함
- Kafka로 전송 시 자동으로 포함됨

---
### 4.3 transform.lua

**project_uuid 필드 유지**
```lua
function transform_log(tag, timestamp, record)
	local new_record = {}
	
	-- project_uuid 필드 반드시 포함
	new_record["project_uuid"] = record["project_uuid"] or "default-project"

	-- @timestamp만 유지 (timestamp는 Logstash에서 생성)
	new_record["@timestamp"] = record["@timestamp"] or record["timestamp"] or os.date("!%Y-%m-%dT%H:%M:%S.000Z")

	-- 기타 필드 처리
	new_record["trace_id"] = record["trace_id"]
	new_record["logger"] = record["logger"]
	new_record["message"] = record["message"]

	-- ...

	return 1, timestamp, new_record
end

```
**핵심 사항**
- `project_uuid` 필드가 없으면 기본값 `"default-project"` 설정
- Logstash가 이 값을 사용하여 인덱스 이름 결정

---
### 4.4 logstash.conf

**인덱스명 동적 생성**
```ruby
filter {
	# project_uuid 기본값 설정
	if ![project_uuid] or [project_uuid] == "" {
		mutate {
			add_field => { "project_uuid" => "default-project" }
		}
	}

	# 타임스탬프 생성
	if ![timestamp] {
		ruby {
			code => 'event.set("timestamp", Time.now.utc.strftime("%Y-%m-%dT%H:%M:%S.%3NZ"))'
		}
	}

	# ... 기타 필터 ...
}

output {
	opensearch {
		hosts => ["http://opensearch:9200"]
		index => "%{project_uuid}-%{+YYYY.MM}" # 핵심 변경!
		document_id => "%{[@metadata][doc_id]}"
		action => "create"
		retry_on_conflict => 3
	}

	stdout {
		codec => rubydebug { metadata => true }
	}
}
```
**변경 사항**
- `index => "logs-%{+YYYY.MM}"` → `index => "%{project_uuid}-%{+YYYY.MM}"`
- 프로젝트별로 별도 인덱스 생성

---
### 4.5 LogRepositoryImpl.java

**동적 인덱스 패턴 적용**
```java
@Repository
@RequiredArgsConstructor
public class LogRepositoryImpl implements LogRepository {

	private final OpenSearchClient openSearchClient;

	// 기존: private static final String INDEX_PATTERN = "logs-*";
	// 삭제: 동적 인덱스 패턴 사용

	/**
	 * 프로젝트별 인덱스 패턴 반환
	 */
	private String getProjectIndexPattern(String projectUuid) {
		return projectUuid + "-*"; // 예: S13P31A306-*
	}

	/**
	 * 커서 기반 로그 조회
	 */
	@Override
	public LogSearchResult findWithCursor(String projectUuid, LogSearchRequest request) {
		SearchRequest searchRequest = buildSearchRequestWithCursor(
			projectUuid,
			buildSearchQuery(projectUuid, request),
			buildSortOptions(request),
			request.getSize() + 1,
			request.getCursor()
		);
	
		SearchResponse<Log> response = openSearchClient.search(searchRequest, Log.class);
	
		return processSearchResponse(response, request.getSize());
	}

	/**
	 * SearchRequest 생성 (커서 기반)
	 */
	private SearchRequest buildSearchRequestWithCursor(
			String projectUuid,
			Query query,
			List<SortOptions> sortOptions,
			int size,
			String cursor) {
		SearchRequest.Builder builder = new SearchRequest.Builder()
			.index(getProjectIndexPattern(projectUuid)) // 동적 인덱스 패턴
			.query(query)
			.sort(sortOptions)
			.size(size);

		// 커서가 있으면 search_after 적용
		if (cursor != null && !cursor.isEmpty()) {
			builder.searchAfter(parseCursor(cursor));
		}

		return builder.build();
	}
	
	// ... 깉타 메서드들도 동일하게 getProjectIndexPattern(ProjectUuid) 사용
}
```

**핵심 변경 사항**
1. **고정 인덱스 패턴 제거**
```java
// 기존
private static final String INDEX_PATTERN = "logs-*";

// 변경 후
private String getProjectIndexPattern(String projectUuid) {
	return projectUuid + "-*";
}
```

2. **모든 검색 메서드에 동적 인덱스 적용**
	- `findWithCursor()`: 커서 기반 로그 조회
	- `findByTraceId()`: Trace ID 기반 조회
	- `existsByProjectUuid()`: 프로젝트 존재 여부 확인

---
## 5. 2차 문제 발생 (OpenSearch SQL 파서 오류)
### 5.1 발생한 오류

프로젝트별 인덱스 분리 후 다음과 같은 오류가 발생했습니다.
```
org.opensearch.index.IndexNotFoundException: no such index [46bf839a]
```
**오류 원인**: UUID에 포함된 하이픈(`-`)을 OpenSearch SQL 파서가 **마이너스 연산자로 잘못 인식**

---
### 5.2 문제 분석  

| 인덱스 이름                                         | SQL 파서의 인식                     | 결과      |
| ---------------------------------------------- | ------------------------------ | ------- |
| `logs-2025.11`                                 | `logs - 2025.11` (문자열 - 숫자)    | ✅ 정상 작동 |
| `46bf839a-ac04-3c05-a55c-b2b061db1e5c-2025.11` | `46bf839a - ac04 - 3c05 - ...` | ❌ 오류 발생 |

**구체적인 문제**
- 하이픈이 1개인 경우: 단순 문자열 구분으로 허용
- **하이픈이 여러 개일 경우**: 마이너스 연산자로 해석되어 파싱 실패
- 결과: `46bf839a-ac04-3c05-a55c-b2b061db1e5c-2025.11` 중 첫 번째 하이픈 이전 부분(`46bf839a`)만 인덱스명으로 인식

---
## 6. 최종 해결 방법 (2차 수정)
### 6.1 핵심 아이디어

> UUID 내부의 하이픈(`-`)을 **언더스코어(`_`)로 변환**하여, SQL 파서가 인덱스를 하나의 식별자로 인식하도록 변경

**변환 예시**

| 구분      | 기존 인덱스                                         | 변경 후 인덱스                                       |
| ------- | ---------------------------------------------- | ---------------------------------------------- |
| ❌ 오류 발생 | `46bf839a-ac04-3c05-a55c-b2b061db1e5c-2025.11` | -                                              |
| ✅ 최종 수정 | -                                              | `46bf839a_ac04_3c05_a55c_b2b061db1e5c-2025-11` |

---
### 6.2 logstash.conf (최종 수정)
```ruby
filter {
	# project_uuid 기본값 설정
	if ![project_uuid] or [project_uuid] == "" {
		mutate {
			add_field => { "project_uuid" => "default-project" }
		}
	}
	
	# ✅ project_uuid 변환 (하이픈 → 언더스코어)
	if [project_uuid] {
		mutate {
			gsub => ["project_uuid", "-", "_"]
		}
	}

	# 타임스탬프 생성
	if ![timestamp] {
		ruby {
			code => 'event.set("timestamp", Time.now.utc.strftime("%Y-%m-%dT%H:%M:%S.%3NZ"))'
		}
	}

	# ... 기타 필터 ...
}

output {
	opensearch {
		hosts => ["http://opensearch:9200"]
		index => "%{project_uuid}-%{+YYYY-MM}" # ✅ 최종 수정
		document_id => "%{[@metadata][doc_id]}"
		action => "create"
		retry_on_conflict => 3
	}

	stdout {
		codec => rubydebug { metadata => true }
	}
}
```

**핵심 변경 사항**
1. **project_uuid 하이픈 제거**
```ruby
mutate {
	gsub => ["project_uuid", "-", "_"]
}
```
- `gsub` 필터로 모든 하이픈을 언더스코어로 치환

2. **인덱스 날짜 형식 변경**
```ruby
# 기존: %{+YYYY.MM} → 2025.11
# 변경: %{+YYYY-MM} → 2025-11
index => "%{project_uuid}-%{+YYYY-MM}"
```

---
### 6.3 LogRepositoryImpl.java (최종 수정)

1. **인덱스 이름 형식이 변경됨**
   - Logstash에서 UUID의 하이픈을 언더스코어로 변환
   - 실제 인덱스: `46bf839a_ac04_3c05_a55c_b2b061db1e5c-2025-11`
   - Java에서도 동일한 변환 필요

2. **와일드카드 패턴 매칭**
   - 기존: `projectUuid + "-*"` → `46bf839a-ac04-3c05-a55c-b2b061db1e5c-*`
   - 변경: `projectUuid.replace('-', '_') + "-*"` → `46bf839a_ac04_3c05_a55c_b2b061db1e5c-*`

---

**OpenSearchUtils.java 추가**
```java
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class OpenSearchUtils {

    /**
     * 프로젝트별 인덱스 패턴 반환
     * Logstash에서 UUID의 하이픈을 언더스코어로 변환하므로
     * Java에서도 동일하게 변환하여 인덱스 패턴 생성
     *
     * @param projectUuid 프로젝트 UUID (하이픈 포함)
     * @return "{projectUuid_with_underscores}-*" 형식의 인덱스 패턴
     * @throws IllegalArgumentException projectUuid가 null이거나 비어있을 경우
     */
    public static String getProjectIndexPattern(String projectUuid) {
        if (Objects.isNull(projectUuid) || projectUuid.isBlank()) {
            throw new IllegalArgumentException("Project UUID는 null이거나 비어있을 수 없습니다.");
        }
        
        // UUID의 하이픈을 언더스코어로 변환
        // 예: 46bf839a-ac04-3c05-a55c-b2b061db1e5c → 46bf839a_ac04_3c05_a55c_b2b061db1e5c
        return projectUuid.replace('-', '_') + "-*";
    }
}
```

**LogRepositoryImpl.java 수정**
```java
@Repository
@RequiredArgsConstructor
public class LogRepositoryImpl implements LogRepository {

    private final OpenSearchClient openSearchClient;

    /**
     * SearchRequest 생성 (커서 기반)
     */
    private SearchRequest buildSearchRequestWithCursor(
            String projectUuid,
            Query query,
            List<SortOptions> sortOptions,
            int size,
            String cursor) {
        
        SearchRequest.Builder builder = new SearchRequest.Builder()
                .index(OpenSearchUtils.getProjectIndexPattern(projectUuid))  // Utils 메서드 사용
                .query(query)
                .sort(sortOptions)
                .size(size);

        if (cursor != null && !cursor.isEmpty()) {
            builder.searchAfter(parseCursor(cursor));
        }

        return builder.build();
    }

    // ... 기타 메서드들도 동일하게 OpenSearchUtils.getProjectIndexPattern(projectUuid) 사용 ...
}
```

**변경 사항 요약**

| 항목 | 기존 | 변경 후 |
|------|------|--------|
| **Utils 클래스** | 없음 | `OpenSearchUtils` 추가 |
| **인덱스 패턴 생성** | `projectUuid + "-*"` | `projectUuid.replace('-', '_') + "-*"` |
| **매칭되는 인덱스** | `46bf839a-ac04-...-*` (매칭 실패) | `46bf839a_ac04_...-*` (매칭 성공) |
| **Null 체크** | 없음 | `IllegalArgumentException` 발생 |


**실제 동작 예시**
```java
// 입력
String projectUuid = "46bf839a-ac04-3c05-a55c-b2b061db1e5c";

// 출력
String indexPattern = OpenSearchUtils.getProjectIndexPattern(projectUuid);
// → "46bf839a_ac04_3c05_a55c_b2b061db1e5c-*"

// 매칭되는 인덱스
// ✅ 46bf839a_ac04_3c05_a55c_b2b061db1e5c-2025-11
// ✅ 46bf839a_ac04_3c05_a55c_b2b061db1e5c-2025-12
```
---
## 7. 최종 결과

### 7.1 개선 전후 비교

| 구분 | 1차 시도 | 2차 수정 (최종) |
|------|---------|---------------|
| **인덱스 이름** | `46bf839a-ac04-3c05-a55c-b2b061db1e5c-2025.11` | `46bf839a_ac04_3c05_a55c_b2b061db1e5c-2025-11` |
| **SQL 파서 오류** | ❌ IndexNotFoundException | ✅ 정상 작동 |
| **Java 코드 수정** | 불필요 (착각) | ✅ 필수 (OpenSearchUtils 추가) |
| **검색 성능** | 빠름 (프로젝트별 제한) | 빠름 (프로젝트별 제한) |
| **데이터 분리** | 프로젝트별 완전 분리 | 프로젝트별 완전 분리 |

---

## 8. 전체 데이터 흐름
```
Spring Boot (로그 생성)
    ↓
Fluent Bit
    - transform.lua: project_uuid 추가
    - record_modifier: PROJECT_UUID 환경 변수 주입
    ↓
Kafka (application-logs 토픽)
    - project_uuid 필드 포함된 로그 저장
    - 예: "project_uuid": "46bf839a-ac04-3c05-a55c-b2b061db1e5c"
    ↓
Logstash
    - project_uuid 하이픈 → 언더스코어 변환
    - 변환 후: "46bf839a_ac04_3c05_a55c_b2b061db1e5c"
    - index => "%{project_uuid}-%{+YYYY-MM}"
    ↓
OpenSearch
    - 46bf839a_ac04_3c05_a55c_b2b061db1e5c-2025-11 (인덱스 생성)
    - S13P31A306-2025-11 (인덱스 생성)
    ↓
LogRepositoryImpl (Spring Boot)
    - OpenSearchUtils.getProjectIndexPattern(projectUuid)
    - UUID 하이픈 → 언더스코어 변환
    - 결과: "46bf839a_ac04_3c05_a55c_b2b061db1e5c-*"
    - 와일드카드로 인덱스 매칭 성공
    ↓
React Dashboard
    - 프로젝트별 로그 조회 및 분석
```

---
## 9. 주요 장점

**프로젝트 단위 관리**
- 각 프로젝트 로그를 독립적으로 색인 및 삭제 가능
- 특정 프로젝트만 백업하거나 아카이빙 가능

**검색 성능 향상**
- 인덱스 스캔 범위 축소
- 불필요한 프로젝트 데이터 제외
- 예: 프로젝트 A 검색 시 프로젝트 B, C 데이터는 스캔하지 않음

**확장성 확보**
- 프로젝트 수가 증가해도 각각 독립 인덱스로 분산
- 특정 프로젝트의 로그량이 증가해도 다른 프로젝트에 영향 없음

**운영 관리 편의성**
- 프로젝트별 데이터 보관 정책 설정 가능
- 특정 프로젝트 로그만 Cold Storage로 이동 가능

**SQL 호환성**
- OpenSearch SQL 쿼리 정상 작동
- Kibana 등 SQL 기반 분석 도구 사용 가능

---
## 10. 결론

**최종 해결 방법**
- **인덱스명**: `{project_uuid (언더스코어)}-%{+YYYY-MM}`
- **핵심 수정**: 
  1. Logstash에서 project_uuid의 하이픈을 언더스코어로 변환
  2. Java에서도 OpenSearchUtils로 동일한 변환 적용

**최종 효과**
- 프로젝트별 로그 완전 분리
- OpenSearch SQL 파서 오류 해결
- 검색 성능 향상 (프로젝트별 인덱스 제한)
- 확장 가능한 로그 저장 구조 확보
- SQL 기반 분석 도구 호환성 확보
- Logstash와 Java 간 인덱스 패턴 일관성 확보