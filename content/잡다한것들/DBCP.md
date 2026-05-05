# Contents
## 1. DB Connection이란?
## 2. DBCP란?
## 3. DBCP를 사용하는 이유
## 4. DBCP 설정
## 5. DB 서버 설정: MySQL
## 6. 백엔드 설정: HikariCP
## 7. 설정 간 관계
## 8. 적절한 Connection 수를 찾는 과정
---
## 1. DB Connection이란?

> 백엔드 애플리케이션과 DB 서버가 통신하기 위해 맺는 연결

Backend application과 DB 서버는 네트워크를 통해 통신한다.

일반적으로 DB 연결은 TCP 기반으로 동작한다.
TCP는 신뢰성 있는 통신을 제공하지만, 연결을 맺고 끊는 과정에는 비용이 발생한다.
```text
Connection 생성
→ TCP 연결
→ 인증
→ 세션 생성
→ 쿼리 실행
→ Connection 종료
```

만약 API 요청마다 DB connection을 새로 만들고 끊는다면 매번 연결 생성 비용이 발생한다.
```text
요청 1 → connection 생성 → 쿼리 → connection 종료
요청 2 → connection 생성 → 쿼리 → connection 종료
요청 3 → connection 생성 → 쿼리 → connection 종료
```
웹 애플리케이션은 대부분의 API에서 DB에 접근하기 때문에, 매 요청마다 connection을 새로 생성하면 응답 시간이 증가하고 서버 리소스도 낭비된다.

---
## 2. DBCP(Database Connection Pool)란?

> DB connection을 미리 만들어두고 재사용하기 위한 connection pool

애플리케이션이 요청을 처리하기 전에 DB connection을 미리 만들어두고, 이를 pool로 관리하는 방식이다.

요청이 들어오면 pool에서 놀고 있는 connection을 빌려 사용하고, 작업이 끝나면 connection을 끊지 않고 pool에 반납한다.
```text
요청 발생
→ pool에서 idle connection 획득
→ DB 쿼리 실행
→ 결과 반환
→ connection을 pool에 반납
```

DBCP를 사용할 때 `connection.close()`는 실제 DB 연결을 끊는 것이 아니라, 일반적으로 **connection을 pool에 반납하는 의미**다.
```text
일반 JDBC close()
→ 실제 connection 종료

DBCP 환경의 close()
→ connection을 pool에 반납
```

Connection 재사용:
- 연결 생성/종료 비용 감소
- 응답 시간 개선
- DB와 백엔드 리소스 절약
---
## 3. DBCP를 사용하는 이유

> DBCP는 connection 생성 비용을 줄이고, DB에 연결되는 connection 수를 제어하기 위해 사용한다.

DBCP를 사용하는 이유는 크게 세 가지다.
1. Connection 생성 비용 감소
2. DB connection 수 제어
3. 요청 대기 및 timeout 관리
### 3.1 Connection 생성 비용을 줄이기

> DB connection 생성은 비용이 큰 작업이므로 매 요청마다 반복하지 않는 것이 좋다.

DB connection을 새로 만들 때 네트워크 연결, 인증, 세션 생성 등이 필요하다.
DBCP는 이 비용을 매 요청마다 반복하지 않도록 connection을 미리 만들어두고 재사용한다.
### 3.2 DB connection 수 제어

> DBCP는 DB에 동시에 접근하는 connection 수를 제한해 DB 서버를 보호한다.

DB는 동시에 처리할 수 있는 connection 수에 한계가 있다.

백엔드 요청이 많다고 해서 무제한으로 DB connection을 만들면 DB 서버가 먼저 한계에 도달할 수 있다.
DBCP는 connection 수를 제한해서 DB에 과도한 연결이 몰리지 않게 한다.

예시:
- maximumPoolSize = 10
- 동시에 DB connection을 사용하는 요청은 최대 10개
- 나머지 요청은 connection이 반환될 때까지 대기

즉, DBCP는 단순한 성능 최적화 도구가 아니라 DB 서버를 보호하는 장치이기도 하다.
### 3.3 요청의 적절한 대기

> DBCP는 connection이 모두 사용 중일 때 요청을 대기시키고, 일정 시간이 지나면 실패시킨다.

모든 connection이 사용 중일 때 새로운 요청이 들어오면, 해당 요청은 connection이 반환될 때까지 기다린다.

하지만 무한정 기다리게 하면 장애가 더 커질 수 있어 `connectionTimeout` 같은 설정을 통해 일정 시간 이상 기다리면 예외를 발생시킨다.
```text
connection이 모두 사용 중
→ 일정 시간 대기
→ connection을 얻으면 처리
→ timeout을 넘으면 예외 반환
```
---
## 4. DBCP 설정

DBCP 설정은 백엔드 서버와 DB 서버 설정을 함께 봐야 한다.

Backend Application(HikariCP):
- maximumPoolSize
- minimumIdle
- connectionTimeout
- maxLifetime

DB Server(MySQL):
- max_connections
- wait_timeout

DB 서버가 감당할 수 있는 connection 수, 백엔드 인스턴스 수, 트래픽 특성을 함께 고려해야 한다.
- 백엔드 인스턴스를 scale-out하면 전체 connection 수도 함께 증가한다
---
## 5. DB 서버 설정: MySQL

> MySQL에서는 DB 서버가 허용할 수 있는 connection 수와 idle connection 유지 시간을 설정한다.
### 5.1 max_connections

> `max_connections`는 MySQL 서버가 동시에 맺을 수 있는 최대 connection 수를 의미한다.

예를 들어 MySQL의 `max_connections`가 30이고, 백엔드 서버 3대가 각각 `maximumPoolSize = 10`이라면 이론상 최대 30개의 connection을 사용할 수 있다.
```text
MySQL max_connections = 30

Backend A maximumPoolSize = 10
Backend B maximumPoolSize = 10
Backend C maximumPoolSize = 10

총 최대 connection 수 = 30
```

이 상태에서 백엔드 서버를 한 대 더 추가하면 문제가 생길 수 있다.
```text
Backend D maximumPoolSize = 10 추가

총 최대 connection 수 = 40
MySQL max_connections = 30

→ 일부 서버는 connection을 얻지 못할 수 있음
```

따라서 `maximumPoolSize`는 백엔드 서버 한 대만 보고 정하면 안 된다.
```text
전체 백엔드 인스턴스 수 × 인스턴스별 maximumPoolSize ≤ DB가 감당 가능한 connection 수
```

여기에 운영자 접속, 배치 작업, 모니터링 도구, migration 도구 등이 사용할 connection도 남겨두어야 한다.
### 5.2 wait_timeout

> wait_timeout은 idle 상태의 connection을 MySQL 서버가 얼마 동안 유지할지 결정하는 값이다.

`wait_timeout`은 DB 서버 입장에서 아무 요청 없이 idle 상태로 남아 있는 connection을 정리하기 위한 설정이다.

connection이 오랫동안 사용되지 않는데도 열려 있으면 DB 리소스를 계속 점유한다.  
`wait_timeout`이 지나도록 요청이 없으면 MySQL은 해당 connection을 끊고 리소스를 회수한다.  
  
다만 애플리케이션이 connection을 빌려간 뒤 반환하지 않는 connection leak은 `wait_timeout`만으로 해결되지 않는다.  이 경우 pool 입장에서는 해당 connection이 active 상태로 남아 있기 때문에, 반환 누락 지점을 찾아 수정해야 한다.

---
## 6. 백엔드 설정: HikariCP

> HikariCP는 Spring Boot에서 자주 사용하는 DB connection pool 구현체다.

Spring Boot에서는 기본 connection pool로 HikariCP를 많이 사용한다.
### 6.1 maximumPoolSize

> maximumPoolSize는 pool이 가질 수 있는 최대 connection 수다.

여기에는 idle connection과 active connection이 모두 포함된다.
```text
maximumPoolSize = idle connection + active connection의 최대 합
```

예를 들어 `maximumPoolSize = 10`이면, 동시에 DB 작업에 사용될 수 있는 connection은 최대 10개다.
```text
active connection 10개
→ pool에 남는 idle connection 없음
→ 다음 요청은 connection 반환을 기다림
```

`maximumPoolSize`를 무조건 크게 잡는다고 성능이 좋아지는 것은 아니다.
 - connection 수가 너무 많으면 DB 서버가 동시에 처리해야 할 작업이 많아지고, 오히려 context switching, lock 경합, 메모리 사용량 증가로 성능이 나빠질 수 있다.
### 6.2 minimumIdle

> minimumIdle은 pool에서 유지하려는 최소 idle connection 수다.

idle connection은 현재 사용 중은 아니지만, 요청이 오면 바로 빌려줄 수 있는 connection이다.
- HikariCP는 `minimumIdle`을 설정하지 않으면 기본적으로 `maximumPoolSize`와 같은 값으로 동작한다.

```text
maximumPoolSize = 10
minimumIdle 미설정

→ idle connection을 최대한 10개 유지하려고 함
```

일반적인 웹 서비스에서는 트래픽이 들어왔을 때 connection을 새로 만드는 것보다, 미리 유지해둔 connection을 바로 빌려주는 방식이 응답성 측면에서 안정적이다. 다만 항상 fixed-size pool이 정답은 아니다.

트래픽이 낮고 DB connection 자원이 매우 제한된 서비스라면 `minimumIdle`을 낮춰 유휴 connection 수를 줄일 수도 있다.
### 6.3 connectionTimeout

> connectionTimeout은 pool에서 connection을 얻기 위해 기다릴 수 있는 최대 시간이다.

예를 들어 `connectionTimeout = 30000ms`라면, connection을 얻기 위해 최대 30초까지 기다린다.
```text
모든 connection 사용 중
→ 요청이 대기
→ connection이 반환되면 처리
→ 30초 안에 못 받으면 예외 발생
```

이 값이 너무 길면 요청이 오래 쌓이면서 장애 전파가 커질 수 있다.
반대로 너무 짧으면 일시적인 트래픽 증가에도 쉽게 예외가 발생할 수 있다.
즉, `connectionTimeout`은 pool 고갈 상황에서 요청을 얼마나 기다리게 할지 결정하는 값이다.
### 6.4 maxLifetime

> maxLifetime은 pool 안에서 connection이 살아 있을 수 있는 최대 시간이다.

connection이 `maxLifetime`을 넘으면 HikariCP는 해당 connection을 제거하고 새 connection으로 교체한다.
```text
connection 생성
→ maxLifetime 동안 사용
→ idle 상태면 제거
→ active 상태면 반납된 후 제거
```

active connection은 작업 중에 강제로 제거되지 않는다는 것이다.
- 즉, 사용 중인 connection은 pool로 반환된 뒤 제거된다.

그래서 애플리케이션 버그로 connection이 반환되지 않으면, `maxLifetime`만으로는 해결되지 않는다.
이 경우에는 connection leak이 발생한 것이다.
```text
connection 획득
→ 반환하지 않음
→ active 상태 유지
→ pool 고갈 가능
```

또한 `maxLifetime`은 DB나 네트워크 장비가 connection을 먼저 끊기 전에 pool이 먼저 connection을 교체하도록 설정하는 것이 좋다.
```text
Hikari maxLifetime < DB wait_timeout
```
그래야 애플리케이션이 이미 DB 쪽에서 끊긴 connection을 재사용하는 문제를 줄일 수 있다.
### 6.5 Connection leak

> Connection leak은 애플리케이션이 pool에서 connection을 빌려간 뒤, 사용이 끝났는데도 pool에 반환하지 않는 상황이다.

DBCP 환경에서 `connection.close()`는 실제 DB 연결을 끊는 것이 아니라 connection을 pool에 반납하는 의미다. 따라서 `close()`가 호출되지 않거나, 트랜잭션이 끝나지 않아 connection이 계속 active 상태로 남으면 pool에 반환되지 않는다.

connection leak이 발생하면 다음과 같은 패턴이 나타날 수 있다.
```
active connection이 계속 증가함
idle connection이 계속 줄어듦
active connection이 maximumPoolSize에 붙어 있음
pending threads가 증가함
connectionTimeout 예외가 발생함
DB CPU는 높지 않은데 요청이 connection을 기다림
```

`maxLifetime`은 connection leak을 직접 해결하지 못한다.  
HikariCP는 active connection을 작업 중에 강제로 제거하지 않고, pool로 반환된 뒤 제거하기 때문이다.

HikariCP의 `leakDetectionThreshold`를 설정하면 connection을 일정 시간 이상 반환하지 않는 지점을 로그로 확인할 수 있다. 다만 오래 걸리는 쿼리나 긴 트랜잭션도 감지될 수 있으므로, 로그가 찍혔다고 무조건 leak이라고 판단하면 안 된다.

개선 방법은 다음과 같다.
1. JDBC를 직접 사용한다면 `try-with-resources`로 `close()`를 보장한다.
2. Spring의 `@Transactional`, JdbcTemplate, MyBatis를 활용해 connection 반환을 프레임워크에 맡긴다.
3. 트랜잭션 범위를 줄이고, 외부 API 호출이나 파일 처리 같은 작업은 트랜잭션 밖으로 분리한다.
4. slow query를 개선해 connection 점유 시간을 줄인다.
5. `maximumPoolSize`만 늘리기보다 active connection이 반환되지 않는 원인을 먼저 찾는다.
---
## 7. 설정 간 관계

> DBCP 설정은 각각 따로 보는 것이 아니라 서로의 관계를 함께 봐야 한다.
### 7.1 max_connections와 maximumPoolSize

> 전체 백엔드 인스턴스가 사용할 수 있는 connection 수는 DB의 max_connections를 넘으면 안 된다.

가장 먼저 봐야 할 관계는 MySQL의 `max_connections`와 HikariCP의 `maximumPoolSize`다.
```text
전체 백엔드 인스턴스 수 × maximumPoolSize ≤ MySQL max_connections에서 운영 여유분을 제외한 값
```

예를 들어:
```text
MySQL max_connections = 60

운영/배치/모니터링 여유분 = 10
애플리케이션에 할당 가능한 connection = 50
```

백엔드 서버가 5대라면:
```text
50 / 5 = 10

각 서버 maximumPoolSize ≈ 10
```
이런 식으로 계산할 수 있다.
### 7.2 wait_timeout과 maxLifetime

> maxLifetime은 DB가 connection을 먼저 끊기 전에 pool이 먼저 교체하도록 wait_timeout보다 짧게 잡는 것이 좋다.

DB나 네트워크 장비가 connection을 먼저 끊으면, pool에는 살아 있는 것처럼 보이지만 실제로는 끊긴 connection이 남을 수 있다.

그래서 일반적으로 HikariCP의 `maxLifetime`은 DB의 `wait_timeout`이나 네트워크 idle timeout보다 짧게 설정한다.
```text
Hikari maxLifetime < DB wait_timeout
```
이렇게 하면 DB가 먼저 connection을 끊기 전에 pool이 connection을 교체할 수 있다.
### 7.3 connectionTimeout과 장애 전파

> connectionTimeout은 pool 고갈 상황에서 요청을 무한정 대기시키지 않기 위한 설정이다.

connectionTimeout은 pool이 고갈되었을 때 요청을 얼마나 기다리게 할지 결정한다.
pool 고갈 상황에서 timeout이 너무 길면 요청이 계속 쌓이고, WAS thread도 오래 점유될 수 있다.
```text
connection 대기
→ request thread 점유
→ 요청 누적
→ 응답 지연 증가
→ 장애 전파
```
따라서 connectionTimeout은 무한 대기가 아니라 적절한 시간 안에 실패하도록 설정해야 한다.

---
## 8. 적절한 Connection 수를 찾는 과정

> 적절한 pool size는 공식으로 정하기보다 부하 테스트와 모니터링으로 찾아야 한다.

적절한 pool size는 서비스의 트래픽, 쿼리 성능, DB 서버 리소스, 백엔드 서버 수, 트랜잭션 길이에 따라 달라진다. 따라서 부하 테스트와 모니터링을 통해 찾아야 한다.
### 8.1 모니터링 환경 구축

> DBCP 문제를 판단하려면 백엔드와 DB 상태를 함께 봐야 한다.

Backend:
- RPS
- 평균 응답 시간
- p95/p99 응답 시간
- active thread 수
- Hikari active/idle/pending connection 수

DB:
- CPU
- Memory
- active connection 수
- slow query
- lock wait
- query throughput

DBCP 문제는 백엔드만 봐서는 판단하기 어렵다.
DB 서버가 병목인지, connection pool이 병목인지, 애플리케이션 thread가 병목인지 함께 봐야 한다.
### 8.2 부하 테스트 진행

> 부하 테스트는 트래픽을 점진적으로 늘리면서 변곡점을 찾는 방식으로 진행한다.

처음부터 큰 부하를 주기보다 점진적으로 트래픽을 늘린다.
```text
낮은 RPS
→ 중간 RPS
→ 높은 RPS
→ 목표 트래픽 이상
```

이때 다음 지표를 본다.

```text
RPS
ART, p95, p99
DB CPU/MEM
Backend CPU/MEM
active thread
Hikari active connection
Hikari idle connection
Hikari pending threads
slow query
lock wait
```

성능 변곡점에서 어떤 리소스가 먼저 한계에 도달했는지 확인해야 한다.
### 8.3 상황별 판단

> pool size를 조정하기 전에 병목이 connection 부족인지 DB 부하인지 구분해야 한다.

#### Case 1. Hikari active connection이 maximumPoolSize에 계속 붙어 있음
```text
active connection = maximumPoolSize
pending threads 증가
DB CPU 여유 있음
```

이 경우 pool size가 작을 수 있다.
다만 바로 크게 늘리기보다 조금씩 늘려가며 테스트해야 한다.
```text
maximumPoolSize 10
→ 15
→ 20
```
#### Case 2. DB CPU가 이미 높음

```text
DB CPU 90% 이상
slow query 증가
lock wait 증가
```

이 경우 pool size를 늘리면 오히려 DB에 더 많은 부하를 줄 수 있다.
먼저 쿼리 최적화, 인덱스 개선, 캐시, read replica 등을 고려해야 한다.
#### Case 3. 백엔드 thread가 부족함

```text
DB 여유 있음
Hikari connection 여유 있음
RPS 증가 안 됨
active thread 수 한계
```

이 경우 DB connection 문제가 아니라 WAS thread pool이나 애플리케이션 처리 로직이 병목일 수 있다.
#### Case 4. connection을 오래 잡고 있음

```text
active connection이 오래 유지됨
pending threads 증가
DB CPU는 낮음
```

이 경우 쿼리 자체보다 트랜잭션 범위가 너무 길거나, DB connection을 잡은 채 외부 API 호출, 파일 처리 등을 하고 있을 수 있다.

```text
트랜잭션 범위 줄이기
DB 작업과 외부 I/O 분리
slow query 개선
connection leak 확인
```