# Contents
## 1. 인프라스트럭처 장애
## 2. 설계 오류
## 3. 애플리케이션 구현
## 4. 트래픽 급증 시 대응 전략
---
## 1. 인프라스트럭처 장애

> 코드 문제가 아니라 서버, 네트워크, 디스크, DB, 로드밸런서 같은 기반 환경에서 발생하는 장애

애플리케이션 로직이 정상이어도 발생할 수 있다.
- 서버 다운
- 디스크 용량 부족
- 네트워크 단절
- DB 장애
이런 장애에 대응할 때 **한 곳이 죽어도 서비스가 완전히 중단되지 않도록 구성하는 것**이 중요하다.

이를 위해 다음과 같은 구조를 사용한다.
1. Active-Standby
2. Active-Active
3. Primary-Replica(Master-Slave)
### 1.1 Active-Standby

> Active-Standby는 평소에는 Active 서버가 트래픽을 처리하고, Standby 서버는 대기하다가 장애 발생 시 역할을 넘겨받는 고가용성 구성이다.

Active-Standby 구조에서는 하나의 서버가 실제 요청을 처리한다.
Standby 서버는 평소에는 직접 트래픽을 처리하지 않고, Active 서버에 장애가 발생했을 때 서비스를 이어받기 위해 대기한다.

- Active 서버에 장애가 발생하면 Failover가 발생한다.
	- Health Check 실패
	- Standby Server로 전환
	- Standby Server가 Active 역할 수행
- Failover가 완료되면 Standby 서버가 새로운 Active 서버가 되어 트래픽을 처리한다.
- 기존 Active 서버가 복구되면 두가지 선택지가 있다.
	1. 복구된 서버를 다시 Active로 전환한다.
	2. 복구된 서버를 Standby로 둔다.
	- 보통 불필요한 재전환으로 인한 장애 위험을 줄이기 위해, 복구된 서버를 Standby로 두는 경우가 많다.
#### 1.1.1 장점
- 구조가 비교적 단순하다.
- 장애 발생 시에도 서비스를 이어갈 수 있다.
- Active-Active 보다 데이터 정합성 관리가 상대적으로 쉽다.
#### 1.1.2 단점
- Standby는 사용하지않고 대기해야 하기 떄문에 자원 활용률이 낮고, 비용이 발생한다.
- Failover 과정에서 짧은 서비스 중단이 발생할 수 있다.
- Failover 자동화가 제대로 되어 있지 않으면 복구 시간이 길어질 수 있다.
### 1.2 Active-Active

> 여러 서버가 동시에 트래픽을 처리하고, 한 서버에 장애가 발생하면 나머지 서버가 트래픽을 계속 처리하는 고가용성 구성이다.

정상 상태:
``` text
          ┌→ Active Server 1
Client → LB
          └→ Active Server 2
```

장애 발생(Active Server 1)
``` text
          ┌→ Active Server 1 X
Client → LB
          └→ Active Server 2
```
- 로드밸런서가 Health Check를 통해 장애를 감지하고 해당 서버로 트래픽을 보내지 않는다.
- 트래픽 라우팅이 정상 서버로 빠르게 전환된다.
#### 1.2.1 장점
- 여러 서버가 동시에 요청을 처리하므로 처리량이 높다.(자원 활용률↑)
- 특정 서버가 죽어도 나머지 서버가 요청을 처리할 수 있다.
- 장애 전환이 빠르다.
#### 1.2.2 단점
- 데이터 정합성(Data Consistency) 문제 발생
	- 두 서버가 같은 시점에 같은 데이터를 수정하면 충돌 발생
	- 복제 지연(동기화가 완료되기 전에 다른 변경사항이 발생 가능)
	- 충돌 해결 복잡성(어느 값을 최종으로 할지 판단하는 로직 필요(추가 오버헤드))
	- 구현 복잡도(충돌 감지, 해결, 롤백 메커니즘 구현 필요)

따라서 Active-Active는 정말 필요한 곳에서만 사용한다.
- 서비스가 중단되는게 더 큰 손해인 **금융 거래 시스템, 대형 통신사 시스템** 등
### 1.3 Primary-Replica(Master-Slave)

> 쓰기는 Primary가 담당하고, 읽기는 Replica로 분산해 읽기 부하를 줄이는 구성

Primary 역할: 
- 쓰기
	- INSERT
	- UPDATE
	- DELETE

Replica 역할:
- 읽기
	- SELECT

- Primary에서 데이터 변경이 발생하면 Replica로 변경 사항이 복제된다.
- 대부분의 웹 서비스는 쓰기보다 읽기 요청이 많다.
#### 1.3.1 장점
- 읽기 부하를 분산할 수 있다.
- Primary DB의 부담을 줄일 수 있다.
- 읽기가 많은 서비스의 성능 향상
- Replica를 추가해 읽기 처리량을 확장할 수 있다.
#### 1.3.2 단점
- Replication Lag
	- Primary의 변경 사항이 Replica에 반영되기까지 지연이 발생하는 문제
	- Primary에 데이터를 쓴 직후 Replica에서 읽으면 아직 복제가 완료되지 않았을 수 있다.
		1. Primary에 주문 저장
		2. Replica로 복제되기 전
		3. 사용자가 주문 내역 조회
		4. Replica에서 읽음
		5. 방금 저장한 주문이 안 보임
	- 따라서 최신 데이터가 반드시 필요한 조회는 Primary에서 읽도록 처리해야 한다.
		- 내가 방금 작성한 글 조회
		- 방금 결제한 주문 내역 조회
		- 방금 변경한 회원 정보 조회
- Primary 장애
	- Primary에서 장애가 발생하면 쓰기 작업을 할 수 없다.
	- Replica를 Primary로 승격할 수 있지만, 이 과정이 자동화되어 있지 않으면 장애 시간이 길어질 수 있다.
	- 따라서 운영 환경에서는 자동 Failover 구성을 함께 고려해야 한다.
- 읽기/쓰기 라우팅 필요
	- 애플레이케이션 레벨에서 어떤 쿼리를 Primary, Replica로 보낼지 구분해야 한다.
		- 쓰기 쿼리 → Primary
		- 일반 조회 → Replica
		- 최신성이 중요한 조회 → Primary
	- 읽기가 압도적으로 많은 서비스, 약간의 데이터 지연 허용 가능, 애플리케이션 로직 구현 가능
### 1.4 Active-Standby, Active-Active, Primary-Replica 차이

> Active-Standby와 Active-Active는 고가용성 목적,
>  Primary-Replica는 읽기 부하 분산 목적이 강하다.

|       구분        |      목적       |          동작 방식           |         장점          |            주의점            |
| :-------------: | :-----------: | :----------------------: | :-----------------: | :-----------------------: |
| Active-Standby  |     고가용성      |      하나는 처리, 하나는 대기      | 구조가 단순하고 정합성 관리가 쉬움 | Failover 시간 발생, 자원 활용률 낮음 |
|  Active-Active  | 고가용성 + 처리량 증가 |      여러 서버가 동시에 처리       | 빠른 장애 대응, 자원 활용률 높음 |   상태 관리, 동시 쓰기, 정합성 문제    |
| Primary-Replica |   읽기 부하 분산    | Primary는 쓰기, Replica는 읽기 | 읽기 성능 향상, 수평 확장 용이  | 복제 지연, Primary 장애, 라우팅 필요 |

---
## 2. 설계 오류

> 설계 오류는 데이터 규모, 트래픽 증가, 조회 패턴을 고려하지 못해 DB 구조 자체가 병목이 되는 문제다.

애플리케이션 코드가 정상이어도 DB 설계가 잘못되면 장애나 성능 저하가 발생할 수 있다.

대표적인 DB 설계 오류는 다음과 같다.
1. 대용량 테이블을 그대로 방치하는 경우
2. 단일 DB에 모든 부하가 집중되는 경우
3. 조회 패턴과 맞지 않는 테이블/인덱스 설계
4. 비효율적인 쿼리가 반복적으로 실행되는 경우

예를 들어 주문, 로그, 이벤트 데이터처럼 계속 증가하는 테이블을 아무 전략 없이 하나의 테이블에 계속 쌓으면 조회, 삭제, 백업, 인덱스 관리 비용이 커질 수 있다.

이런 문제를 줄이기 위해 대표적으로 다음 전략을 고려한다.
1. Partitioning
2. Sharding
3. Query / Index 최적화
4. Cache 또는 Read Replica 활용
### 2.1 Partitioning

> 하나의 큰 테이블을 논리적으로는 하나의 테이블처럼 유지하면서, 물리적으로는 여러 파티션으로 나누어 저장하는 기법

애플리케이션은 기존처럼 하나의 테이블에 쿼리하지만, DB 내부에서는 데이터를 여러 파티션으로 나누어 저장한다.

애플리케이션 입장:
- orders 테이블 하나로 조회

DB 내부:
- orders_p202601
- orders_p202602
- orders_p202603
- 처럼 여러 파티션으로 관리

**쿼리 조건에 맞는 파티션만 읽도록 만드는 것**이 중요하다.
#### 2.1.1 사용하는 이유

> 대용량 테이블의 조회 범위를 줄이고, 오래된 데이터 관리 비용을 낮추기 위해 사용한다.

Partitioning을 사용하는 이유는 크게 세 가지다.
1. 대용량 테이블의 조회 범위 축소
2. 오래된 데이터 삭제/보관 관리 편의성
3. 인덱스와 데이터 관리 범위 축소
#### 2.1.2 종류

> Partitioning 방식은 데이터 특성과 쿼리 패턴에 맞게 선택해야 한다.
##### 1. Range Partitioning

> 날짜, 시간, 숫자처럼 연속적인 범위를 기준으로 데이터를 나누는 방식

예시:
- 주문 데이터를 월별로 분리
- 로그 데이터를 날짜별로 분리
- 결제 이력을 연도별로 분리

적합한 경우:
- 날짜 범위 조회가 많을 때
- 최근 데이터 위주로 조회할 때
- 오래된 데이터를 주기적으로 삭제해야 할 때
##### 2. List Partitioning

> 지역, 상태, 카테고리처럼 명확한 그룹 값을 기준으로 데이터를 나누는 방식

예시:
- 사용자를 지역별로 분리
- 상품을 카테고리별로 분리
- 주문을 상태별로 분리

적합한 경우:
- 조회 조건이 특정 카테고리나 상태 값 중심일 때
- 값의 종류가 비교적 명확하고 제한적일 때
##### 3. Hash Partitioning

> 특정 key의 hash 값을 기준으로 데이터를 여러 파티션에 균등하게 분산하는 방식

예시:
- user_id 기준으로 사용자 데이터 분산
- session_id 기준으로 세션 데이터 분산

적합한 경우:
- 데이터를 균등하게 분산하고 싶을 때
- 특정 key 기반의 단건 조회가 많을 때
- 특정 범위보다 분산 자체가 중요할 때

단점:
- 범위 조회에는 적합하지 않다.
### 2.1.3 장점

> 조회와 관리 범위를 줄일 수 있다.

1. 필요한 파티션만 조회해 스캔 범위를 줄일 수 있다.
2. 오래된 데이터를 파티션 단위로 삭제하거나 보관하기 쉽다.
3. 대용량 테이블의 인덱스 관리 부담을 줄일 수 있다.
4. 특정 쿼리 패턴에서는 성능을 크게 개선할 수 있다.
#### 2.1.4 단점

> 파티션 키와 조회 패턴이 맞지 않으면 오히려 성능이 나빠질 수 있다.

1. 파티션 관리 복잡도가 증가한다.
2. 파티션 키를 잘못 선택하면 성능 개선 효과가 작다.
3. 파티션 키가 없는 조회는 여러 파티션을 스캔할 수 있다.
4. 파티션 키 변경이 어렵다.
5. 너무 많은 파티션은 오히려 관리 비용과 옵티마이저 부담을 키울 수 있다.
#### 2.1.5 Partitioning 선택 기준

> 데이터가 어떻게 쌓이고, 어떤 조건으로 조회되는지를 기준으로 선택해야 한다.

선택 기준은 다음과 같다.
1. 대부분의 쿼리가 어떤 조건으로 조회되는가?
2. 데이터가 어떤 기준으로 계속 증가하는가?
3. 오래된 데이터를 어떤 기준으로 삭제하거나 보관하는가?
4. 파티션 키가 쿼리 조건에 자주 포함되는가?

가이드:
```text
Range Partitioning
→ 날짜, 시간, 숫자 범위 조회가 많을 때

List Partitioning
→ 지역, 카테고리, 상태처럼 명확한 그룹 기준이 있을 때

Hash Partitioning
→ 특정 key 기준으로 균등 분산이 필요할 때
```

Partitioning은 테이블 설계 초기부터 고려하는 것이 좋다.
수억 건이 쌓인 뒤 적용하려면 대규모 마이그레이션이 필요할 수 있기 때문이다.

---
## 2.2 Sharding

> 데이터를 여러 개의 독립적인 DB 서버에 나누어 저장해 부하를 분산하는 방식

단일 DB 서버에 모든 데이터와 트래픽이 집중되는 문제를 해결하기 위한 수평 확장 방식이다.
Partitioning이 하나의 DB 내부에서 테이블을 나누는 것이라면, Sharding은 여러 DB 서버로 데이터를 나눈다.
```text
Partitioning:
하나의 DB 서버 내부에서 테이블을 여러 파티션으로 나눔

Sharding:
여러 DB 서버에 데이터를 분산 저장함
```
### 2.2.1사용하는 이유

> Sharding은 단일 DB 서버의 물리적 한계를 넘어 쓰기와 저장 용량을 수평 확장하기 위해 사용한다.

Sharding의 목적은 다음과 같다.
```text
1. 단일 DB 서버의 부하 분산
2. 저장 용량 확장
3. 쓰기 트래픽 분산
4. 장애 영향 범위 축소
```

단일 DB 서버의 CPU, 메모리, Disk I/O, connection, storage 한계에 도달하면 scale-up만으로는 부족해질 수 있다.이때 데이터를 여러 DB 서버에 나누면 각 서버가 일부 데이터와 요청만 담당하게 된다.
```text
단일 DB:
모든 데이터와 요청이 한 서버에 집중

Sharding:
데이터와 요청을 여러 DB 서버로 분산
```
#### 2.2.2 장점

> 여러 DB 서버로 데이터를 나누어 저장 용량과 처리량을 확장할 수 있다.

1. 수평 확장이 가능하다.
2. 단일 DB 서버의 부하를 줄일 수 있다.
3. 쓰기 트래픽도 분산할 수 있다.
4. 특정 shard 장애가 전체 데이터 장애로 이어지는 것을 줄일 수 있다.

Read Replica는 읽기 부하는 분산할 수 있지만, 쓰기 부하는 Primary에 집중된다.
반면 Sharding은 데이터를 여러 Primary 역할의 shard에 나누기 때문에 쓰기 부하도 분산할 수 있다.
#### 2.2.3 단점

> Sharding은 확장성은 높이지만 애플리케이션, 운영, 데이터 정합성 측면의 복잡도가 크게 증가한다.

- Shard 라우팅 로직 필요
	- 여러 DB 서버로 나누어져 있기 때문에 애플리케이션이나 미들웨어가 어느 shard로 갈지 판단해야 한다.
- Shard 간 JOIN이 어렵다
	- 같은 DB 서버 안에서는 JOIN이 가능하지만, 데이터가 서로 다른 shard에 있으면 일반적인 JOIN이 어렵다.
	- 이 경우 애플리케이션에서 여러 shard를 조회한 뒤 메모리에서 조합해야 할 수 있다.
		- 이 방식은 성능과 구현 복잡도 측면에서 부담이 크다.
- Shard 간 트랜잭션이 어렵다
	- 하나의 비즈니스 작업이 여러 shard의 데이터를 변경해야 한다면 분산 트랜잭션 문제가 발생한다.
- Shard 재배치가 어렵다
	- shard를늘리면 데이터 재분배가 필요할 수 있다.
	- 이 작업은 서비스 중단 없이 수행하기 어렵고, 데이터 이동 중 정합성 문제도 생길 수 있다.
- Hotspot 문제
	- Shard key를 잘못 잡으면 특정 shard에 트래픽이 몰릴 수 있다.
	- 예를 들어 유명인의 게시글, 인기 상품, 특정 지역 데이터가 하나의 shard에 몰리면 해당 shard만 과부하가 걸린다.
#### 2.2.4 언제 고려하는가?

> 단일 DB 최적화로 더 이상 한계를 해결하기 어려울 때 마지막에 가까운 확장 전략으로 고려한다.

Sharding은 강력하지만 복잡도가 매우 크다.
그래서 처음부터 적용하기보다는 단계적으로 접근하는 것이 좋다.
1. 쿼리 최적화
2. 인덱스 최적화
3. 캐싱
4. Read Replica
5. Partitioning
6. Sharding

- 단일 DB에서 CPU, 메모리, Disk I/O, connection, storage를 최적화했는데도 한계에 도달했다면 sharding을 고려할 수 있다.
- 즉, sharding은 단순히 “성능을 높이기 위한 첫 번째 선택지”가 아니라, 단일 DB 구조의 한계를 넘기 위한 전략이다.
---
### 2.3 Partitioning vs Sharding

> Partitioning은 하나의 DB 안에서 큰 테이블을 나누는 방식이고,
> Sharding은 여러 DB 서버로 데이터를 나누는 방식이다.

| 구분         | Partitioning         | Sharding               |
| ---------- | -------------------- | ---------------------- |
| 분할 대상      | 하나의 큰 테이블            | 전체 데이터 또는 특정 도메인 데이터   |
| 서버 구조      | 보통 하나의 DB 서버 내부      | 여러 독립 DB 서버            |
| 목적         | 대용량 테이블 관리, 조회 범위 축소 | 부하 분산, 저장 용량 확장, 쓰기 분산 |
| 애플리케이션 라우팅 | 일반적으로 필요 없음          | 필요함                    |
| JOIN       | 같은 DB 안에서 가능         | shard 간 JOIN 어려움       |
| 트랜잭션       | 같은 DB 안에서는 비교적 단순    | shard 간 분산 트랜잭션 문제     |
| 확장성        | 단일 DB 한계 안에서 개선      | 수평 확장 가능               |
| 복잡도        | 중간                   | 높음                     |
#### 2.3.1 목적 차이

> Partitioning은 큰 테이블을 효율적으로 관리하기 위한 방법이고,
> Sharding은 DB 서버의 부하를 분산하기 위한 방법이다.

Partitioning은 주로 대용량 테이블의 조회와 관리 비용을 줄이기 위해 사용한다.
```text
대용량 테이블
→ 파티션 단위로 나눔
→ 필요한 파티션만 조회
→ 오래된 파티션 삭제 용이
```

Sharding은 단일 DB 서버가 감당하기 어려운 부하를 여러 DB 서버로 나누기 위해 사용한다.
```text
단일 DB 부하 집중
→ 여러 shard DB로 데이터 분산
→ 저장 용량과 처리량 확장
```
#### 2.3.2 라우팅 차이

> Partitioning은 DB가 파티션을 선택하고,
> Sharding은 애플리케이션이나 미들웨어가 shard를 선택해야 한다.

Partitioning에서는 애플리케이션이 기존처럼 같은 테이블에 쿼리한다.
```sql
SELECT *
FROM orders
WHERE order_date >= '2026-01-01';
```
DB 옵티마이저가 조건을 보고 필요한 파티션만 선택한다.

반면 Sharding에서는 요청이 어느 DB 서버로 가야 하는지 선택해야 한다.
```text
user_id = 10
→ hash(user_id)
→ Shard 2 선택
```
#### 2.3.3 JOIN 차이

> Partitioning은 같은 DB 안에서 JOIN이 가능하지만,
> Sharding은 shard 간 JOIN이 어렵다.

Partitioning은 같은 DB 서버 내부의 테이블 분할이므로 일반적인 SQL JOIN이 가능하다.
다만 파티션 키를 잘 활용하지 못하면 여러 파티션을 스캔해야 해서 성능이 나빠질 수 있다.

Sharding은 데이터가 서로 다른 DB 서버에 있을 수 있기 때문에 일반적인 JOIN이 어렵다.
이 경우 애플리케이션에서 여러 shard를 조회한 뒤 결과를 조합해야 할 수 있다.

---
아래는 지금까지 이야기한 **애플리케이션 구현 관점의 DB 문제**를 핵심만 정리한 버전이에요.

---
## 3. 애플리케이션 구현

> 애플리케이션 구현 문제는 개발자가 DB를 사용하는 방식 때문에 발생하는 성능·정합성 문제다.

DB 서버 자체에는 문제가 없어도, 애플리케이션 코드에서 DB를 잘못 사용하면 다음 문제가 발생할 수 있다.
1. 쿼리 지연
2. ORM으로 인한 N+1 문제
3. 긴 트랜잭션
4. DB 동시성 문제
5. Deadlock
### 3.1 쿼리 지연

> DB 요청이 오래 걸려 API 응답 시간까지 느려지는 문제

쿼리가 느려지면 사용자는 웹페이지 로딩 지연, API 응답 지연, timeout을 체감한다.
특히 느린 쿼리는 해당 요청뿐 아니라 전체 API 응답 지연으로 이어질 수 있다.
```text
쿼리 지연
→ DB connection을 오래 점유
→ Hikari active connection 증가
→ pool 고갈 가능
→ 다른 요청도 connection 대기
→ 전체 응답 지연
```

주요 원인:
- WHERE 조건에 인덱스가 없음
- 너무 많은 row 조회
- SELECT * 사용
- 비효율적인 JOIN
- ORDER BY / GROUP BY가 인덱스를 활용하지 못함
- Lock wait 발생
- N+1 쿼리 발생

개선 방법:
- EXPLAIN으로 실행 계획 확인
- slow query log 확인
- 인덱스 추가 또는 조정
- 조회 범위 제한
- 필요한 컬럼만 조회
- pagination 적용
- lock wait 확인
### 3.2 ORM/SQL Mapper 사용 시 주의점

> ORM은 생산성을 높여주지만, 성능 문제가 숨어있을 수 있다.

Spring에서는 JPA/Hibernate 같은 ORM이나 MyBatis 같은 SQL Mapper를 통해 DB를 다룬다.
ORM을 사용하면 SQL 작성량이 줄고 객체 중심으로 개발할 수 있어 생산성이 좋아진다.

하지만 내부에서 어떤 SQL이 실행되는지 확인하지 않으면 문제가 생긴다.
- 예상보다 많은 쿼리 실행
- Lazy Loading으로 추가 쿼리 발생
- N+1 문제 발생
- 불필요한 JOIN 발생
- 트랜잭션 범위가 길어짐
따라서 ORM을 사용할 때는 반드시 SQL 로그와 실행 계획을 함께 확인해야 한다.
### 3.3 N+1 문제

> 최초 1번의 조회 이후, 연관 데이터를 가져오기 위해 N번의 추가 쿼리가 발생하는 문제

예를 들어 게시글 100개를 조회한 뒤, 각 게시글의 작성자를 Lazy Loading으로 가져오면 다음처럼 된다.
```text
게시글 조회 1번
작성자 조회 100번

총 101번 쿼리 발생
```
#### 3.3.1 해결 방법

> 연관 데이터를 어떤 방식으로 함께 가져올지 명시적으로 설계해 해결한다.

대표적인 방법은 다음과 같다.
- Fetch Join
- EntityGraph
- Batch Size
- DTO Projection
##### Fetch Join

> 연관 데이터를 JOIN으로 한 번에 조회해 N+1 문제를 줄이는 방법

```java
@Query("select p from Post p join fetch p.user")
List<Post> findAllWithUser();
```

N:1, 1:1 관계에서는 효과적이다.
- 조회 대상 데이터 하나에 연관 데이터가 하나만 붙기 때문에 JOIN을 해도 row 수가 크게 증가하지 않는다.

다만 1:N 관계에서는 조심해야 한다.
- 부모 데이터가 자식 수만큼 중복되어 조회 row 수가 증가할 수 있기 때문이다.

예를 들어 주문 목록을 조회하면서 주문상품까지 fetch join하면, 주문 하나가 주문상품 개수만큼 반복되어 조회된다. 이로 인해 중복 row 증가, 메모리 사용량 증가, pagination 문제가 발생할 수 있다.

따라서 1:N이나 N:M 관계에서는 무조건 fetch join을 사용하기보다, Batch Size나 DTO Projection을 함께 고려하는 것이 좋다.
##### Batch Size

> Lazy Loading이 발생할 때 여러 연관 데이터를 `IN` 쿼리로 묶어서 조회한다.

처음 조회할 때는 연관 객체를 바로 가져오지 않고, 프록시 상태로 둔다.
```java
List<Post> posts = postRepository.findAll();
```

이때는 `posts`만 조회되고, `users`는 아직 조회되지 않는다.
```sql
SELECT *
FROM posts;
```

이후 실제로 연관 객체를 사용하는 순간 Lazy Loading이 발생한다.
```java
post.getUser().getName();
```

이때 Batch Size가 설정되어 있으면, Hibernate가 아직 초기화되지 않은 `user` 프록시들을 모아서 `IN` 쿼리로 한 번에 조회한다.
```sql
SELECT *
FROM users
WHERE id IN (1, 2, 3, ..., 100);
```

즉, 연관 객체를 사용하지 않으면 추가 쿼리는 발생하지 않고, 사용하는 순간 batch size만큼 묶어서 조회한다.
```text
Batch Size 없음:
users 조회 N번

Batch Size 있음:
users 조회를 몇 번의 IN 쿼리로 줄임
```
##### DTO Projection

> API 응답에 필요한 컬럼만 직접 조회해서 DTO로 바로 받는 방식

DTO를 사용한다고 해서 자동으로 N+1 문제가 해결되는 것은 아니다.
엔티티를 먼저 조회한 뒤 DTO로 변환하는 방식은 내부에서 연관 객체를 접근할 수 있기 때문에 Lazy Loading이 발생할 수 있다.
```java
List<Post> posts = postRepository.findAll();

return posts.stream()
    .map(post -> new PostSummaryResponse(
        post.getId(),
        post.getTitle(),
        post.getUser().getName() // Lazy Loading 발생 가능
    ))
    .toList();
```

반면 DTO Projection은 처음부터 API 응답에 필요한 값만 쿼리에서 직접 조회한다.
```java
public record PostSummaryResponse(
    Long postId,
    String title,
    String writerName
) {}
```

```java
@Query("""
    select new com.example.PostSummaryResponse(
        p.id,
        p.title,
        u.name
    )
    from Post p
    join p.user u
""")
List<PostSummaryResponse> findPostSummaries();
```

이 방식은 `post.getUser()`처럼 연관 객체를 나중에 접근하지 않기 때문에 Lazy Loading이 발생하지 않는다.

즉, 필요한 데이터를 한 번의 쿼리로 DTO에 담아오므로 N+1 문제를 피할 수 있고, 불필요한 엔티티 로딩과 연관관계 로딩을 줄일 수 있다. 다만 조회 쿼리와 매핑 코드가 복잡해질 수 있다는 단점이 있다. 또 DTO 생성자에 들어가는 컬럼 순서와 타입을 맞춰야 하고, API 응답 요구사항이 바뀌면 쿼리도 함께 수정해야 할 수 있다.

장점:
- 필요한 컬럼만 조회
- Lazy Loading 방지
- N+1 문제 회피
- 불필요한 엔티티 로딩 감소

단점:
- 조회 쿼리가 길어질 수 있음
- DTO 생성자 순서와 타입을 맞춰야 함
- 응답 요구사항 변경 시 쿼리도 함께 변경될 수 있음

따라서 단순 조회는 엔티티 조회 후 DTO 변환으로 처리할 수 있지만, 목록 조회처럼 데이터 양이 많거나 N+1이 우려되는 경우에는 DTO Projection을 고려하는 것이 좋다.
### 3.4 트랜잭션 범위 문제

> 트랜잭션이 길어질수록 DB connection과 lock을 오래 점유한다.

Spring에서 `@Transactional`을 사용하면 트랜잭션 시작 시 DB connection을 획득하고, 트랜잭션이 끝날 때 connection을 반환한다.

따라서 트랜잭션 안에서 시간이 오래 걸리는 작업을 하면 connection 반환도 늦어진다.
```java
@Transactional
public void createOrder() {
    orderRepository.save(order);  // DB 작업
    paymentClient.pay();          // 외부 API 호출
    emailService.send();          // 외부 작업
}
```

이런 구조는 위험하다.
```text
트랜잭션 시작
→ connection 획득
→ DB 작업
→ 외부 API 대기
→ connection 계속 점유
→ 다른 요청 connection 대기
```

따라서 트랜잭션은 가능한 DB 작업 중심으로 짧게 유지해야 한다.
- DB 작업과 외부 API 호출 분리
- 트랜잭션 범위 축소
- 비동기 이벤트 처리 활용
### 3.5 DB 동시성 문제

> DB 데이터 동시성 문제는 보통 `@Transactional`을 기본으로 두고,
> 필요하면 lock이나 isolation level을 함께 사용한다.

여러 요청이 같은 DB row를 동시에 수정하면 데이터 정합성 문제가 발생할 수 있다.

예를 들어 재고가 1개인데 동시에 두 명이 주문하면 둘 다 재고를 1로 보고 주문을 성공시킬 수 있다.
```text
현재 재고 = 1

요청 A: 재고 확인 → 1
요청 B: 재고 확인 → 1
요청 A: 재고 차감 → 0
요청 B: 재고 차감 → 0

결과: 재고 1개인데 주문 2개 성공 가능
```

이런 문제는 Java의 `synchronized`, `AtomicInteger`로 해결하는 것이 아니라, **DB 트랜잭션과 DB lock으로 관리하는 것**이 일반적이다.
#### 3.5.1 Java 동시성과 DB 동시성 차이

> Java 메모리 동시성은 Java 단에서 관리하고, DB 데이터 동시성은 트랜잭션과 DB lock으로 관리한다.

##### Java 메모리 동시성

>여러 스레드가 같은 객체나 변수 값을 동시에 수정하는 문제

``` text
synchronized
Lock
AtomicInteger
ConcurrentHashMap
```

이런 방식으로 제어한다.
##### DB 데이터 동시성

> 여러 요청이 같은 DB row를 동시에 수정하는 문제

``` text
@Transactional
Pessimistic Lock
Optimistic Lock
Isolation Level
Unique Constraint
```

이런 방식으로 제어한다.
### 3.5.2 @Transactional의 역할

> `@Transactional`은 DB 작업을 하나의 작업 단위로 묶고 commit/rollback을 관리한다.

예를 들어 주문 생성은 여러 DB 작업이 함께 성공하거나 함께 실패해야 한다.
```text
주문 생성
재고 차감
결제 상태 저장
```

이때 `@Transactional`을 사용한다.
```java
@Transactional
public void createOrder() {
    orderRepository.save(order);
    stock.decrease();
    paymentRepository.save(payment);
}
```

성공하면 commit, 예외가 발생하면 rollback한다.

다만 `@Transactional`만으로 모든 동시 수정 문제가 해결되는 것은 아니다.

`@Transactional`은 트랜잭션의 범위를 만들어주지만, 기본적으로 조회 시점부터 데이터를 잠그지는 않는다. 즉, 여러 트랜잭션이 동시에 같은 데이터를 조회하고, 각자 같은 값을 기준으로 판단한 뒤 수정할 수 있다.
``` text
@Transactional
= 작업을 하나의 트랜잭션으로 묶고 commit/rollback을 관리한다.

하지만
= 동시에 같은 데이터를 읽고 판단하는 상황을 항상 막아주지는 않는다.
```

물론 `@Transactional`에는 동시성 문제를 줄이기 위한 `isolation` 설정이 있다.
Isolation Level은 트랜잭션 간 데이터 접근을 어느 정도까지 격리할지 정하는 옵션이다.
격리 수준이 높을수록 데이터 정합성은 높아지지만, 대기 시간 증가, 충돌 증가, 데드락 가능성, 성능 저하가 발생할 수 있다.

대표적인 격리 수준은 다음과 같다.
``` text
READ_COMMITTED
- 커밋된 데이터만 읽는다.
- Dirty Read를 방지한다.
- 같은 데이터를 다시 조회했을 때 값이 달라질 수 있다.
  
REPEATABLE_READ
- 같은 데이터를 반복 조회할 때 동일한 결과를 보장한다.
- Non-repeatable READ를 방지한다.
- DB에 따라 Phantom Read 처리 방식은 다를 수 있다.

SERIALIZABLE
- 트랜잭션 결과가 순차 실행된 것처럼 보장하는 가장 강한 격리 수준이다.
- 동시성 문제를 가장 강하게 줄일 수 있다.
- 하지만 성능 비용이 가장 크다.
```
즉, 격리 수준을 높이면 동시성 문제를 줄일 수 있지만, 트랜잭션 전체의 동시성을 제한할 수 있다.
예를 들어 재고 차감 하나를 보호하기 위해 주문 생성 전체를 `SERIALIABLE`로 처리하면, 필요한 범위보다 넓게 동시성이 제한된다.

그래서 전체 트랜잭션의 격리 수준을 무조건 높이기보다, 동시 수정 문제가 발생하는 특정 데이터나 로직에 **비관적 락, 낙관적 락** 같은 전략을 적용한다.
### 3.5.3 비관적 락

> 충돌 가능성이 높다고 보고, 먼저 row lock을 잡아 다른 트랜잭션의 수정을 막는 방식

재고 차감, 선착순 쿠폰, 좌석 예약처럼 충돌 가능성이 높고 정확성이 중요한 경우에 사용한다.
```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select s from Stock s where s.productId = :productId")
Optional<Stock> findByProductIdForUpdate(@Param("productId") Long productId);
```

실제 SQL은 다음과 비슷하다.
```sql
SELECT *
FROM stock
WHERE product_id = 1
FOR UPDATE;
```

한 트랜잭션이 lock을 잡고 있으면 다른 트랜잭션은 기다린다.

장점:
- 동시 수정 충돌을 강하게 막을 수 있다.
- 정합성이 중요한 작업에 적합하다.

단점:
- 대기 시간이 생긴다.
- lock 경합이 커지면 응답 시간이 느려진다.
- 트랜잭션이 길면 deadlock 가능성이 커진다.
### 3.5.4 낙관적 락

> 충돌이 드물다고 보고, 먼저 막지 않고 version 값으로 나중에 충돌을 감지하는 방식

상품 정보 수정, 게시글 수정, 관리자 설정 수정처럼 동시에 수정될 가능성은 낮지만 덮어쓰기는 막아야 하는 경우에 사용한다.

```java
@Entity
public class Product {

    @Id
    private Long id;

    private String name;

    private int price;

    @Version
    private Long version;
}
```

JPA는 update 시 version 조건을 붙인다.
```sql
UPDATE product
SET name = ?, price = ?, version = version + 1
WHERE id = ?
  AND version = ?;
```
version이 맞지 않으면 update가 실패하고 optimistic lock 예외가 발생한다.

장점:
- lock을 먼저 잡지 않아 동시성이 좋다.
- 충돌이 드문 수정 작업에 적합하다.

단점:
- 충돌 발생 시 재시도하거나 사용자에게 다시 시도하라고 안내해야 한다.
- 충돌이 자주 발생하면 재시도가 많아져 비효율적이다.
### 3.5.5 DB 제약조건 활용

> 동시성 문제는 애플리케이션 로직만 믿지 말고 DB 제약조건으로도 막는 것이 안전하다.

예를 들어 한 사용자가 같은 쿠폰을 한 번만 받을 수 있다면 unique constraint를 둔다.
```sql
ALTER TABLE coupon_issue
ADD CONSTRAINT uk_coupon_issue_user_coupon UNIQUE (user_id, coupon_id);
```

동시에 두 요청이 들어와도 둘 중 하나만 insert에 성공하고, 나머지는 unique constraint 위반으로 실패한다.
```text
요청 A: insert 성공
요청 B: unique constraint 위반
```

이렇게 DB 차원에서 정합성을 보장하는 것이 안전하다.
### 3.6 Deadlock

> 두 개 이상의 트랜잭션이 서로가 가진 lock을 기다리며 더 이상 진행하지 못하는 상황

예를 들어 계좌 A와 B가 있다고 하자.

Transaction 1:
```text
1. 계좌 A lock 획득
2. 계좌 B 수정 시도
3. 계좌 B lock 대기
```

Transaction 2:
```text
1. 계좌 B lock 획득
2. 계좌 A 수정 시도
3. 계좌 A lock 대기
```

결과:
```text
Transaction 1은 B lock을 기다림
Transaction 2는 A lock을 기다림

→ 서로가 가진 lock을 기다리며 deadlock 발생
```

DB는 deadlock을 감지하면 보통 한 트랜잭션을 rollback시키고 나머지를 진행시킨다.
#### 3.6.1 Deadlock이 문제인 이유

> Deadlock이 발생하면 하나의 트랜잭션이 rollback되고, 사용자 요청이 실패할 수 있다.

사용자 입장에서는 다음 문제가 발생할 수 있다.
```text
주문 실패
결제 실패
API 오류
응답 지연
```

또한 lock 대기가 길어지면 connection도 오래 점유한다.
```text
Lock wait 증가
→ transaction 지연
→ connection 점유 시간 증가
→ pool 고갈 가능
→ 다른 요청까지 영향
```
#### 3.6.2 Deadlock 줄이는 방법

> Deadlock은 완전히 없애기 어렵기 때문에 발생 가능성을 줄이고, 발생 시 재시도할 수 있게 설계해야 한다.

대표적인 대응 방법은 다음과 같다.
```text
1. 자원 접근 순서를 통일한다.
2. 트랜잭션을 짧게 유지한다.
3. 필요한 row만 잠그도록 인덱스를 설계한다.
4. 불필요한 범위 업데이트를 줄인다.
5. deadlock 발생 시 재시도 로직을 둔다.
6. lock wait timeout을 적절히 설정한다.
```

##### 접근 순서 통일

> 여러 row나 table을 수정할 때 항상 같은 순서로 접근하면 circular wait 가능성을 줄일 수 있다.

```text
account_id가 작은 계좌 먼저 lock
account_id가 큰 계좌 나중에 lock
```

##### 트랜잭션 짧게 유지

> 트랜잭션 안에서 외부 API 호출, 파일 처리, 복잡한 계산을 하지 않는다.

##### 인덱스 설계

> 적절한 인덱스가 있으면 필요한 row를 빠르게 찾고, 불필요한 lock 범위를 줄일 수 있다.

##### 재시도 로직

> Deadlock은 DB가 한 트랜잭션을 rollback할 수 있으므로,
> 애플리케이션에서 짧은 backoff 후 재시도를 고려한다.

다만 결제나 외부 API 호출처럼 부작용이 있는 작업은 idempotency key를 함께 고려해야 한다.

---
## 4. 트래픽 급증 시 대응 전략

> 부하를 분산하고, 줄이고, 지연시키고, 필요한 경우 용량을 확장하는 방식으로 접근한다.

 단순히 서버를 늘리는 것만으로 해결하기보다, **어디에 부하가 몰리는지 먼저 파악하고 계층별로 대응해야 한다.**
### 4.1 부하를 분산시킨다

> 한 곳에 몰리는 요청을 여러 서버나 구성 요소로 나누어 처리한다.

트래픽 급증 시 가장 먼저 고려할 수 있는 방법은 부하 분산이다.
애플리케이션 서버, DB, 캐시 등 각 계층에서 부하를 나눌 수 있다.
#### 4.1.1 애플리케이션 서버 부하 분산

> 애플리케이션 서버는 Load Balancer를 통해 여러 인스턴스로 요청을 분산한다.

한 대의 서버가 모든 요청을 처리하면 CPU, 메모리, 스레드, connection이 빠르게 고갈될 수 있다.
따라서 여러 서버를 두고 Load Balancer가 요청을 분산한다.
```text
Client
  ↓
Load Balancer
  ↓
App Server 1
App Server 2
App Server 3
```

장점:
- 단일 서버 부하 감소
- 서버 장애 시 정상 서버로 요청 전환
- 수평 확장 가능
#### 4.1.2 DB 읽기 부하 분산

> DB 읽기 요청이 많다면 Read Replica로 조회 부하를 분산할 수 있다.

대부분의 웹 서비스는 쓰기보다 읽기 요청이 많다.
이 경우 Primary DB는 쓰기 작업을 담당하고, Replica DB는 읽기 요청을 처리하게 할 수 있다.

다만 Replica에는 복제 지연이 발생할 수 있기 때문에, 방금 수정한 회원 정보, 방금 생성한 주문 내역처럼 **최신성이 중요한 조회는 Primary에서 읽도록 처리해야 한다.**

Read Replica는 몇 초 만에 무한정 늘리는 대응책이라기보다, **사전에 준비된 읽기 확장 구조**에 가깝다.
### 4.2 부하를 줄인다

> 가장 좋은 최적화는 불필요한 요청이 핵심 자원까지 도달하지 않게 하는 것이다.

트래픽이 많아졌을 때 모든 요청을 그대로 DB까지 보내면 DB가 먼저 병목이 될 수 있다.
따라서 DB나 애플리케이션의 핵심 로직까지 가지 않아도 되는 요청은 앞단에서 줄여야 한다.
#### 4.2.1 캐싱

> 반복 조회가 많은 데이터는 캐시를 통해 DB 접근을 줄인다.

Redis 같은 캐시를 사용하면 매번 DB를 조회하지 않아도 된다.
예를 들어 다음과 같은 데이터는 캐시에 적합하다.
- 인기 게시글
- 상품 상세 정보
- 메인 페이지 데이터
- 랭킹 데이터
- 자주 조회되는 설정 정보

흐름:
- 요청
- 캐시 조회
- 캐시에 있으면 바로 응답
- 없으면 DB 조회 후 캐시에 저장

캐시를 사용하면 DB 부하를 크게 줄일 수 있다.
다만 캐시 무효화, TTL, 데이터 정합성 문제를 함께 고려해야 한다.
#### 4.2.2 Rate Limiting

> 과도한 요청을 제한해 시스템을 보호한다.

트래픽 급증이 정상 사용자 증가일 수도 있지만, 봇, 크롤러, 악의적 요청일 수도 있다.
이 경우 모든 요청을 처리하려고 하면 정상 사용자까지 영향을 받을 수 있다.

그래서 사용자, IP, API Key 단위로 요청 횟수를 제한할 수 있다.
```text
1분에 100회 초과 요청
→ 429 Too Many Requests 반환
```
Rate Limiting은 시스템을 보호하기 위한 방어 장치다.
#### 4.2.3 비핵심 기능 제한

> 장애 상황에서는 핵심 기능을 살리기 위해 비핵심 기능을 일시적으로 제한할 수 있다.

트래픽이 급증하면 모든 기능을 평소처럼 유지하기 어려울 수 있다.
이때 핵심 기능을 우선 살리고, 비용이 큰 비핵심 기능을 제한할 수 있다.
### 4.3 부하를 지연시킨다

> 실시간 처리가 꼭 필요하지 않은 작업은 비동기로 전환해 순간 부하를 흡수한다.

모든 작업을 요청-응답 흐름 안에서 즉시 처리하면 트래픽 급증 시 서버와 DB가 직접 압박을 받는다.
따라서 실시간성이 낮은 작업은 큐에 넣고 나중에 처리할 수 있다.
#### 4.3.1 비동기 처리

> 사용자가 즉시 결과를 볼 필요가 없는 작업은 요청 처리 흐름에서 분리한다.

예를 들어 다음 작업은 비동기로 처리하기 좋다.
- 이메일 발송
- 푸시 알림 발송
- 로그 수집
- 이미지 리사이징
- 통계 집계
- 추천 데이터 계산
#### 4.3.2 메시지 큐 활용

> 메시지 큐는 순간적으로 몰린 작업을 버퍼링하고, worker가 처리 가능한 속도로 소비하게 한다.

메시지 큐를 사용하면 요청이 몰렸을 때 작업을 바로 처리하지 않고 큐에 쌓아둘 수 있다.
```text
Producer
→ Queue / Broker
→ Consumer
```

장점:
- 순간 부하 흡수
- 작업 처리 속도 제어
- 실패 시 재처리 가능
- 요청 처리와 후속 작업 분리
### 4.4 용량을 늘린다

> 실제 자원이 부족하다면 서버나 DB 자원을 확장해야 한다.

부하를 줄이고 분산해도 자원이 부족하면 용량을 늘려야 한다.
확장 방식은 크게 scale-up과 scale-out이 있다.
#### 4.4.1 Scale-up

> 기존 서버의 CPU, 메모리, 디스크 성능을 높이는 방식이다.

예를 들어 DB 서버의 CPU나 메모리를 늘리는 방식이다.
장점은 구조 변경이 비교적 적다는 것이다.
단점으로는 물리적 한계가 있고, 비용이 빠르게 증가할 수 있다.
#### 4.4.2 Scale-out

> 서버 수를 늘려 여러 인스턴스가 함께 요청을 처리하게 하는 방식이다.

애플리케이션 서버는 stateless하게 설계되어 있다면 scale-out이 비교적 쉽다.
Kubernetes나 AWS Auto Scaling을 사용하면 CPU, RPS, queue lag 같은 지표를 기준으로 인스턴스를 자동으로 늘릴 수 있다.

다만 DB는 애플리케이션 서버처럼 쉽게 scale-out하기 어렵다.
DB는 정합성, 트랜잭션, 복제 지연, 데이터 분산 문제를 함께 고려해야 한다.
### 4.5 모니터링과 자동화

> 트래픽 급증 대응은 감으로 하는 것이 아니라, 지표를 기반으로 자동화해야 한다.

트래픽 급증은 사람이 수동으로 감지하고 대응하기에는 늦을 수 있다.
따라서 주요 지표를 수집하고, 임계치를 넘으면 알림 또는 자동 대응이 이루어지게 해야 한다.
#### 4.5.1 확인해야 할 지표

> 병목 위치를 찾기 위해 애플리케이션, DB, 인프라 지표를 함께 봐야 한다.

애플리케이션 지표:
- RPS
- 평균 응답 시간
- p95 / p99 응답 시간
- 에러율
- active thread 수

DB 지표:
- CPU
- Memory
- Disk I/O
- Connection 수
- Slow Query
- Lock Wait
- Replication Lag

DBCP 지표:
- Hikari active connection
- Hikari idle connection
- Hikari pending threads
- connectionTimeout 발생 여부
#### 4.5.2 임계치 설정

> 임계치는 단일 지표가 아니라 여러 지표를 조합해 판단하는 것이 좋다.

예를 들어 CPU만 보고 판단하면 오탐이 생길 수 있다.
CPU가 높아도 응답 시간이 안정적이면 즉시 장애는 아닐 수 있고, CPU가 낮아도 connection pool이 고갈되면 요청은 지연될 수 있다.

예시:
```text
Warning:
CPU > 70% for 5분
p95 응답 시간 증가
알림 발송

Critical:
CPU > 85% for 2분
에러율 증가
connection pool pending 증가
자동 대응 시작

Emergency:
CPU > 95% for 1분
p99 급증
에러율 급증
온콜 호출
```

CPU 하나가 아니라 **응답 시간, 에러율, connection pool, queue lag를 함께 봐야 한다.**
#### 4.5.3 자동화 흐름

> 모니터링 시스템이 이상 징후를 감지하고, 사전에 정의된 대응을 자동으로 실행하게 한다.

예시 흐름은 다음과 같다.
1. Prometheus가 메트릭 수집
2. Alert rule이 임계치 판단
3. Alertmanager가 알림 또는 Webhook 실행
4. Kubernetes / AWS Auto Scaling이 서버 증설
5. Rate Limit, 캐시 정책, 비핵심 기능 제한 적용
6. 온콜 담당자에게 알림