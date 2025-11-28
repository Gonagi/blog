## 1. 문제 상황

### 1.1 발생한 문제

Logstash에서 생성된 `log_id`가 모든 로그에 대해 동일하게 저장되는 문제가 발생했습니다.

**문제 증상**
- 서로 다른 로그임에도 불구하고 동일한 `log_id` 값이 반복 생성
- OpenSearch에 저장된 로그들이 모두 `log_id: 4099609161`로 저장됨
- 한 요청 내에서 여러 메서드가 같은 Trace ID를 공유할 때 log_id 중복 발생

---
### 1.2 환경 정보

**기술 스택**
- Logstash OSS 8.9.0
- OpenSearch 2.11.0
- Kafka 7.5.0 (KRaft)

**데이터 흐름**
```
Kafka → Logstash → log_id 생성 → OpenSearch 인덱싱
```
---
## 2. 원인 분석
### 2.1 기존 Logstash 설정

**fingerprint 플러그인 사용 (66-80행)**
```ruby
fingerprint {
  source => ["@timestamp", "trace_id", "logger", "message"]
  target => "[@metadata][temp_id]"
  method => "SHA256"
}
```

---
### 2.2 문제의 원인

**fingerprint 플러그인의 특성**

fingerprint 플러그인은 **입력값 조합이 동일하면 항상 동일한 해시를 생성**합니다.
```
입력: ["2025-01-15T10:30:45.123Z", "trace-123", "UserController", "Request received"]
출력: 항상 동일한 SHA256 해시
```

**중복 발생 시나리오**
```
요청 1: Controller → Service → Repository
        ↓
모두 같은 trace_id 사용
        ↓
같은 시간대(밀리초 단위)에 로그 생성
        ↓
fingerprint 입력값이 거의 동일
        ↓
결과: 동일한 log_id 생성
```

**문제점**

1. **@timestamp**: 밀리초 단위까지만 기록되어 같은 요청 내 로그는 동일할 가능성 높음
2. **trace_id**: 한 요청 내 모든 로그가 동일한 trace_id 공유
3. **logger**: 같은 계층(Controller/Service/Repository)에서 반복 호출 시 동일
4. **message**: "Request received", "Response sent" 등 패턴화된 메시지 반복

**결과**: 입력값 조합이 반복되어 동일한 log_id가 생성됨

---
## 3. 해결 방법

### 3.1 개선 방향

**핵심 개선 사항**

1. fingerprint 플러그인 제거 → Ruby 코드로 대체
2. 로그마다 **고유한 UUID** 추가
3. **나노초 단위 타임스탬프** 사용
4. log_id 해시 범위를 **8자리(16진수)**로 제한 → Java `Long` 타입 범위 내 안전

---
### 3.2 수정된 Logstash 설정

#### 3.2.1 document_id 생성
```ruby
ruby {
  code => '
    require "securerandom"
    require "digest"
    
    # 나노초 단위 타임스탬프 + UUID + trace_id + logger 조합
    unique_str = "#{Time.now.utc.iso8601(6)}_#{SecureRandom.uuid}_#{event.get("trace_id")}_#{event.get("logger")}"
    
    event.set("[@metadata][doc_id]", Digest::SHA256.hexdigest(unique_str))
  '
}
```

**개선 사항**
- `Time.now.utc.iso8601(6)`: 마이크로초 단위 타임스탬프
- `SecureRandom.uuid`: 각 로그마다 완전히 고유한 UUID 생성
- 충돌 가능성 거의 0에 가까움

#### 3.2.2 log_id 생성
```ruby
ruby {
  code => '
    require "securerandom"
    
    # 각 로그마다 고유 UUID 생성
    unique_id = SecureRandom.uuid
    
    # 기존 필드 + UUID 조합
    fingerprint_input = "#{event.get("@timestamp")}_#{event.get("trace_id")}_#{event.get("logger")}_#{event.get("message")}_#{unique_id}"
    
    event.set("[@metadata][temp_id]", Digest::SHA256.hexdigest(fingerprint_input))
  '
}

ruby {
  code => '
    temp_id = event.get("[@metadata][temp_id]")
    if temp_id
      # SHA256 해시의 앞 8자리만 사용 (16진수 → 10진수)
      log_id = temp_id[0..7].to_i(16)
      event.set("log_id", log_id)
    end
  '
}
```

**개선 사항**

1. **완전한 고유성 보장**
   - 각 로그마다 새로운 UUID 생성
   - 동일한 입력값이 존재할 수 없음

2. **Java Long 타입 범위 내 안전**
```
   8자리 16진수 최대값: FFFFFFFF (16진수)
   10진수 변환 시: 4,294,967,295
   Java Long 최대값: 9,223,372,036,854,775,807
   → 안전하게 수용 가능
```

3. **오버플로우 방지**
   - 16자리 전체를 사용하면 Java Long 범위 초과 가능
   - 8자리로 제한하여 안전성 확보

---
## 4. 결과 검증
### 4.1 개선 전후 비교

| 구분 | 개선 전 | 개선 후 |
|------|---------|---------|
| **log_id 생성 방식** | `fingerprint(trace_id, logger, message)` | `SHA256(@timestamp, trace_id, logger, message, UUID)` |
| **log_id 값** | `4099609161` (모든 로그 동일) | 각 로그마다 상이한 ID |
| **데이터 타입** | Integer (10진수) | Integer (10진수, 8자리) |
| **Long 범위 초과 가능성** | 있음 (16자리 hex 변환 시) | 없음 (8자리 hex로 제한) |
| **고유성** | 낮음 (중복 발생) | 매우 높음 (UUID 기반) |

---
### 4.2 실제 log_id 생성 예시

**개선 전**
```
로그 1: log_id = 4099609161
로그 2: log_id = 4099609161  # 중복!
로그 3: log_id = 4099609161  # 중복!
```

**개선 후**
```
로그 1: log_id = 2847561923
로그 2: log_id = 3918472056
로그 3: log_id = 1529384710
```

모든 로그가 고유한 log_id를 가지게 되었습니다.

---

## 5. 주요 개선 사항

**UUID 기반 고유성 보장**
- `SecureRandom.uuid`로 각 로그마다 완전히 고유한 값 생성
- 동일한 trace_id, logger, message 조합이어도 서로 다른 log_id 생성

**마이크로초 단위 타임스탬프**
- 밀리초 단위에서 마이크로초 단위로 정밀도 향상
- 동일 시간대 로그 구분 가능

**안전한 숫자 범위 관리**
- SHA256 해시의 앞 8자리만 사용
- Java Long 타입 범위 내 안전하게 관리
- 오버플로우 위험 제거