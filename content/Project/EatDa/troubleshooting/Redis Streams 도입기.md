# Contents
## 1. 현재 상황
## 2. Message Queue 란?
## 3. Redis Streams을 선택한 이유
## 4. Redis Streams 적용
## 5. 성능 모니터링 & 부하 테스트
## 6. 적용 후 결과 & 배운 점
---
# 1.현재 사항
## 1.1. 제약 사항
- **서버는 1대만 제공**되며, 모든 서비스 구성 요소(프론트엔드, 백엔드, DB, AI 등)를 해당 인스턴스에 설치해야 함
- **고정 리소스** 환경이므로, 고가용성/오토스케일링/분산처리는 불가능
- 도커 기반의 **컨테이너 분리** 및 **경량화 설계**가 필요

> 단일 EC2 서버 환경이라는 제약으로 인해, 전체 시스템은 MSA가 아닌 **모놀리식 또는 모듈러 모놀리식 구조**로 구성되어야 하며, Queue, Redis, Database 등도 단일 노드 기반으로 운영해야 함
---
## 1.2. 서비스 특성
본 서비스의 주요 흐름은 **Spring 백엔드와 FastAPI AI 서버 간의 빈번한 통신**에 기반합니다.  
특히 이미지/영상 생성과 같은 연산이 서비스의 핵심 기능을 이루고 있으며, 요청량이 몰릴 경우 안정적으로 처리하는 구조가 필요했습니다.

- **리뷰 이미지 생성** : 사용자가 작성한 리뷰를 시각적으로 표현하는 이미지 변환
- **리뷰 숏츠 생성** : 텍스트 리뷰를 기반으로 한 숏폼 영상 자동 생성
- **이벤트 이미지 생성** : 가게 이벤트/프로모션을 위한 홍보 이미지 생성
- **메뉴 포스터 이미지 생성** : 업장 메뉴 정보를 기반으로 한 포스터 이미지 생성

> 즉, 서비스는 단순한 CRUD API 중심이 아니라 **비동기적이고 연산량이 큰 AI 요청**이 핵심이며, 이를 효율적으로 분배하고 관리할 수 있는 메시지 큐 구조가 필수적이었습니다.
---
## 1.3. 비동기 처리의 필요성

단일 서버 환경에서 **AI 연산 요청(이미지/영상 생성)** 은 CPU와 메모리를 많이 소모합니다.  
만약 이를 **동기 방식**으로 처리한다면, 사용자의 요청은 AI 연산이 끝날 때까지 대기해야 하며, 이는 곧 응답 지연과 서비스 품질 저하로 이어집니다.
![서버 내부의 비동기 처리](https://i.imgur.com/aF3zlzm.png)

하지만 단순히 서버 내부의 비동기 처리만으로는 다음과 같은 한계가 존재합니다:
1. **Consumer 서버 장애 시 요청 손실 위험**
    - 처리 중이던 요청이 사라져 복구가 어렵습니다.
2. **트래픽 폭증 시 서버 과부하**
    - 순간적으로 많은 요청이 몰리면, 모든 작업을 직접 처리해야 하므로 서버가 버티지 못합니다.
3. **서버 장애 전파 문제**
    - 한 서비스에서 장애가 발생하면, 다른 서비스까지 연쇄적으로 영향을 받을 수 있습니다.

> 즉, **서버 내부 비동기 처리만으로는 안정성과 확장성에 근본적인 한계가 있습니다.**  
> 이 문제를 해결하기 위해, 요청을 안전하게 저장하고 분산 처리할 수 있는 **메시지 큐(Message Queue)** 가 필요합니다.
---
# 2. Message Queue 란?
## 2.1. Message Queue
![메시지 큐](https://i.imgur.com/ksFkwv3.png)

Message queue는 **Producer(발행자)와 Consumer(구독자)** 를 분리하여, 서로 직접 통신하지 않고 queue를 매개로 메시지를 주고받을 수 있도록 해줍니다.
1. **Producer(Spring)**
    - 사용자의 요청을 받아 메시지를 생성하고 큐에 적재합니다.
    - Message queue에 넣는 순간, 요청은 안정적으로 저장되므로 손실 위험이 줄어듭니다.
2. **Message Queue**
    - 메시지를 안전하게 보관하며, Consumer가 가져갈 때까지 대기합니다.
    - 실패 시 재시도, 순서 보장, 백프레셔(Backpressure) 등 안정성을 높여주는 기능을 제공합니다.
3. **Consumer(FastAPI AI 서버)**
    - 큐에서 메시지를 꺼내 실제 연산을 수행합니다.
    - Consumer는 독립적으로 확장될 수 있고, 장애 시에도 큐에 메시지가 남아있으므로 재처리가 가능합니다.
---
### 2.2. 메시지 큐의 장점
- **안정성** : 서버 다운이나 네트워크 오류에도 메시지가 유실되지 않음
- **유연성** : Producer와 Consumer가 느슨하게 결합되어, 독립적으로 배포/확장 가능
- **백프레셔** : Consumer 처리 속도에 맞춰 메시지가 흘러가므로, 트래픽 폭증에도 안정적으로 대응 가능
- **재처리 가능** : 실패한 작업은 다시 큐에서 꺼내 처리할 수 있음    

> Message queue는 **비동기 처리의 한계를 극복하고 안정적인 서비스 아키텍처를 만드는 핵심 도구**입니다.  
---
# 3. Redis Streams 선택한 이유

메시지 큐 도입을 고민하면서 후보군은 **RabbitMQ, Redis Queue, Redis Streams**였습니다.

![왜 Redis Streams인가](https://i.imgur.com/1Ma1BcW.png)

## 3.1. RabbitMQ
- 강력한 기능과 안정성을 제공하지만, **단일 EC2 환경**에서는 별도의 브로커 프로세스를 운영해야 합니다.
- 이는 서버 리소스를 더 점유하고, 설정 및 모니터링 오버헤드가 크기 때문에 제약된 환경에서는 적합하지 않았습니다.
## 3.2. Redis Queue
- 구현이 간단하고 빠르지만, 기본적으로 **재처리·순서 보장·DLQ(Dead Letter Queue)** 기능을 제공하지 않습니다.
- 장애나 예외 상황에 대한 대응 로직을 **모두 수동으로 구현**해야 하므로 운영 부담이 크고, 안정성 확보가 어렵습니다.
## 3.3. Redis Streams
- Redis의 기본 기능을 활용하면서도 **메시지 스트리밍**을 지원합니다.
- Redis Streams는 **Consumer Group, 재처리(ACK/NACK), 순서 보장**을 표준으로 지원합니다.  
- 또한 DLQ는 내장 기능은 아니지만, Redis가 제공하는 명령어(XCLAIM, XPENDING 등)를 활용해 손쉽게 구현할 수 있습니다.
- 단일 노드 환경에서도 가볍게 적용 가능하고, 기존 Redis 운영 경험을 재활용할 수 있다는 점도 큰 장점이었습니다.

| 구분                          | **Redis Queue (List 기반, RQ 등)**            | **Redis Streams**                                 |
| --------------------------- | ------------------------------------------ | ------------------------------------------------- |
| **구현 난이도**                  | 매우 단순 (`LPUSH` + `BRPOP` 정도로 구현 가능)        | 상대적으로 복잡 (XADD, XREADGROUP, ACK 등 다양한 명령어 필요)     |
| **메시지 순서 보장**               | 단일 Consumer일 경우 보장(멀티 Consumer에선 직접 관리 필요) | 메시지 ID 기반으로 순서 보장                                 |
| **재처리 (Failover)**          | 기본 제공 없음 → 실패 시 로직 직접 구현 필요                | Pending List + ACK/NACK 지원, 재처리 가능                |
| **Consumer 관리**             | 단순 Polling → 여러 Consumer 협업 시 충돌 가능        | Consumer Group 지원 (워크로드 분배, 상태 관리)                |
| **DLQ (Dead Letter Queue)** | 내장 기능 없음 → 직접 구현 필요                        | 내장 DLQ 없음→ 그러나 XPENDING, XCLAIM 등으로 손쉽게 구현 가능     |
| **백프레셔 (Backpressure)**     | 직접 제어해야 함                                  | 기본적으로 Consumer 처리 속도에 맞춰 조율 가능                    |
| **리소스 사용량**                 | 가볍고 단순 (메타데이터 관리 최소화)                      | 메시지 ID, Pending Entry 등 메타데이터 관리 → 상대적으로 리소스 사용 ↑ |
| **적합한 사용처**                 | 단순 작업 대기열 (알림, 이메일 전송 등)                   | 안정성과 확장성이 필요한 비동기 처리 (로그 처리, 이벤트 스트리밍, 대규모 파이프라인) |

> 따라서 저희는 **재처리·순서·DLQ를 표준으로 지원하는 Redis Streams**를 채택해 **생성 파이프라인을 비동기화**했습니다.

---
# 4. Redis Streams 적용
## 4.1. 시스템 아키텍처
저희 서비스의 Redis Streams 적용 대상은 **리뷰 생성, 메뉴 포스터 생성, 이벤트 에셋 생성**입니다.  
각 작업은 **Spring 백엔드**에서 요청을 받아 **Redis Streams**에 메시지를 적재하고, **FastAPI AI 서버**가 해당 메시지를 구독하여 실제 이미지/영상 생성을 수행하는 구조입니다.
![Redis Streams 시스템 아키텍처](https://i.imgur.com/p2QYqIW.png)

- **Spring Producer**    
    - 사용자 요청을 수신하고, 생성 작업을 메시지로 변환하여 Redis Streams에 Publish합니다.
    - 각 작업 유형별로 **스트림 키**를 분리하여 관리합니다.
        - 리뷰 생성 : `review.asset.generate`
        - 메뉴 포스터 생성 : `menu.poster.generate`
        - 이벤트 에셋 생성 : `event.asset.generate`
- **Redis Streams**
    - 메시지를 안전하게 저장하며, Consumer Group 단위로 분배합니다.
    - Consumer가 처리하지 못한 메시지는 Pending 상태로 남아, 재처리 및 DLQ 구성이 가능합니다.
- **FastAPI Consumer**
    - Redis Streams를 Subscribe하고, 각 작업별 메시지를 비동기적으로 처리합니다.
    - 이미지/영상 생성 결과를 다시 Spring 서버에 전달하여 최종 응답으로 연결합니다.
    
> 이 구조를 통해 **Spring ↔ FastAPI 간의 통신을 완전히 비동기화**할 수 있었으며, 트래픽 폭증 상황에서도 메시지 손실 없이 안정적으로 처리할 수 있었습니다.
---
## 4.2. 메시지 스트림 설정

> Redis Streams를 안정적으로 운영하기 위해 다음과 같은 설정들을 적용했습니다.  
> 각 항목은 단순 발행/소비 이상의 **운영 안정성**과 **장애 대응**에 초점을 맞췄습니다.

### 4.2.1. TTL(Time-To-Live) & 만료 메시지 정리
- 메시지마다 **만료 시간(expireAt)** 을 설정하여 불필요한 메시지가 무한정 쌓이지 않도록 제한했습니다.
- Spring Batch 기반의 **RedisStreamCleanerJob**을 주기적으로 실행하여 만료된 메시지를 자동 삭제합니다.
![TTL 관리 구조도](https://i.imgur.com/PjJ4lbT.png)
- TTL은 도메인 특성에 맞게 분리했습니다:
	- 리뷰 에셋: 5분
	- 메뉴 포스터: 3분
	- 이벤트 에셋: 3분
	- OCR 요청: 3분

![리뷰 TTL & expireAt 예시](https://i.imgur.com/dXeD5P9.png)
- 리뷰 메시지에 적용한 `expireAt`

---
### 4.2.2. MAXLEN 설정
- 각 스트림마다 **최대 메시지 개수**를 제한하여 Redis 메모리 폭주를 방지했습니다.
- Lua 스크립트를 이용해 `XADD MAXLEN ~` 옵션을 강제 적용하여 안정성을 확보했습니다.
	- 리뷰에셋: 2000갸
	- 메뉴 포스타: 1000개
	- 이벤트 에셋: 1000개
	- OCR 요청: 500개

![리뷰 MAXLEN 예시](https://i.imgur.com/I8Ad2cI.png)
- 아래는 리뷰 메시지에 적용된 `MAXLEN`

---
### 4.2.3. 재시도(Exponential Backoff) & DLQ

- 메시지 처리 실패 시, **지수 백오프(Exponential Backoff)** 기반으로 재시도 간격을 점점 늘려가며 재처리했습니다.
- 재시도 횟수가 **MAX_RETRY_COUNT (3회)** 를 초과하면 자동으로 **DLQ(Dead Letter Queue)** 로 이동시켰습니다.
- DLQ는 `streamKey + ".dead"` 규칙으로 관리하여, 운영자가 쉽게 추적할 수 있도록 설계했습니다.

| 항목            | 정책                                      |
| ------------- | --------------------------------------- |
| **재시도 전략**    | Exponential Backoff (2ⁿ 초 지연, 최대 제한 있음) |
| **최대 재시도 횟수** | 3회                                      |
| **DLQ 규칙**    | `streamKey + ".dead"`                   |
| **운영 이점**     | 실패 메시지 격리 및 추적 용이                       |

- 구조도 (재시도 & DLQ 흐름):  
    ![](https://i.imgur.com/O9TggK9.png)    
- DLQ 관리 예시:  
    ![](https://i.imgur.com/cPy2u8y.png)

> 현재 프로젝트에서는 Spring이 **Producer 역할만 수행**하기 때문에, 실제 **재시도 & DLQ 로직은 FastAPI Consumer 측에서 구현·동작**합니다.  
> 다만 추후 Spring이 Consumer 역할을 맡을 수 있는 가능성에 대비하여, `RedisStreamRetryHandler` 등 관련 추상화 코드를 **Spring에도 남겨두었고, 문서화**했습니다.
---
### 4.2.4. 직렬화 & 호환성
- Redis Streams는 **문자열 기반**으로 직렬화했으며, 복잡한 객체는 **JSON 직렬화**를 적용했습니다.
- Instant/LocalDateTime 등 시간 타입은 **ISO-8601 포맷**으로 통일해 Consumer가 언어/환경과 무관하게 파싱 가능하도록 했습니다.
#### 코드 (`RedisConfig`)
**문자열 기반 직렬화 (Redis Streams 전용)**
``` java
@Bean(name = "redisStreamTemplate") 
public RedisTemplate<String, String> redisStreamTemplate(RedisConnectionFactory factory) {     
    // 스트림은 문자열로 통일 (호환성↑)     
    RedisTemplate<String, String> template = new RedisTemplate<>();
         ...     
	var str = new StringRedisSerializer();     
	template.setKeySerializer(str);     
	template.setValueSerializer(str);     
	template.setHashKeySerializer(str);
	template.setHashValueSerializer(str);     
	...     
	return template; 
}
```
- Redis Streams는 **키/값 모두 String 직렬화**를 강제해서 언어 간 호환성을 확보.

**JSON 직렬화 (일반 RedisTemplate)**
``` java
var json = new GenericJackson2JsonRedisSerializer(objectMapper); template.setValueSerializer(json); template.setHashValueSerializer(json);
```
- 복잡한 객체는 `GenericJackson2JsonRedisSerializer`로 JSON 변환.

**시간 타입 ISO-8601 직렬화**    
``` java
@Bean public ObjectMapper objectMapper() {     
	return new ObjectMapper()
			.registerModule(new JavaTimeModule())
			.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS); 
}
```
- `WRITE_DATES_AS_TIMESTAMPS` 비활성화 → `Instant/LocalDateTime`을 **ISO-8601 문자열**로 직렬화.
---
### 4.2.5. 운영 자동화
![](https://i.imgur.com/zBoESSB.png)
- Spring Batch + Scheduler를 이용해 **20분마다 스트림 청소 Job**을 자동 실행.
- Cleaner 로그를 통해 `"삭제된 메시지 개수"`, `"누락된 expireAt"`, `"파싱 오류"` 등을 추적 가능하게 했습니다.
- 운영 중 장애 상황이 발생해도 로그를 기반으로 쉽게 원인을 파악할 수 있도록 설계했습니다.

![Spring Batch Redis Streams](https://i.imgur.com/dIgwJsp.png)

---
## 4.3. RedisStreamPublisher: 안정적인 발행 모듈

> Redis Streams를 단순히 사용하는 것만으로는 운영 안정성을 보장하기 어렵습니다.
> 이를 해결하기 위해 `RedisStreamPublisher<T>` **추상 클래스**를 도입해, 메시지 발행 과정을 표준화 했습니다.

### 4.3.1. 주요 역할
- #### **Redis Streams에 메시지 발행 (XADD)**
	- `publish(RedisStreamKey key, T payload)` 메서드를 통해 메시지를 발행합니다.
	- 메시지 객체(`payload`)를 **Map → 직렬화 → Redis Streams에 추가**하는 일련의 과정을 수행합니다.
- #### **MAXLEN 옵션 강제 적용 (메모리 관리)**
	- Redis Streams는 기본적으로 메시지가 무한정 쌓일 수 있습니다.
	- `MAXLEN ~ N` 옵션을 **Lua 스크립트**를 통해 강제 적용하여, 오래된 메시지를 자동 정리합니다.
	- 각 스트림의 `maxLen` 값은 `RedisStreamKey` Enum에서 관리하도록 했습니다.
- #### **데이터 타입 직렬화 & 오류 처리**    
	- 다양한 타입을 Redis에서 안전하게 저장할 수 있도록 직렬화를 표준화했습니다.
		- `Instant`, `OffsetDateTime`, `ZonedDateTime` → ISO-8601 문자열
		- `Collection`, `Map` → JSON 문자열
		- 숫자/불리언 → `String.valueOf`
		- null → `"null"`
	- 직렬화 실패나 Redis 연결 오류가 발생하면, 명확한 로그를 남기고 예외를 발생시켜 문제 추적이 용이하도록 했습니다.
---
### 4.3.2. 내부 처리 흐름
1. `publish(RedisStreamKey key, T payload)` → 발행 요청 수신
2. `publishToStreamWithMaxLen(...)` → TTL/MaxLen 정책 반영
3. `convertPayloadToMap(payload)` → 메시지를 Map 구조로 변환
4. `buildScriptArguments(maxLen, map)` → Redis Lua 스크립트 인자 생성
5. `executeStreamInsertScript(streamKey, args)` → `XADD` 실행
---
### 4.3.3. 필요한 이유
단순히 `redisTemplate.opsForStream().add(...)`를 쓰면 간단하지만,
1. **MAXLEN 보장**을 강제하기 어렵고,
2. **다양한 타입 직렬화**를 매번 직접 처리해야 하며,    
3. 장애 발생 시 **로깅/예외 처리 일관성**이 부족합니다.

따라서 재사용 가능한 추상 클래스로 만들어 두고,  
각 도메인별 Publisher(`ReviewAssetPublisher`, `MenuPosterPublisher`, `EventAssetPublisher`)는 이를 상속받아 **일관된 발행 로직**을 가지도록 설계했습니다.

---
# 5. 성능 모니터링 & 부하 테스트
- ## [[리뷰 생성 기능 성능 최적화 - CPU 병목 해소와 비동기 처리 도입]]
---
# 6. 적용 후 결과 & 배운 점
## 6.1. Redis Streams 도입의 검증

Redis Streams를 적용한 뒤 부하 테스트를 통해 서비스의 **안정성**과 **처리량**이 확연히 개선됨을 확인했습니다.

- **처리량 및 안정성**: `dropped Iterations`가 **0건**으로 기록되어 모든 요청이 정상 처리됨. → 트래픽 급증 상황에서도 메시지를 안전하게 버퍼링하여 서버 다운을 방지.
    
- **리소스 효율성**: 개선 전에는 CPU 사용률이 99%까지 치솟으며 서버가 다운되었지만, 적용 후에는 **10~20% 수준**으로 안정적으로 유지. 이는 이미지/영상 생성 같은 고부하 작업을 `CompletableFuture`와 전용 스레드 풀에서 비동기로 처리했기 때문.
    
- **메시지 유실 방지**: `ACK/NACK` 메커니즘 덕분에 메시지 유실 없이 모두 정상 발행됨 → 비동기 파이프라인의 **신뢰성** 확보.
---
## 6.2. 비동기 처리의 함정과 교훈

`CompletableFuture`를 활용하여 비동기 처리로 전환하면서, 성능 개선에 대한 중요한 교훈을 얻었습니다.

- **`CompletableFuture::join()`의 숨겨진 병목**: 초기에 비동기 작업을 시작하고 `join()`으로 기다리는 방식은 겉보기에는 병렬적으로 보였지만, 결국 메인 스레드가 블로킹되어 병목을 해소하지 못했습니다. `join()`을 제거하고 **요청과 응답을 분리함으로써 진짜 비동기를 적용할 수 있었습니다.**
    
- **CPU vs. I/O: 상대적인 병목 현상**: 이미지 최적화 로직을 제거하자 `CPU 사용률`은 크게 낮아졌지만, 오히려 **전체 응답 시간은 크게 증가**했습니다. 이는 네트워크·디스크 I/O가 새로운 병목으로 작용해 시스템 처리 능력이 저하된 결과이며, 동시에 CPU가 이미지 변환을 통해 **I/O 대기 시간을 줄여주는 역할**을 하고 있었음을 확인할 수 있었습니다.
---
## 6.3. 최종 결론

> **"CPU 사용량만으로 성능을 판단할 수 없으며, 병목 지점은 항상 상대적이다."**

이번 프로젝트를 통해 단일 서버 환경에서 **비동기 파이프라인을 설계 → 부하 테스트로 검증 → 병목 지점 분석 및 개선**이라는 최적화 사이클을 경험했습니다.

단순한 기술 도입이 아니라,
- 시스템의 한계를 정확히 진단하고,
- 숨겨진 병목을 찾아내며,
- CPU·I/O 등 리소스 간 상호작용을 이해하는 것

이 성능 최적화의 핵심임을 배웠습니다.  

Redis Streams는 그 과정에서 안정적이고 효율적인 비동기 아키텍처의 **중심 역할**을 했습니다.