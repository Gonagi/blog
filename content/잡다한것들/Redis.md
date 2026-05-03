# Contents
## 1. Redis 캐시로 사용하기
## 2. Redis 데이터 타입 야무지게 활용하기
## 3. Redis에서 데이터를 영구 저장하려면?(RDB vs AOF)
## 4. Redis 아키텍처 선택 노하우(Replication vs Sentinel vs Cluster)
## 5. Redis 운영 꿀팁 + 장애 포인트
---
## 1. Redis 캐시로 사용하기
![|500](https://i.imgur.com/FWekrM3.png)

> Redis는 원본 데이터 저장소보다 더 빠르게 접근하기 위해 사용하는 In-memory 기반 데이터 저장소이다.

Redis가 캐시로 많이 사용되는 이유는 다음과 같다.
- 단순한 Key-Value 구조
- 메모리 기반 저장소
- 빠른 읽기/쓰기 성능
- 다양한 자료구조 제공
- TTL을 통한 데이터 만료 처리 가능

Redis는 메모리에 데이터를 저장하기 때문에 빠르지만, 그만큼 **메모리 관리, 만료 정책, 장애 상황에서의 복구 전략**을 함께 고려해야 한다.
### 1.1 캐싱 전략

캐싱 전략은 데이터를 **언제 캐시에 넣고**, **언제 DB와 동기화할지**를 정하는 방식이다.
데이터의 읽기/쓰기 비율, 변경 빈도, 정합성 요구 수준에 따라 적절한 전략을 선택해야 한다.
#### 1.1.1 읽기 전략
#### Look-Aside / Lazy Loading
![|500](https://i.imgur.com/srfRVZL.png)

> 애플리케이션이 먼저 캐시를 확인하고, 없으면 DB에서 조회한 뒤 캐시에 저장하는 방식이다.

흐름은 다음과 같다.
```text
1. 애플리케이션이 Redis 조회
2. 캐시에 데이터가 있으면 바로 반환
3. 캐시에 없으면 DB 조회
4. DB에서 가져온 데이터를 Redis에 저장
5. 결과 반환
```

장점은 다음과 같다.
- Redis 장애 시에도 DB에서 데이터를 조회할 수 있다.
- 자주 조회되는 데이터만 캐시에 올라간다.
- 읽기 중심 서비스에 적합하다.

단점은 다음과 같다.
- 최초 요청은 항상 캐시 미스가 발생한다.
- Redis 장애 후 복구되면 캐시가 비어 있어 DB 부하가 급증할 수 있다.
- 이 경우 Cache Warming으로 주요 데이터를 미리 적재해 완화할 수 있다.

정리하면, Look-Aside는 **읽기 트래픽이 많고, 일부 인기 데이터가 반복 조회되는 경우**에 적합하다.
#### 1.1.2 쓰기 전략
![](https://i.imgur.com/sR0jKJp.png)
#### Write-Around

> 데이터를 DB에만 저장하고, 캐시는 읽기 시점에 채우는 방식이다.

흐름은 다음과 같다.
```text
쓰기: 애플리케이션 → DB 저장
읽기: Redis 조회 → 없으면 DB 조회 → Redis 저장
```

장점은 다음과 같다.
- 사용하지 않을 데이터를 캐시에 넣지 않는다.
- 캐시 저장 비용을 줄일 수 있다.
- 쓰기 처리가 단순하다.

단점은 다음과 같다.
- DB와 캐시 데이터가 일시적으로 다를 수 있다.
- 데이터 변경 후 기존 캐시를 삭제하지 않으면 stale data가 발생할 수 있다.

따라서 Write-Around를 사용할 때는 보통 **DB 업데이트 후 관련 캐시를 삭제하거나 TTL을 짧게 설정**한다.
#### Write-Through

> DB에 데이터를 저장할 때 Redis에도 함께 저장하는 방식이다.

흐름은 다음과 같다.
```text
1. 애플리케이션이 데이터 저장 요청
2. DB 저장
3. Redis에도 같은 데이터 저장
```

장점은 다음과 같다.
- 캐시가 비교적 최신 상태를 유지한다.
- 읽기 시 캐시 미스 가능성이 줄어든다.

단점은 다음과 같다.
- 쓰기 작업마다 DB와 Redis를 모두 갱신해야 한다.
- 저장 비용이 증가한다.
- 실제로 조회되지 않을 데이터까지 캐시에 저장될 수 있다.

따라서 Write-Through를 사용할 때도 **TTL 설정은 권장**된다. 다만 TTL이 너무 짧으면 캐시 미스가 자주 발생해 오히려 DB 부하가 커질 수 있다.

---
## 2. Redis 데이터 타입 활용하기
![](https://i.imgur.com/kaztruv.png)
Redis는 단순한 Key-Value 저장소가 아니라 여러 자료구조를 제공한다.
자료구조를 잘 선택하면 애플리케이션에서 직접 처리해야 할 로직을 Redis 명령어로 단순화할 수 있다.
### 2.1 Strings

> 가장 기본적인 Redis 데이터 타입

주요 사용 사례는 다음과 같다.
- 단순 값 저장
- 인증 토큰 저장
- 조회 결과 캐싱
- 카운터 구현

카운팅에 자주 사용하는 명령어는 다음과 같다.
```text
INCR
INCRBY
INCRBYFLOAT
```

예시:
```text
INCR view:post:1
```

게시글 조회 수, API 호출 수, 재고 수량 같은 값을 빠르게 증가시킬 때 사용할 수 있다.
### 2.2 Hashes

> 하나의 key 안에 여러 field-value를 저장하는 구조

예를 들어 사용자 정보를 다음처럼 저장할 수 있다.
```text
user:1
  name: kim
  age: 28
  email: test@example.com
```

장점은 다음과 같다.
- 객체 형태의 데이터를 저장하기 좋다.
- 특정 필드만 조회하거나 수정할 수 있다.
- 문자열 JSON 전체를 매번 직렬화/역직렬화하지 않아도 된다.

단, 필드 수가 너무 많아지면 `HGETALL`이 부담될 수 있으므로 큰 Hash는 `HSCAN`을 고려해야 한다.
### 2.3 Sets

> 중복 없는 값을 저장하는 자료구조

사용 사례는 다음과 같다.
- 좋아요 누른 사용자 목록
- 특정 이벤트 참여자 목록
- 중복 제거
- 집합 연산

예시:
```text
SADD post:1:likes user:1
SADD post:1:likes user:2
SCARD post:1:likes
```

Set은 실제 값을 저장하기 때문에 나중에 어떤 사용자가 포함되어 있는지 확인할 수 있다.
### 2.4 Sorted Sets

> 값마다 score를 함께 저장하고, score 기준으로 정렬하는 자료구조

사용 사례는 다음과 같다.
- 랭킹
- 인기 게시글
- 우선순위 큐
- 최근 활동 목록

예시:
```text
ZINCRBY ranking 1 user:1
ZRANGE ranking 0 9 REV
```

조회수, 점수, 시간 등을 score로 사용하면 정렬된 데이터를 빠르게 조회할 수 있다.
### 2.5 Bits

> 하나의 bit 단위로 데이터를 저장하는 방식

사용 사례는 다음과 같다.
- 출석 여부
- 방문 여부
- 기능 사용 여부
- 대규모 boolean 데이터 저장

장점은 저장 공간을 매우 아낄 수 있다는 점이다.

예를 들어 사용자 ID를 offset으로 사용하면 특정 사용자가 오늘 방문했는지 bit 하나로 표현할 수 있다.
```text
SETBIT visit:2026-05-03 1001 1
GETBIT visit:2026-05-03 1001
BITCOUNT visit:2026-05-03
```

단점은 저장된 값이 단순한 0/1 정보이기 때문에 복잡한 데이터 표현에는 적합하지 않다.
### 2.6 HyperLogLog

> 대용량 데이터의 고유 개수를 근사치로 계산하는 자료구조

사용 사례는 다음과 같다.
- 일일 방문자 수
- UV 측정
- 검색어 고유 사용자 수
- 이벤트 참여자 고유 수

장점은 다음과 같다.
- 매우 적은 메모리로 고유 개수를 추정할 수 있다.
- Redis HyperLogLog는 표준 오차가 약 0.81%이며, 최대 12KB 정도의 메모리로 관리된다.

단점은 다음과 같다
- 정확한 값이 아니라 근사값이다.
- 저장된 원소 목록을 다시 꺼낼 수 없다.

즉, HyperLogLog는 **“누가 들어왔는지”가 아니라 “몇 명이나 들어왔는지”가 중요할 때** 적합하다.

### 2.7 Lists

> 삽입 순서를 유지하는 리스트 자료구조

사용 사례는 다음과 같다.
- 간단한 큐
- 최근 기록
- 작업 대기열

Blocking 명령어를 사용하면 간단한 Queue처럼 사용할 수 있다.
```text
LPUSH queue job1
BRPOP queue 0
```

다만 Lists는 복잡한 메시지 처리, 재처리, 소비자 그룹 관리에는 한계가 있다.
### 2.8 Streams

> 로그나 이벤트처럼 계속 추가되는 데이터를 저장하기 좋은 자료구조

특징은 다음과 같다.
- append-only 구조
- 시간 기반 ID 사용
- 범위 조회 가능
- Consumer Group 지원
- 메시지 재처리 구조 구성 가능

사용 사례는 다음과 같다.
- 이벤트 로그
- 비동기 작업 큐
- 알림 처리
- 주문/결제 이벤트 흐름 저장

Lists보다 Streams가 더 적합한 경우는 다음과 같다.
```text
메시지를 여러 소비자가 나눠 처리해야 하는 경우
처리 실패한 메시지를 다시 확인해야 하는 경우
이벤트 이력을 일정 기간 남겨야 하는 경우
```

정리하면, Lists는 **간단한 큐**, Streams는 **이벤트 로그 기반 메시징**에 더 적합하다.

---
## 3. Redis에서 데이터를 영구 저장하려면? RDB vs AOF
![|400](https://i.imgur.com/tUIiO1B.png)

Redis는 In-memory 저장소이기 때문에 기본적으로 메모리에 데이터를 저장한다.
따라서 Redis를 단순 캐시가 아니라 세션, 큐, 카운터, 이벤트 저장소처럼 사용한다면 Persistence 설정을 고려해야 한다.

Redis의 주요 영속화 방식은 다음과 같다.
```text
RDB: 특정 시점의 메모리 스냅샷 저장
AOF: 데이터 변경 명령을 로그처럼 기록
```
### 3.1 RDB

> 특정 시점의 Redis 메모리 상태를 파일로 저장하는 방식

장점은 다음과 같다.
- 파일 크기가 비교적 작다.
- 백업과 복구가 단순하다.
- 재시작 시 로딩 속도가 빠른 편이다.

단점은 다음과 같다.
- 마지막 스냅샷 이후의 데이터는 유실될 수 있다.
- 저장 시점 사이에 장애가 발생하면 일부 데이터가 복구되지 않는다.

자동 저장 예시는 다음과 같다.
```text
save 900 1
save 300 10
save 60 10000
```

의미는 다음과 같다.
```text
900초 동안 1개 이상 변경되면 저장
300초 동안 10개 이상 변경되면 저장
60초 동안 10000개 이상 변경되면 저장
```

수동 저장은 보통 다음 명령어를 사용한다.
```text
BGSAVE
```
`SAVE`는 Redis 메인 스레드를 블로킹할 수 있으므로 운영 환경에서는 사용을 지양하는 것이 좋다.
### 3.2 AOF

> Redis에 들어온 쓰기 명령을 로그 파일에 기록하는 방식

예를 들어 다음 명령이 들어오면,
```text
SET user:1 kim
INCR view:post:1
```
AOF 파일에도 Redis 명령 형태로 기록된다.

장점은 다음과 같다.
- RDB보다 데이터 유실 가능성이 낮다.
- 장애 직전 데이터에 더 가깝게 복구할 수 있다.

단점은 다음과 같다.
- RDB보다 파일 크기가 커질 수 있다.
- 명령 로그가 계속 쌓이므로 AOF rewrite가 필요하다.
- 복구 시 명령을 다시 실행해야 하므로 RDB보다 느릴 수 있다.

설정 예시는 다음과 같다.
```text
appendonly yes
appendfsync everysec
```

`appendfsync everysec`는 보통 성능과 안정성의 균형을 맞추는 설정이다. 다만 장애 시 최대 약 1초 정도의 데이터 유실 가능성이 있다.

AOF 파일 재작성은 다음 명령어를 사용한다.
```text
BGREWRITEAOF
```
### 3.3 RDB vs AOF 선택 기준

#### RDB가 적합한 경우

> 백업은 필요하지만 약간의 데이터 유실은 허용 가능한 경우

예시:
- 캐시 데이터
- 재생성 가능한 데이터
- 통계성 데이터
- 일부 카운터
#### AOF가 적합한 경우

> 장애 직전까지의 데이터 보존이 중요한 경우

예시:
- 세션
- 작업 큐
- 이벤트 처리 상태
- 유실되면 문제가 되는 카운터
#### RDB + AOF 동시 사용이 적합한 경우

> 복구 속도와 데이터 안정성을 모두 중요하게 보는 경우

정리하면 다음과 같다.

| 방식        | 특징        | 적합한 상황      |
| --------- | --------- | ----------- |
| RDB       | 특정 시점 스냅샷 | 일부 유실 허용 가능 |
| AOF       | 쓰기 명령 로그  | 유실 최소화 필요   |
| RDB + AOF | 두 방식 병행   | 더 높은 안정성 필요 |

---
## 4. Redis 아키텍처 선택 노하우(Replication vs Sentinel vs Cluster)
![](https://i.imgur.com/SDWya5Q.png)

> Replication: 복제
> Sentinel: 복제 + 자동 장애 조치
> Cluster: 샤딩 + 고가용성
### 4.1 Replication

> Master 데이터를 Replica로 복제하는 가장 기본적인 구조이다.

구성은 다음과 같다.
```text
Master
 └── Replica
```

특징은 다음과 같다.
- Master는 쓰기/읽기 처리
- Replica는 Master 데이터를 복제
- Replica를 읽기 분산에 활용 가능
- 복제는 기본적으로 비동기 방식
- 자동 페일오버 기능은 없음

Replica 연결은 다음 명령어로 할 수 있다.
```text
replicaof <master-ip> <master-port>
```

장애 발생 시 Replica를 Master로 승격하려면 다음 명령어를 사용할 수 있다.
```text
replicaof no one
```

단점은 다음과 같다.
- Master 장애 시 수동 조치가 필요하다.
- 애플리케이션의 Redis 연결 정보도 바꿔야 할 수 있다.
- 비동기 복제이므로 장애 시 일부 데이터가 유실될 수 있다.

Redis 공식 문서도 Redis 복제는 기본적으로 비동기이며, 데이터 안정성이 중요한 경우 Persistence와 함께 고려해야 한다고 설명한다. ([Redis](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/?utm_source=chatgpt.com "Redis replication | Docs"))
### 4.2 Sentinel

> Redis Master/Replica 구조에 자동 페일오버를 추가한 고가용성 구성이다.

구성은 다음과 같다.
```text
Sentinel
Sentinel
Sentinel

Master
 └── Replica
```

Sentinel의 역할은 다음과 같다.
- Master/Replica 상태 모니터링
- Master 장애 감지
- Replica를 새로운 Master로 승격
- 클라이언트에게 현재 Master 정보 제공

장점은 다음과 같다.
- 자동 페일오버 가능
- 애플리케이션이 Sentinel을 통해 현재 Master를 찾을 수 있음
- 단일 Master 장애에 대응 가능

운영 시 주의할 점은 다음과 같다.
- Sentinel은 보통 3대 이상의 홀수 개로 구성한다.
- 과반수 판단이 가능해야 잘못된 페일오버를 줄일 수 있다.
- Redis 데이터 분산 저장, 즉 샤딩 기능은 제공하지 않는다.

Redis Sentinel은 Cluster를 사용하지 않는 Redis 환경에서 고가용성을 제공하고, 모니터링/알림/클라이언트 설정 제공 역할도 수행한다.([링크](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/?utm_source=chatgpt.com "High availability with Redis Sentinel | Docs"))
### 4.3 Cluster

> 데이터를 여러 Master 노드에 나누어 저장하는 Redis의 분산 구조이다.

특징은 다음과 같다.
- Sharding 제공
- 여러 Master에 Key 분산 저장
- 각 Master는 Replica를 가질 수 있음
- Master 장애 시 Replica가 자동 승격
- 수평 확장 가능

구조 예시는 다음과 같다.
```text
Master 1 ─ Replica 1
Master 2 ─ Replica 2
Master 3 ─ Replica 3
```

Redis Cluster는 key를 hash slot 기준으로 나눠 저장한다.

적합한 경우는 다음과 같다.
```text
단일 Redis 인스턴스의 메모리 한계를 넘는 경우
Redis 처리량을 수평 확장해야 하는 경우
고가용성과 샤딩이 모두 필요한 경우
```

주의할 점은 다음과 같다.
- 최소 3개의 Master 노드가 필요하다.
- 멀티 키 연산은 같은 hash slot에 있어야 제약 없이 사용할 수 있다.
- 운영 복잡도가 Sentinel보다 높다.

정리하면 다음과 같다.
![|500](https://i.imgur.com/bEGzpPR.png)

|    구조     |   목적    | 자동 페일오버 | 샤딩 |         적합한 상황          |
|:-----------:|:---------:|:-------------:|:----:|:----------------------------:|
| Replication |   복제    |       X       |  X   |     단순 복제, 읽기 분산     |
|  Sentinel   | 고가용성  |       O       |  X   | 단일 Master 구조에서 HA 필요 |
|   Cluster   | 확장 + HA |       O       |  O   |    대용량/고트래픽 Redis     |

---
## 5. Redis 운영 꿀팁 + 장애 포인트
### 5.1 Redis는 대부분의 명령을 Single Thread로 처리한다

Redis는 명령 처리를 주로 단일 스레드 이벤트 루프 기반으로 처리한다.
따라서 오래 걸리는 명령 하나가 실행되면 다른 요청 처리에도 영향을 줄 수 있다.
대표적으로 주의할 명령은 다음과 같다.
```text
KEYS *
HGETALL
SMEMBERS
LRANGE 0 -1
DEL large-key
```

KEYS 대신 SCAN 사용:
- `KEYS`는 전체 keyspace를 한 번에 조회한다.
- 운영 환경에서 키가 많을 경우 Redis를 오래 점유해 장애로 이어질 수 있다.
- Redis 공식 문서에서도 `KEYS`는 운영 환경에서 매우 주의해서 사용해야 하며, 일반 애플리케이션 코드에서는 `SCAN` 사용을 권장한다.([링크](https://redis.io/docs/latest/commands/keys/?utm_source=chatgpt.com "KEYS | Docs"))
- `SCAN` 계열 명령은 데이터를 한 번에 모두 가져오는 것이 아니라 점진적으로 순회한다.([링크](https://redis.io/docs/latest/commands/scan/?utm_source=chatgpt.com "SCAN | Docs"))

DEL 대신 UNLINK 고려:
- 큰 key를 삭제할 때 `DEL`을 사용하면 메모리 해제 작업이 Redis 메인 처리 흐름에 부담을 줄 수 있다.
- `UNLINK`는 key를 keyspace에서 먼저 제거하고, 실제 메모리 해제는 다른 스레드에서 비동기적으로 처리한다.
- Redis 공식 문서에서도 `UNLINK`는 `DEL`과 유사하지만 메모리 회수를 비동기로 수행한다고 설명한다.([링크](https://redis.io/docs/latest/commands/unlink/?utm_source=chatgpt.com "UNLINK | Docs"))
### 5.2 큰 자료구조는 쪼개서 관리하기

Hash, Set, Sorted Set에 너무 많은 데이터가 들어가면 특정 명령이 부담될 수 있다.

예를 들어 다음 명령은 데이터가 많을수록 위험하다.
```text
HGETALL big-hash
SMEMBERS big-set
ZRANGE big-zset 0 -1
```

개선 방법은 다음과 같다.
```text
HGETALL → HSCAN
SMEMBERS → SSCAN
ZRANGE 전체 조회 → 범위 제한 조회
큰 key → 여러 key로 분할
```

예시:
```text
user:activity:2026-05
```
보다

```text
user:activity:2026-05:01
user:activity:2026-05:02
user:activity:2026-05:03
```
처럼 나누면 특정 key 하나가 너무 커지는 것을 줄일 수 있다.
### 5.3 `stop-writes-on-bgsave-error`

설정 예시는 다음과 같다.
```text
stop-writes-on-bgsave-error yes
```
기본값은 `yes`이다.

의미는 다음과 같다.
- RDB 저장에 실패하면 Redis 쓰기 요청을 중단한다.

장점은 다음과 같다.
- 백업 실패 상태에서 계속 쓰기가 진행되는 것을 막는다.
- 데이터 안정성을 우선한다.

단점은 다음과 같다.
- 디스크 문제나 권한 문제로 RDB 저장이 실패하면 Redis 쓰기가 막힐 수 있다.
- 캐시 용도로만 사용하는 Redis라면 서비스 장애처럼 보일 수 있다.

따라서 캐시 전용 Redis라면 다음처럼 설정을 검토할 수 있다.
```text
stop-writes-on-bgsave-error no
```
다만 이 경우 RDB 저장 실패를 반드시 모니터링해야 한다.

정리하면 다음과 같다.
- 데이터 보존 중요 → yes 유지
- 캐시 전용 + 가용성 우선 → no 검토
### 5.4 `maxmemory-policy`

Redis는 `maxmemory`를 초과하면 설정된 eviction policy에 따라 key를 제거한다. 
Redis 공식 문서에 따르면 Redis는 메모리 사용량이 설정된 한도를 넘으면 선택된 eviction policy에 따라 key를 제거해 메모리를 관리한다.([링크](https://redis.io/docs/latest/develop/reference/eviction/?utm_source=chatgpt.com "Key eviction | Docs"))

대표 정책은 다음과 같다.

noeviction:
- 메모리가 가득 차도 key를 삭제하지 않는다.
- 대신 새로운 쓰기 요청에 에러를 반환한다.
- 캐시 서버에서 이 설정을 그대로 사용하면 장애로 이어질 수 있다.

volatile-lru:
- TTL이 설정된 key 중에서 최근에 덜 사용된 key를 제거한다.
- TTL이 없는 key는 제거 대상이 아니다.
- 따라서 캐시 key에 TTL이 누락되어 있으면 메모리 회수가 제대로 되지 않을 수 있다.

allkeys-lru:
- 모든 key 중에서 최근에 덜 사용된 key를 제거한다.
- Redis를 순수 캐시로 사용한다면 보통 다음 설정을 많이 고려한다.
- maxmemory-policy allkeys-lru

|     정책     |  제거 대상   |           특징            |
|:------------:|:------------:|:-------------------------:|
|  noeviction  |     없음     | 메모리 초과 시 쓰기 에러  |
| volatile-lru | TTL 있는 key | TTL 없는 key는 제거 안 됨 |
| allkeys-lru  |   모든 key   |  캐시 전용 Redis에 적합   |

### 5.5 TTL을 너무 짧게 설정하면 안 된다

TTL은 캐시 데이터의 수명을 정하는 중요한 설정이다.
하지만 TTL을 너무 짧게 설정하면 다음 문제가 발생할 수 있다.
![](https://i.imgur.com/YOmAb8N.png)
- 캐시 미스 증가
- DB 조회 증가
- Redis 재적재 반복
- 전체 처리량 감소

즉, TTL이 짧다고 항상 좋은 것이 아니다.

적절한 TTL은 데이터 특성에 따라 달라진다.
```text
자주 바뀌는 데이터 → 짧은 TTL
거의 바뀌지 않는 데이터 → 긴 TTL
정합성이 중요한 데이터 → 업데이트 시 캐시 삭제
```

추가로 많은 key가 같은 시점에 만료되면 순간적으로 DB 부하가 몰릴 수 있다.
이를 완화하려면 TTL에 약간의 랜덤 값을 섞을 수 있다.

```text
TTL = 기본 TTL + 랜덤 시간
```

예시:
- 기본 TTL 10분
- 실제 TTL 10분 ~ 12분 사이 랜덤 설정
### 5.6 MaxMemory 설정

Redis는 메모리 기반 저장소이므로 `maxmemory` 설정이 중요하다.

주의할 점은 다음과 같다.
- 서버 전체 메모리를 Redis maxmemory로 모두 잡으면 위험하다.
	![|500](https://i.imgur.com/suFtlxu.png)

이유는 다음과 같다.
- Redis 프로세스 자체 메모리 필요
- OS 메모리 필요
- RDB 저장 시 fork로 인한 Copy-on-Write 비용 발생 가능
- AOF rewrite 시에도 추가 메모리 사용 가능
- 메모리 단편화로 실제 RSS가 더 커질 수 있음

따라서 Redis의 `maxmemory`는 서버 전체 메모리를 기준으로 여유를 두고 설정해야 한다.
특히 RDB 저장이나 AOF rewrite 과정에서 순간적으로 메모리 사용량이 증가할 수 있으므로, 운영 환경에서는 메모리 여유분을 반드시 고려해야 한다.
### 5.7 Memory 모니터링

Redis 메모리를 볼 때는 단순히 `used_memory`만 보면 부족하다.
![|600](https://i.imgur.com/6oJ0myZ.png)
주요 지표는 다음과 같다.
- used_memory
	- Redis가 논리적으로 사용 중인 메모리이다.
- used_memory_rss
	- OS가 Redis 프로세스에 실제로 할당한 물리 메모리이다.
- mem_fragmentation_ratio
	- 메모리 단편화 정도를 나타낸다.
	- `used_memory_rss / used_memory`
- evicted_keys
- expired_keys

단편화가 커지는 경우는 다음과 같다.
- key 생성/삭제가 반복되는 경우
- TTL 만료가 빈번한 경우
- 특정 시점에 메모리가 크게 증가했다가 줄어든 경우    
- 큰 key 삭제가 자주 발생하는 경우

단편화가 심하면 다음 설정을 검토할 수 있다.
```text
CONFIG SET activedefrag yes
```
다만 active defrag도 CPU를 사용할 수 있으므로 운영 환경에서는 모니터링하면서 적용하는 것이 좋다.
### 5.8 Cache Stampede

> 많은 요청이 동시에 캐시 미스를 만나 DB로 몰리는 현상

예를 들어 인기 상품 정보가 Redis에 캐싱되어 있다고 가정한다.
``` text
product: 1
TTL: 10분
```
이 key가 만료되는 순간, 동시에 많은 요청이 들어오면 모두 Redis에서 cache miss가 발생한다.

문제 흐름은 다음과 같다.
1. 인기 key 만료
2. 동시에 많은 요청 유입
3. 모두 Redis cache miss
4. 모든 요청이 DB 조회
5. DB 부하 급증
6. 서비스 응답 지연 또는 장애 발생
즉, Redis 장애가 아니더라도 캐시 만료 방식 때문에 DB 장애로 이어질 수 있다.

대응 방법은 다음과 같다.

TTL 랜덤화:
- 많은 key가 같은 시점에 만료되지 않도록 TTL에 랜덤 값을 섞는다.
- TTL = 기본 TTL + 랜덤 시간

Cache Warming:
- 자주 조회되는 데이터를 미리 Redis에 적재한다.
 
 분산 락 사용:
- 캐시 미스가 발생했을 때 여러 요청이 동시에 DB를 조회하지 않도록 막는다.
1. 캐시 미스 발생
2. 하나의 요청만 lock 획득
3. lock을 얻은 요청만 DB 조회
4. Redis에 데이터 저장
5. 나머지 요청은 캐시 재조회
- 이 방식은 lock 관리가 잘못되면 외혈 대기 시간이 길어질 수 있으므로 TTL 설정이 중요하다.

Stale Data 반환:
- 캐시가 만료되었더라도 기존 데이터를 잠시 더 반환하는 방식
	- 캐시 데이터는 조금 오래됐지만, DB 장애보다는 낫다고 판단하는 경우
	- 인기 게시글, 상품 목록, 메인 배너 등 약간 오래된 데이터가 혀용되는 경우

인기 Key 사전 갱신:
- TTL이 끝나기 전에 백그라운드에서 미리 갱신하는 방식
- TTL 만료 전 미리 DB 조회, Redis 갱신