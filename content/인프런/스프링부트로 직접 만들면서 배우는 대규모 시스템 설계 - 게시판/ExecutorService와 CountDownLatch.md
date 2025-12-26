## 1. 등장 배경

멀티스레드 환경을 전제로 한 테스트 코드는 단순히 코드를 병렬로 실행하는 것만으로는 충분하지 않다.

특히 대량 작업을 검증하는 테스트에서는 다음 조건을 동시에 만족해야 한다.
- 대량 작업을 병렬로 실행할 수 있어야 하고
- 각 작업은 서로 독립적으로 수행되어야 하며
- 모든 작업이 끝난 시점을 보장해야 한다

**Java 표준 동시성 도구인 `ExecutorService`와 `CountDownLatch`를 어떻게 조합해** 이러한 요구사항을 충족할 수 있다.

---
## 2. ExecutorService 설계
### 2.1 ExecutorService의 역할

`ExecutorService`는 Java에서 제공하는 **스레드 풀 기반 비동기 작업 실행 프레임워크**다.

이 구조의 목적은 다음과 같다.
- 작업 단위를 명시적으로 분리하고
- 스레드 생명주기를 직접 관리하지 않으며
- 제한된 자원 내에서 병렬 실행을 제어하는 것

---
### 2.2 FixedThreadPool 선택 이유
```java
ExecutorService executorService = Executors.newFixedThreadPool(10);
```
이 테스트에서는 `FixedThreadPool`을 사용했다.  
이는 **병렬 실행 자체보다 ‘제어 가능한 병렬성’이 더 중요했기 때문**이다.

이 선택으로 다음이 보장된다.
- 동시에 실행 가능한 스레드는 **최대 10개**
- 초과 작업은 **큐에 대기**
- 스레드는 재사용되어 생성 비용이 반복되지 않음

> 병렬 실행을 하되, 시스템 자원은 통제된 상태로 유지한다.

테스트 코드에서 무제한 스레드 생성은 다음 문제를 유발할 수 있다.
- DB 커넥션 고갈
- CPU 스케줄링 붕괴
- 테스트 실패 원인 왜곡

따라서 이 구조에서는 **고정 크기 스레드 풀을 사용해 테스트 환경을 안정화**했다.

---
### 2.3 submit()과 실행 모델
```java
executorService.submit(() -> insert());
```
`submit()` 호출 이후의 실행 흐름은 **메인 스레드가 아닌 워커 스레드**에서 진행된다.

즉, 이 구조는 테스트를 **명시적인 멀티스레드 환경으로 전환**시키는 진입점이다.

---
## 3. 작업 분할 전략

> 작은 작업 단위를 다수 병렬로 실행하는 구조

```java
static final int BULK_INSERT_SIZE = 2_000;
static final int EXECUTE_COUNT = 6_000;
```
테스트의 **작업 단위와 병렬성 수준을 동시에 정의**한다.
- 하나의 작업은 **작게 유지**
- 실패 시 영향 범위를 최소화
- 병렬 실행을 통해 전체 처리량 확보
---
## 4. CountDownLatch 설계
### 4.1 CountDownLatch의 필요성

멀티스레드 테스트에서 가장 흔한 오류는 **모든 작업이 끝나기 전에 테스트 메서드가 종료되는 것**이다.

이 문제를 방지하기 위해 모든 작업의 종료 시점을 명시적으로 동기화할 필요가 있다.

이 역할을 수행하는 도구가 `CountDownLatch`다.

---
### 4.2 동작 방식

- 초기 카운트 = 실행해야 할 작업 수
- 각 작업 종료 시 `countDown()` 호출
- 메인 스레드는 `await()`에서 대기
- 카운트가 0이 되면 테스트 종료

> CountDownLatch는 병렬 작업의 **완료 시점을 보장하는 동기화 장치**다.

---
## 5. 개념이 실제 코드에 적용된 형태

지금까지 설명한 구조는  
아래와 같은 테스트 코드에서 사용된다.

핵심 흐름만 남기고, 부수적인 요소는 생략했다.

```java
@SpringBootTest
class DataInitializer {

    // EntityManager, TransactionTemplate 주입 생략

    static final int BULK_INSERT_SIZE = 2_000;
    static final int EXECUTE_COUNT = 6_000;

    CountDownLatch latch = new CountDownLatch(EXECUTE_COUNT);

    @Test
    void initialize() throws InterruptedException {
        ExecutorService executorService = Executors.newFixedThreadPool(10);

        for (int i = 0; i < EXECUTE_COUNT; i++) {
            executorService.submit(() -> {
                insert();          // 작업 단위
                latch.countDown(); // 작업 종료 신호
            });
        }

        latch.await();              // 모든 작업 완료 대기
        executorService.shutdown(); // 스레드 풀 종료
    }

    void insert() {
        // TransactionTemplate 내부에서
        // BULK_INSERT_SIZE 만큼 데이터 처리
    }
}
```
- `ExecutorService` → 병렬 실행 환경 제공
- `CountDownLatch` → 종료 시점 보장
- 트랜잭션 / 비즈니스 로직 → 별도 책임

---
## 6. ExecutorService와 트랜잭션의 관계

`ExecutorService`는 **트랜잭션을 전혀 알지 못한다.**

따라서 멀티스레드 환경에서는 트랜잭션 경계를 어디서 열 것인지가 설계의 핵심이 된다.

이 문제를 해결하기 위해 트랜잭션을 코드 블록 단위로 제어하는 `TransactionTemplate`를 사용했다.

해당 내용은 [[멀티스레드 환경에서의 트랜젝션 관리]]에 정리했다.

---
## 7. CompletableFuture를 사용하지 않은 이유

Java의 `CompletableFuture` 역시 비동기 작업을 병렬로 실행할 수 있는 도구다.
그러나 이 문서의 테스트 구조에서는 다음 이유로 사용하지 않았다.

- 작업 간 의존성이 없고
- 결과를 조합할 필요가 없으며
- 모든 작업이 끝났는지 여부만 중요했기 때문이다

이 경우 `ExecutorService + CountDownLatch` 조합이
구조적으로 단순하고, 의도가 명확하다.

---
## 8. 정리
- ExecutorService는 **병렬 실행을 담당**
- FixedThreadPool은 **자원 통제를 위한 선택**
- CountDownLatch는 **테스트 종료 시점 보장**
- 실행 제어와 트랜잭션 관리는 **의도적으로 분리**