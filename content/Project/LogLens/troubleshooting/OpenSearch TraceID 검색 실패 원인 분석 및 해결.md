## 1. 문제 상황
### 1.1 발생한 문제
Trace ID 기반 로그 검색 시 OpenSearch에서 다음과 같은 오류가 발생했습니다.
``` text
OpenSearchException: [search_phase_execution_exception] all shards failed
```

**문제 증상**
- 일반 로그 검색은 정상 동작
- Trace ID 기반 검색만 실패
- 쿼리 필터는 정상이지만 Aggregation에서 오류 발생
---
### 1.2 환경 정보

**기술 스택**
- OpenSearch 2.11.0
- Spring Boot 3.x
- Logstash OSS 8.9.0

**인덱스 구조**
``` text
831776ac_2d47_3e23_83b9_7619972f0cbf_2025_11
```
---
## 2. 원인 분석
### 2.1 초기 가설

**의심 원인**
- `trace_id` 필드 매핑 문제
- 인덱스 템플릿과 실제 인덱스 매핑 불일치
---
### 2.2 인덱스 템플릿 확인
```bash
curl -s "localhost:9200/_index_template/logs-template" | jq
```

**결과**: 템플릿은 정상적으로 정의됨
- `trace_id`: text 타입 + keyword 서브필드 포함
- `log_level`: keyword 타입으로 정의
- `source_type`: keyword 타입으로 정의
---
### 2.3 실제 인덱스 매핑 확인
```bash
curl -X GET "http://localhost:9200/831776ac_2d47_3e23_83b9_7619972f0cbf_2025_11/_mapping?pretty"
```

**문제 발견**
```json
{
  "trace_id": {
    "type": "text",
    "fields": {
      "keyword": {
        "type": "keyword",
        "ignore_above": 256
      }
    }
  },
  "log_level": {
    "type": "keyword"  // 정상
  },
  "source_type": {
    "type": "keyword"  // 정상
  }
}
```

**주요 발견**
- `trace_id`: text + keyword (multi-field)
- `log_level`: keyword 단독
- `source_type`: keyword 단독
---
### 2.4 상세 로깅을 통한 원인 파악

**쿼리 필터 (정상)**
```java
Filter[0]: project_uuid.keyword = "a0b4a1a9-d2ae-3672-a0e1-3a4863922226" ✅
Filter[1]: trace_id.keyword = "50bacb90-4995-4c36-b459-6e6bda8b9c42" ✅
Filter[2]: timestamp range ✅
```

**Aggregation (문제 발견)**
```java
// 기존 코드
.aggregations("level_counts", a -> a.terms(t -> t.field("log_level")))
```

**문제 원인**: Java 코드에서 `OpenSearchField` Enum이 잘못 정의됨
```java
// 잘못된 정의
LOG_LEVEL("log_level"),        // keyword 타입인데 그대로 사용 ✅
SOURCE_TYPE("source_type"),    // keyword 타입인데 그대로 사용 ✅
TRACE_ID("trace_id"),          // ❌ text 타입인데 .keyword 없이 사용
PROJECT_UUID("project_uuid")   // ❌ text 타입인데 .keyword 없이 사용
```

---
### 2.5 근본 원인

**핵심 문제**
1. **필드 타입 혼동**
   - Multi-field (text + keyword): `.keyword` 필요
   - 단일 keyword: `.keyword` 불필요

2. **Java 코드의 잘못된 필드명 사용**
   - `trace_id` → `trace_id.keyword` 필요
   - `project_uuid` → `project_uuid.keyword` 필요
   - `log_level` → 그대로 사용 (이미 keyword)
   - `source_type` → 그대로 사용 (이미 keyword)

---
## 3. OpenSearch 필드 타입 이해
### 3.1 두 가지 필드 타입

**text 타입 (분석됨, 전문 검색용)**
- **analyzer(분석기)**를 적용해서 문장을 단어 단위로 분리
- 예: `"ERROR message"` → `["error", "message"]`
- **match, match_phrase** 쿼리에서 사용
- 부분 일치, 유사 검색 가능
- 정확한 매칭에는 부적합

**keyword 타입 (비분석, 정확 매칭용)**
- 분석기 적용 없음 (입력 그대로 저장)
- 부분 검색 불가, 오직 정확 매칭만 가능
- 정렬, 집계(aggregation), 필터링에 적합

---
### 3.2 Multi-field 매핑

**구조**
```json
"message": {
  "type": "text",
  "fields": {
    "keyword": {
      "type": "keyword",
      "ignore_above": 256
    }
  }
}
```

**특징**
- 같은 데이터가 두 가지 형태로 저장
- `message`: 분석된 형태 (전문 검색용)
- `message.keyword`: 분석되지 않은 형태 (정확 매칭용)
---
### 3.3 실제 인덱스 매핑 분석

**Multi-field 구조 (text + keyword)**
```json
"project_uuid": {
  "type": "text",
  "fields": {
    "keyword": {
      "type": "keyword"
    }
  }
},
"trace_id": {
  "type": "text",
  "fields": {
    "keyword": {
      "type": "keyword",
      "ignore_above": 256
    }
  }
},
"message": {
  "type": "text",
  "fields": {
    "keyword": {
      "type": "keyword",
      "ignore_above": 256
    }
  }
}
```

**단일 keyword 구조**
```json
"level": { "type": "keyword" },
"log_level": { "type": "keyword" },
"source_type": { "type": "keyword" },
"service_name": { "type": "keyword" },
"logger": { "type": "keyword" },
"layer": { "type": "keyword" },
"method_name": { "type": "keyword" },
"class_name": { "type": "keyword" },
"thread_name": { "type": "keyword" }
```

---
## 4. 해결 방법

### 4.1 OpenSearchField Enum 수정

**기존 코드 (잘못됨)**
```java
@Getter
@RequiredArgsConstructor
public enum OpenSearchField {
    TRACE_ID("trace_id"),              // ❌ text 타입인데 .keyword 없음
    COMPONENT_NAME("component_name"),
    PROJECT_UUID("project_uuid"),       // ❌ text 타입인데 .keyword 없음
    SOURCE_TYPE("source_type"),         // ✅ keyword 타입, 정상
    LOG_LEVEL("level");                 // ✅ keyword 타입, 정상
}
```

**수정된 코드 (정상)**
```java
@Getter
@RequiredArgsConstructor
public enum OpenSearchField {
    TRACE_ID("trace_id.keyword"),              // ✅ multi-field이므로 .keyword 추가
    COMPONENT_NAME("component_name"),
    PROJECT_UUID("project_uuid.keyword"),      // ✅ multi-field이므로 .keyword 추가
    SOURCE_TYPE("source_type"),                // ✅ 단일 keyword, 그대로 유지
    LOG_LEVEL("level");                        // ✅ 단일 keyword, 그대로 유지
}
```

---
### 4.2 필드별 사용 규칙

| 필드 | 매핑 타입 | Java에서 사용 | `.keyword` 필요 | 이유 |
|------|----------|--------------|----------------|------|
| `project_uuid` | text + keyword | `project_uuid.keyword` | ✅ 필요 | Multi-field 구조 |
| `trace_id` | text + keyword | `trace_id.keyword` | ✅ 필요 | Multi-field 구조 |
| `message` | text + keyword | `message` (검색), `message.keyword` (필터) | 용도에 따라 | Multi-field 구조 |
| `level` | keyword | `level` | ❌ 불필요 | 단일 keyword |
| `log_level` | keyword | `log_level` | ❌ 불필요 | 단일 keyword |
| `source_type` | keyword | `source_type` | ❌ 불필요 | 단일 keyword |
| `logger` | keyword | `logger` | ❌ 불필요 | 단일 keyword |
| `layer` | keyword | `layer` | ❌ 불필요 | 단일 keyword |

---
### 4.3 쿼리 예시

**정상 쿼리 (수정 후)**
```java
// Multi-field: .keyword 사용
builder.filter(q -> q.term(t -> t
    .field("trace_id.keyword")
    .value("50bacb90-4995-4c36-b459-6e6bda8b9c42")
));

builder.filter(q -> q.term(t -> t
    .field("project_uuid.keyword")
    .value("a0b4a1a9-d2ae-3672-a0e1-3a4863922226")
));

// 단일 keyword: 그대로 사용
builder.filter(q -> q.term(t -> t
    .field("log_level")
    .value("ERROR")
));

builder.filter(q -> q.term(t -> t
    .field("source_type")
    .value("BE")
));
```

**잘못된 쿼리 (수정 전)**
```java
// ❌ Multi-field인데 .keyword 없이 사용
builder.filter(q -> q.term(t -> t
    .field("trace_id")  // 잘못됨
    .value("50bacb90-4995-4c36-b459-6e6bda8b9c42")
));

// ❌ 단일 keyword인데 .keyword 추가
builder.filter(q -> q.term(t -> t
    .field("log_level.keyword")  // 잘못됨
    .value("ERROR")
));
```

---

## 5. 왜 두 가지 타입이 존재하는가?

### 5.1 OpenSearch의 데이터 저장 전략

| 구분 | 저장 방식 | analyzer 적용 | 주요 용도 | 예시 필드 |
|------|----------|--------------|----------|----------|
| **text** | 단어 단위로 분리 | ✅ 적용 | 전문 검색 (부분 일치) | message, stacktrace |
| **keyword** | 전체 문자열 그대로 | ❌ 미적용 | 필터링, 정렬, 집계 | level, source_type, trace_id |
| **multi-field** | 둘 다 저장 | 선택적 | 검색 + 필터 모두 | project_uuid, trace_id, message |

---
### 5.2 실제 사용 예시

**로그 메시지 검색 (text 사용)**
```java
// "NullPointerException" 단어가 포함된 로그 검색
Query query = Query.of(q -> q.match(m -> m
    .field("message")  // text 필드 사용
    .query("NullPointerException")
));
```

**정확한 Trace ID 필터링 (keyword 사용)**
```java
// 정확히 일치하는 trace_id 검색
Query query = Query.of(q -> q.term(t -> t
    .field("trace_id.keyword")  // keyword 서브필드 사용
    .value("50bacb90-4995-4c36-b459-6e6bda8b9c42")
));
```

**로그 레벨별 집계 (keyword 사용)**
```java
// 로그 레벨별 개수 집계
.aggregations("level_counts", a -> a.terms(t -> t
    .field("log_level")  // 단일 keyword 사용
));
```

---
## 6. Logstash 파이프라인과의 연관성

### 6.1 Logstash에서의 필드 정규화
```ruby
# log_level 정규화
mutate { uppercase => ["log_level"] }
mutate { copy => { "log_level" => "level" } }

# source_type 정규화
if ![source_type] or [source_type] not in ["FE", "BE", "INFRA"] {
  mutate { replace => { "source_type" => "BE" } }
}
```
**결과**
- `log_level`, `level`, `source_type`은 이미 정규화된 keyword 값으로 전송
- OpenSearch에서 keyword 타입으로 자동 매핑
- `.keyword` 서브필드를 만들 필요 없음

---
### 6.2 인덱스 템플릿 우선 생성의 중요성

**문제 상황**
1. Logstash가 데이터를 먼저 전송
2. OpenSearch가 자동으로 필드를 동적 매핑
3. 의도하지 않은 타입으로 매핑될 수 있음

**해결 방법**
1. 인덱스 템플릿을 먼저 생성
2. Logstash 재시작하여 데이터 재적재
3. 템플릿에 따라 올바른 타입으로 매핑
```bash
# 1. 기존 인덱스 삭제
curl -s "localhost:9200/_cat/indices?h=index" | grep "_2025_" | \
  xargs -I {} curl -X DELETE "localhost:9200/{}"

# 2. 인덱스 템플릿 생성
./create_opensearch_index.sh

# 3. Logstash 재시작
docker restart loglens-logstash
```

---
## 7. 결론

### 7.1 핵심 요약

**필드 타입별 사용 규칙**

| 구분          | 타입             | Java 사용         | `.keyword` 필요 |
| ----------- | -------------- | --------------- | ------------- |
| Multi-field | text + keyword | `field.keyword` | ✅ 필요          |
| 단일 keyword  | keyword        | `field`         | ❌ 불필요         |

**주요 필드 정리**
```java
// Multi-field (text + keyword)
PROJECT_UUID("project_uuid.keyword")  // ✅
TRACE_ID("trace_id.keyword")          // ✅
MESSAGE("message")                    // 검색용
MESSAGE_KEYWORD("message.keyword")    // 필터용

// 단일 keyword
LOG_LEVEL("level")                    // ✅
SOURCE_TYPE("source_type")            // ✅
LOGGER("logger")                      // ✅
LAYER("layer")                        // ✅
```

---
### 7.2 교훈

**인덱스 템플릿 우선 생성**
- 데이터 전송 전에 반드시 인덱스 템플릿을 먼저 생성
- 동적 매핑에 의존하지 말 것

**Text vs Keyword 이해**
- Text: 전문 검색용 (분석됨)
- Keyword: 정확한 매칭, 정렬, 집계용
- Aggregation에는 반드시 keyword 타입 사용

**필드 타입 확인**
- 쿼리 작성 전 인덱스 매핑 확인
- Multi-field 여부에 따라 `.keyword` 사용 결정
- 상세 로깅으로 쿼리 구조 검증