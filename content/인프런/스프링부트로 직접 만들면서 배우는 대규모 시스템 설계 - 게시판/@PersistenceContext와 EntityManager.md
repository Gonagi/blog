## 1. @PersistenceContext

### 1.1 공식 정의
![](https://i.imgur.com/f4gUf63.png)
정리하면 다음과 같다.
- 컨테이너가 관리하는 `EntityManager`를 주입받는다
- 개발자가 직접 생성하지 않는다
- 트랜잭션과 자동으로 연동된다

즉, `EntityManager`의 생성·종료·스레드 연결을 **개발자가 책임지지 않는다**

---
## 2. EntityManager

### 2.1 공식 정의
![](https://i.imgur.com/8UoRHQO.png)

즉, `EntityManager`는 **영속성 컨텍스트(Persistence Context)에 접근하기 위한 핵심 인터페이스**다.

---
### 2.2 영속성 컨텍스트란

영속성 컨텍스트는 JPA가 엔티티를 관리하기 위해 사용하는 **논리적인 메모리 공간**이다.
- 데이터베이스와 직접 연결된 공간 ❌
- 엔티티 상태를 관리하는 1차 캐시 ⭕
- 트랜잭션 범위 내에서 유지 ⭕

JPA는 다음과 같은 흐름으로 동작한다.
1. 엔티티를 즉시 DB에 반영하지 않는다
2. 영속성 컨텍스트에 먼저 저장한다
3. 트랜잭션 커밋 시점에 SQL을 생성·실행한다

이 구조 덕분에 JPA는  
**성능 최적화 + 자동 변경 감지(Dirty Checking)**를 제공할 수 있다.

---
### 2.3 EntityManager의 주요 역할

EntityManager는 엔티티의 생명주기를 관리한다.
- `persist()` : 엔티티를 **영속 상태(managed)**로 전환
- `find()` : 1차 캐시 → DB 순서로 조회
- `remove()` : 삭제 예약
- Dirty Checking : 변경 사항 자동 감지 및 UPDATE 반영

JPA에서 발생하는 대부분의 동작은  
결국 `EntityManager`를 통해 수행된다.

---
## 3. 왜 `new EntityManager()`를 사용하지 않을까

### 3.1 잘못된 접근
```
EntityManager em = new EntityManager(); // 불가능
```
JPA에서는 위와 같은 방식이 허용되지 않는다.

---
### 3.2 이유

EntityManager를 직접 생성하지 못하게 한 이유는 구조적이다.
- EntityManager는 **트랜잭션과 강하게 결합**되어 있다
- 스레드마다 서로 다른 영속성 컨텍스트가 필요하다
- flush / close 타이밍을 잘못 관리하면 심각한 오류가 발생한다

특히 멀티스레드 환경에서는 다음 문제가 발생할 수 있다.
- 하나의 EntityManager를 여러 스레드가 공유
- 트랜잭션 경계 붕괴
- 데이터 정합성 붕괴

따라서 JPA는  
**EntityManager의 생명주기를 컨테이너에게 위임**하도록 설계되었다.

---
## 4. Container-Managed EntityManager와 프록시

### 4.1 `@PersistenceContext`의 특징

| 항목      | 설명                            |
| ------- | ----------------------------- |
| 생명주기    | 컨테이너(Spring/JPA)가 관리          |
| 트랜잭션 연동 | 현재 트랜잭션에 자동 참여                |
| 스레드 안전성 | EntityManager 자체는 스레드 안전하지 않음 |
| 해결 방식   | 프록시 기반 위임                     |

---
### 4.2 실제로 주입되는 것은 프록시다
```
@PersistenceContext EntityManager entityManager;
```

이때 주입되는 객체는 **실제 EntityManager가 아니다**.  
Spring은 **프록시 객체**를 주입한다.

이 프록시는 다음과 같이 동작한다.
1. 메서드 호출 발생
2. 현재 스레드 확인
3. 현재 트랜잭션 확인
4. 해당 트랜잭션에 바인딩된 실제 EntityManager로 위임

이 구조 덕분에  
하나의 필드를 여러 스레드에서 사용해도 문제가 발생하지 않는다.

---
## 5. 예시

아래 코드는 대량 데이터를 병렬로 삽입하는 테스트 코드다.
``` java
@SpringBootTest
public class DataInitializer {

    @PersistenceContext
    EntityManager entityManager;

    @Autowired
    TransactionTemplate transactionTemplate;

    Snowflake snowflake = new Snowflake();
    CountDownLatch latch = new CountDownLatch(EXECUTE_COUNT);

    static final int BULK_INSERT_SIZE = 2_000;
    static final int EXECUTE_COUNT = 6_000;

```
이 코드의 핵심은 다음 조합이다.
- `ExecutorService` → 멀티스레드 실행
- `TransactionTemplate` → 스레드별 트랜잭션 보장
- `@PersistenceContext` → 스레드별 EntityManager 자동 연결

---
### 5.1 트랜잭션 단위와 영속성 컨텍스트
``` java
void insert() {
    transactionTemplate.executeWithoutResult(status -> {
        for (int idx = 0; idx < BULK_INSERT_SIZE; idx++) {
            Article article = Article.create(
                snowflake.nextId(),
                "title" + idx,
                "content" + idx,
                1L,
                1L
            );

            entityManager.persist(article);
        }
    });
}
```
이 코드에서 중요한 점은 다음이다.
- `executeWithoutResult()`는 **새 트랜잭션을 시작**
- 해당 트랜잭션마다 **독립된 영속성 컨텍스트 생성**
- `persist()`는 즉시 INSERT 실행 ❌
- 트랜잭션 커밋 시점에 flush 발생 ⭕

즉, **각 스레드는 자신만의 트랜잭션과 영속성 컨텍스트를 가진다**

> EntityManager는 Tread Unsafe하지만, 해당 코드에서는 EntityManager를 직접 생성하지 않는다.
> 
> 따라서 프록시 + 트랜잭션 바인딩 덕분에 각 스레드는 서로 간섭하지 않는다

---
## 6. EntityManager를 직접 사용하는 경우

### 6.1 적절한 경우
- 대량 insert / batch 처리
- flush 타이밍을 직접 제어해야 하는 경우
- 테스트 데이터 초기화
- Repository 내부 커스텀 구현

---
### 6.2 피해야 하는 경우
- 단순 CRUD 로직
- 비즈니스 서비스 계층
- 트랜잭션 경계가 불분명한 코드

이 경우에는  
`JpaRepository`가 더 안전하고 읽기 쉽다.

---
## 7. 요약

> `@PersistenceContext`는 트랜잭션과 영속성 컨텍스트를 안전하게 연결하기 위해, EntityManager의 생명주기를 컨테이너에 위임하는 JPA의 표준 메커니즘이다.

---
## 참고 자료 (출처)
- Jakarta Persistence Specification [https://jakarta.ee/specifications/persistence/](https://jakarta.ee/specifications/persistence/)
- Spring Framework Reference – JPA [https://docs.spring.io/spring-framework/reference/data-access/orm/jpa.html](https://docs.spring.io/spring-framework/reference/data-access/orm/jpa.html)
- Hibernate ORM User Guide [https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html)
- Bluewhale, _Entity, EntityManager and Persistence Context_ (2021) https://velog.io/@koo8624/Spring-EntityManager
- itconquest.tistory.com, _Spring Boot JPA 영속성 컨텍스트 완벽 이해_ https://itconquest.tistory.com/entry/Spring-Boot-JPA-%EC%98%81%EC%86%8D%EC%84%B1-%EC%BB%A8%ED%85%8D%EC%8A%A4%ED%8A%B8-%EC%99%84%EB%B2%BD-%EC%9D%B4%ED%95%B4