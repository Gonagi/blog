## 1. Primary Key 생성 전략이 필요한 이유
### 1.1 단순한 방식의 한계

Primary Key를 `AUTO_INCREMENT`로 설정하는 것만으로도 구현은 가능하다.  
단일 서버 환경이나 소규모 서비스에서는 충분히 실용적인 선택이다.

하지만 **현대적인 애플리케이션이나 대규모 데이터베이스 환경**에서는  
이러한 단순한 Primary Key 생성 방식만으로는 분명한 한계가 드러난다.

- 분산 환경에서는 ID 생성 지점을 하나로 모으기 어렵다    
- 단일 서버에서는 삽입 성능이 매우 뛰어나지만, 다수의 동시 쓰기 트랜잭션이 몰리면 PK 인덱스의 write hotspot으로 병목이 발생할 수 있다
- 보안이 중요한 서비스에서는 ID가 순차적으로 노출되어 예측 공격에 취약하다

즉, `AUTO_INCREMENT`는 단순하고 직관적이지만, **확장성과 보안 요구사항을 고려하면 제약이 많은 방식**이다.

---
### 1.2 상황별 적절한 전략

|상황|Primary Key 생성 전략|
|---|---|
|단일 서버에서 간단한 데이터 관리|Auto Increment 등|
|분산 데이터베이스(Sharding) 환경|UUID, Snowflake, KSUID 등|
|대량의 동시 쓰기 트랜잭션 처리|Snowflake, TSID 등|
|보안이 중요한 환경 (ID 예측 방지)|Hash 기반 ID, UUID 등|
|데이터 정렬이 중요한 경우|Snowflake, UUIDv7, ULID 등|
|저장 공간을 절약하고 싶은 경우|Base58 인코딩된 UUID, Snowflake 등|
|빠른 검색이 중요한 경우|조합 키(Composite Key) 등|

---
### 1.3 성능에 미치는 영향

Primary Key를 어떻게 생성하느냐에 따라 전체 시스템의 성능이 결정된다.

결국 Primary Key는 단순히 "중복되지 않는 값"이 아니라, 데이터베이스의 성능을 좌우하는 중요한 요소다. 잘못된 Primary Key 선택은 데이터 조회 성능 저하, 트랜잭션 병목 현상, 보안 취약점 등의 문제를 초래할 수 있다.

---
## 2. DB Auto Increment
### 2.1 기본 작동 방식

Auto Increment는 기본 키(Primary Key)로 숫자를 자동 증가시키는 기능이다.

새로운 데이터가 추가될 때마다 기존 값보다 1 증가된 숫자가 자동으로 입력된다.
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);
```

**DBMS별 Auto Increment 지원:**

|DBMS|Auto Increment 기능|
|---|---|
|MySQL|AUTO_INCREMENT|
|Oracle|SEQUENCE|
|PostgreSQL|SERIAL 또는 BIGSERIAL|
|SQL Server|IDENTITY(1,1)|

---
### 2.2 장점

**간단하고 직관적:**
- 특별한 로직 없이 기본 키를 자동으로 증가시킨다
- 개발자가 따로 관리할 필요가 없다

**숫자로 정렬되어 검색 속도가 빠름:**
- Primary Key가 순차적으로 증가하기 때문에 인덱스 관리가 효율적
- 범위 검색(BETWEEN 연산)도 빠르게 처리

**저장 공간이 적음:**
- INT(4바이트)나 BIGINT(8바이트)를 사용하면
- UUID(16바이트)보다 훨씬 작아서 DB 용량이 절약됨

---
### 2.3 단점

**분산 환경에서 중복 문제:**
Auto Increment는 한 개의 데이터베이스에서 동작할 때는 문제가 없다. 하지만 여러 개의 서버(Sharding 환경)를 사용하면, 서버마다 ID가 1부터 시작할 수도 있어서 중복 문제가 발생할 수 있다.

**보안 문제 - 데이터 개수 예측 가능:**
사용자가 자신의 ID를 보면, 사이트의 데이터 개수를 유추할 수 있다.
- 예: 회원 가입 후 id=1000이라면, "1000명이 가입했겠다" 유추 가능
- 해커가 id=999, id=998 이런 식으로 입력해 다른 사용자의 정보를 조회하려고 시도할 수도 있음

**삭제 후 재사용 문제:**
데이터를 삭제하면 ID가 다시 채워지지 않고 계속 증가한다.
- 예: id=1, id=2, id=3 → id=2를 삭제하면, 다음 ID는 id=4가 됨
- 중간 번호가 비는 경우가 발생

---
### 2.4 분산 환경에서 발생하는 문제

샤딩(Sharding)이란, 데이터베이스 성능을 향상시키기 위해 데이터를 여러 개의 서버로 분산 저장하는 방식이다.

단일 서버에서는 Auto Increment가 문제없지만, 샤딩 환경에서는 같은 ID가 여러 서버에서 생성될 수 있다.

**예제 상황:**
- 서버 A: id = 1, 2, 3...
- 서버 B: id = 1, 2, 3... (충돌 발생)

서버 A와 서버 B가 동시에 새로운 데이터를 삽입하면, 서버마다 같은 ID가 생성될 가능성이 있다.

이러한 데이터 충돌은 다음 문제를 발생시킨다:
- Join 및 검색 오류
- 트랜잭션 충돌
- 잘못된 데이터 업데이트/삭제

---
### 2.5 보안 문제

Auto Increment는 예측 가능한 값(순차적 증가 숫자)을 생성하기 때문에, 해커나 악의적인 사용자가 ID를 예측하여 공격할 수 있는 취약점이 존재한다.

**예제 상황:**
- id=1000인 사용자가 새로 가입함
- "이 사이트엔 1000명의 사용자가 있겠군!" 하고 예측 가능
- id=999, id=998을 입력해 이전 회원들의 정보를 추출하려는 시도 가능

만약 API에서 적절한 인증 및 권한 검증이 이루어지지 않는다면, 다른 사용자의 정보를 쉽게 접근할 수 있는 위험이 있다.

---
### 2.6 해결 방법

#### 2.6.1 Sharding Key 추가

서버마다 다른 범위에서 Auto Increment를 시작하면 중복을 방지할 수 있다.
- 서버 A: id = 1, 2, 3...
- 서버 B: id = 1001, 1002, 1003...

#### 2.6.2 Offset 설정

각 서버마다 offset과 step을 다르게 설정하여 충돌을 방지한다.

```sql
-- 서버 A
SET @@auto_increment_offset = 1;
SET @@auto_increment_increment = 2;

-- 서버 B  
SET @@auto_increment_offset = 2;
SET @@auto_increment_increment = 2;
```

이렇게 하면:
- 서버 A: 1, 3, 5, 7...
- 서버 B: 2, 4, 6, 8...

#### 2.6.3 내부 식별자와 외부 식별자 분리

DB 내부에서는 Auto Increment 사용, 외부에서는 UUID 사용한다.
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL
);
```

이렇게 분리하여 사용하면:
- DB 성능은 Auto Increment로 최적화
- 외부 노출은 UUID로 보안 강화
- 데이터 개수를 추측할 수 없게 만듦

---
### 2.7 결론

**Auto Increment를 사용하기 좋은 경우:**
- 단일 서버 환경에서 간단한 서비스
- 보안 요구사항이 높지 않은 경우
- 데이터 정렬이 중요한 경우

**Auto Increment를 피해야 하는 경우:**
- 분산 데이터베이스 환경 (샤딩)
- 보안이 매우 중요한 서비스
- ID 예측 방지가 필요한 경우

**해결 방법:**
- 분산 환경이라면 Sharding Key를 적용하거나 다른 Primary Key 생성 전략을 사용
- 보안이 중요한 서비스에서는 외부 식별자와 내부 식별자를 구분하여 사용

---
## 3. UUID (Universally Unique Identifier)
### 3.1 작동 원리

UUID는 128비트(16바이트) 크기의 고유한 식별자다.

UUID는 내부적으로 16진수(0-9, a-f) 32자리 + 하이픈(-) 4개로 이루어져 있다. 이 값은 충돌 없이 유일하게 생성되는 값이기에 서버가 여러 개라도, 중복될 가능성이 극히 낮다.

```sql
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

INSERT INTO users (id, name) VALUES (UUID(), 'User');
```

---
### 3.2 장점

**전 세계적으로 유일한 값 생성:**
- 여러 개의 데이터베이스 서버(샤딩 환경)에서도 중복될 일이 거의 없다
- Auto Increment처럼 충돌 문제가 발생하지 않는다

**보안성이 높음:**
- Auto Increment처럼 id=1000이면 "1000번째 데이터"라고 유추할 수 없다
- 해커가 id=999, id=998을 입력해도 예측 불가능

**데이터 복제 및 마이그레이션에 유리:**
- ID 값이 고유하므로 데이터를 다른 DB로 복사해도 충돌 없다
- 예: A 서버 → B 서버로 데이터를 복제할 때, Auto Increment는 충돌할 수 있지만 UUID는 안전

---
### 3.3 단점

**UUID가 너무 길어 저장 공간 문제:**
- UUID는 본질적으로 128비트(16바이트) 크기이지만, 일반적으로 CHAR(36) 문자열 형태로 저장되면서 저장 공간과 인덱스 비용이 증가한다.
- Auto Increment(INT, 4바이트)보다 크기가 훨씬 큼
- 인덱스 크기가 커져서 DB 성능 저하 발생 가능

**정렬이 불가능해서 성능 저하 (인덱스 문제):**
- Auto Increment는 숫자가 순서대로 증가하므로 인덱스 정렬이 효율적
- 하지만 UUID는 완전 랜덤이어서, 새로운 데이터가 들어올 때마다 인덱스가 뒤섞임 (B+트리 성능 저하)

**사람이 읽고 다루기 불편함:**
- 숫자 ID(1001, 1002, 1003)처럼 직관적이지 않다
- 로그 분석, 디버깅 시 가독성이 떨어진다

---
### 3.4 UUID 버전별 차이
#### 3.4.1 UUIDv1 (시간 기반)

**특징:**
- 타임스탬프 + MAC 주소 + 랜덤값 조합
- 생성된 순서대로 정렬 가능

**문제점:**
- MAC 주소가 포함되어 보안 문제 발생 가능
- UUID를 보면 어떤 컴퓨터에서 생성되었는지 추적 가능
#### 3.4.2 UUIDv4 (완전 랜덤)

**특징:**
- 완전한 랜덤 값으로 생성
- 보안성이 높음 (MAC 주소 없음)

**문제점:**
- 완전 랜덤이라 정렬 불가능
- 성능 저하 발생
- 새로운 값이 들어올 때마다 인덱스가 뒤섞임
#### 3.4.3 UUIDv7 (시간 + 랜덤, 최신 버전)

**특징:**
- UUIDv1과 UUIDv4의 장점을 합친 최신 방식
- 시간순 정렬 가능 + 보안 문제 해결 + 랜덤성 유지

**문제점:**
- 상대적으로 새로운 표준이므로 일부 DBMS에서 아직 지원하지 않을 수 있음

---
### 3.5 UUID가 성능에 미치는 영향

UUID는 랜덤성 때문에 B+트리 인덱스에서 성능 저하를 일으킨다.

**B+트리 인덱스란:**
- 데이터베이스에서 Primary Key는 자동으로 인덱스가 생성됨
- 대부분의 관계형 데이터베이스는 B+트리 구조를 사용
- 값이 순서대로 정렬되도록 저장

**Auto Increment vs UUID:**

| 방식             | 값 삽입 순서                 | B+트리 정렬 유지 비용 | 디스크 IO 영향                | 성능  |
| -------------- | ----------------------- | ------------- | ------------------------ | --- |
| Auto Increment | 순차적 (1 → 2 → 3 → 4)     | 낮음 (O(1))     | 낮음 (한 방향으로 추가됨)          | 빠름  |
| UUID           | 랜덤 (5d3a → a1b9 → 3e7d) | 높음 (O(log N)) | 높음 (삽입 시마다 기존 데이터 정렬 필요) | 느림  |

**UUID 성능 문제:**
- UUID는 랜덤이므로 기존 데이터 사이에 삽입되면서 B+트리 노드가 조각화됨
- 페이지 분할(Page Split) 발생하여 디스크 IO 증가
- 캐시 효율성 저하
- 범위 검색(Range Scan)이 비효율적
- 인덱스 크기가 커짐

---
### 3.6 해결 방법

#### 3.6.1 UUIDv7 사용

UUIDv7은 시간 정보를 포함하므로,
랜덤 UUID에 비해 인덱스 정렬 효율이 좋아 성능 향상을 기대할 수 있다.

다만 UUIDv7은 대부분의 DBMS에서 아직 내장 함수로 제공되지 않기 때문에,
일반적으로 **애플리케이션 레벨에서 생성한 후 DB에 저장하는 방식**으로 사용한다.

#### 3.6.2 Base58, Base64 변환

UUID(36자) → Base64(22자)로 변환하면 UUID를 압축하여 저장 공간 절약 가능하다.
```sql
SELECT TO_BASE64(UUID_TO_BIN(UUID()));
```
Base58은 URL-safe한 문자만 사용해서 더 짧고 안전한 문자열을 제공한다.

#### 3.6.3 UUID + Auto Increment 조합

내부적으로는 Auto Increment 사용, 외부에는 UUID 제공하여 DB 성능과 보안을 모두 확보할 수 있다.
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,  
    uuid CHAR(36) UNIQUE NOT NULL
);
```

---
### 3.7 결론

**UUID를 사용하기 좋은 경우:**
- 분산 데이터베이스 환경
- 보안이 매우 중요한 경우
- 데이터 복제/마이그레이션이 빈번한 경우

**UUID를 피해야 하는 경우:**
- 저장 공간이 제한적인 경우
- 시간순 정렬이 매우 중요한 경우
- 높은 쓰기 성능이 필요한 경우

**해결 방법:**
- UUIDv7, BINARY(16), Auto Increment 조합 등의 방법을 사용하여 성능 문제 해결

---
## 4. 조합 키 (Composite Key)
### 4.1 개념

조합 키(Composite Key)는 두 개 이상의 컬럼을 결합하여 유일한 키를 만드는 방식이다.

기존의 단일 Primary Key(예: id)와 다르게, 여러 개의 컬럼을 묶어 Primary Key를 설정할 수 있다.
```sql
CREATE TABLE student_courses (
    student_id INT,
    course_id INT,
    semester VARCHAR(10),
    PRIMARY KEY (student_id, course_id, semester)
);
```

각 학생이 여러 개의 수업을 들을 수 있으므로, student_id만으로는 유일한 값이 될 수 없다. 반대로, 같은 수업을 여러 학생이 들을 수도 있으므로 course_id도 유일하지 않다. 따라서 student_id + course_id + semester를 조합하여 고유한 식별자로 만든다.

---
### 4.2 활용 사례

**주문 상세 내역 (Order Details):**
- 하나의 주문(order_id)에는 여러 개의 상품이 포함될 수 있음
- 같은 상품(product_id)이 여러 번 주문될 수도 있음
- order_id + product_id를 조합 키로 설정

**출석 기록 (Attendance Records):**
- 학생(student_id)이 특정 날짜(date)에 출석했는지 기록
- student_id + date를 조합 키로 설정

**은행 계좌 거래 (Bank Transactions):**
- 같은 계좌(account_id)에서 여러 거래(transaction_id) 발생
- account_id + transaction_id를 조합 키로 설정

---
### 4.3 장점

**데이터 무결성 보장:**
- 조합 키를 사용하면 중복 데이터를 방지할 수 있다
- 예: 학생이 같은 수업을 여러 번 신청하지 못하도록 제한

**복합 검색(Composite Query)에 유리:**
- 조합 키를 사용하면 WHERE 조건에서 두 개 이상의 컬럼을 조합하여 검색할 때 인덱스 검색이 최적화됨
- 예: 특정 order_id 내에서 product_id를 검색하는 경우 성능 향상

**중복된 단일 키 생성 필요 없음:**
- Auto Increment ID 없이도 고유한 데이터 구분이 가능

---
### 4.4 단점

**키 크기가 커짐 → 인덱스 크기 증가:**
- INT(4바이트) + INT(4바이트) + VARCHAR(10) = 최소 10바이트 이상
- 단일 INT(4바이트) Primary Key보다 더 많은 저장 공간 필요

**외래 키(Foreign Key) 관계가 복잡해짐:**
- 다른 테이블에서 조합 키를 참조할 때, WHERE 조건이 복잡해질 수 있음
- 예: student_courses 테이블을 참조하는 다른 테이블이 있을 때, student_id + course_id + semester를 모두 참조해야 함

**검색 속도 저하 가능성:**
- student_id 또는 course_id 하나만으로 검색하면 INDEX를 완전히 활용하지 못할 수도 있음
- 일부 경우에는 단일 키보다 성능이 떨어질 수도 있음

---
### 4.5 조합 키가 유리한 경우

**중복된 데이터 입력을 방지해야 할 때:**
- 같은 student_id가 같은 course_id를 여러 번 신청하면 안 되는 경우
- 같은 order_id에서 동일한 product_id가 중복되면 안 되는 경우

**자연스러운 키(Natural Key) 사용이 가능할 때:**
- Auto Increment ID 대신, 이미 존재하는 데이터의 조합으로 유일성을 만들 수 있음

**복합 검색(Composite Query) 최적화가 필요할 때:**
```sql
-- Auto Increment 방식
CREATE TABLE order_details (
    id INT AUTO_INCREMENT PRIMARY KEY,  
    order_id INT,  
    product_id INT,  
    quantity INT
);

-- 조합 키 방식
CREATE TABLE order_details (
    order_id INT,
    product_id INT,
    quantity INT,
    PRIMARY KEY (order_id, product_id)
);
```

조합 키 방식에서는:
- PK 자체가 (order_id, product_id)로 구성되므로
- `WHERE order_id = ? AND product_id = ?` 검색 시 인덱스를 바로 활용 가능
- 한 번의 인덱스 조회로 바로 필요한 데이터에 접근

---
### 4.6 해결 방법

#### 4.6.1 인덱스 순서 최적화
조합 키의 컬럼 순서가 WHERE 조건과 맞아야 성능이 좋아진다.
```sql
CREATE TABLE student_courses (
    student_id INT,
    course_id INT,
    semester VARCHAR(10),
    PRIMARY KEY (student_id, course_id, semester)
);
```
- `WHERE student_id = ? AND course_id = ?` 로 검색하면 인덱스를 효율적으로 사용
- 하지만 `WHERE semester = ?`로 검색하면 INDEX를 활용하지 못할 수도 있음
- 자주 검색하는 컬럼을 앞쪽에 배치하면 성능이 향상됨

#### 4.6.2 보조 인덱스(Secondary Index) 추가
조합 키가 너무 클 경우, 보조 인덱스를 추가하여 검색 속도를 개선 가능하다.
```sql
CREATE INDEX idx_course ON student_courses (course_id);
```
이렇게 하면 `WHERE course_id = ?` 검색 시 인덱스를 활용할 수 있다.

#### 4.6.3 해싱(HASHING)된 조합 키 사용
조합 키가 너무 길면, 해시(Hash)를 사용하여 짧은 고유 값 생성 가능하다.
```sql
CREATE TABLE student_courses (
    id CHAR(32) PRIMARY KEY,
    student_id INT,
    course_id INT,
    semester VARCHAR(10)
);
```
이렇게 하면 조합 키 크기를 줄이고, 검색 성능을 최적화할 수 있다.

---
### 4.7 결론

**조합 키를 사용하기 좋은 경우:**
- 중복을 방지해야 할 때 (예: 주문 내역, 출석 기록 등)
- 자연스러운 키를 사용할 수 있을 때 (Auto Increment 없이도 유일성을 보장 가능)
- 복합 검색(Composite Query)이 많은 경우 성능 최적화가 가능

**조합 키를 피해야 하는 경우:**
- 외래 키 관계가 복잡한 경우
- 단일 컬럼으로 검색하는 경우가 많을 때
- 저장 공간이 제한적인 경우

---
## 5. 유니크 정렬 문자열 (ULID, KSUID)
### 5.1 등장 배경
UUID(특히 UUIDv4)는 완전한 랜덤 값이라서 다음과 같은 문제점이 있다.

**정렬이 불가능해서 인덱스 성능 저하:**
- UUID는 무작위 값이므로 새로운 데이터가 들어올 때마다 기존 데이터 사이에 삽입됨
- 결과적으로 인덱스가 자주 조각화되어 성능 저하 발생
- 반면, 정렬된 ID를 사용하면 B+트리 인덱스에서 삽입/검색 속도가 향상됨

**가독성이 나쁨:**
- UUID(550e8400-e29b-41d4-a716-446655440000)는 너무 길고 복잡
- 로그 분석이나 디버깅할 때도 UUID가 너무 길어 가독성이 떨어짐

**저장 공간 증가:**
- UUID는 128비트(16바이트) 크기(바이너리 기준 크기이며, 문자열로 저장할 경우 크기는 더 커질 수 있다)
- 일반적인 숫자형 ID(BIGINT, 64비트, 8바이트)보다 2배 크므로 DB 용량을 더 차지

**유니크 정렬 문자열(정렬 가능한 랜덤 ID)이란:**
- UUID의 유일성을 유지하면서도, 데이터가 정렬될 수 있도록 설계된 식별자
- ID가 생성될 때 시간 정보가 포함되므로, 정렬이 가능
- 랜덤성은 그대로 유지하기에 충돌 없이 유니크함을 보장
- UUID보다 짧고 직관적인 ID를 통해 가독성을 개선

---
### 5.2 ULID (Universally Unique Lexicographically Sortable Identifier)
**구조:**
```
01F8MECHZX3TBXYN9YWK5GEC74
```
- 앞부분(10자리): 타임스탬프 (밀리초 단위)
- 뒷부분(16자리): 랜덤 값

**활용 사례:**
- 대규모 로그 시스템 (시간 순서대로 정렬 가능)
- 데이터베이스에서 성능 최적화된 키 생성
```sql
CREATE TABLE users (
    id CHAR(26) PRIMARY KEY,
    name VARCHAR(255)
);
```
---
### 5.3 KSUID (K-Sortable Unique Identifier)

> KSUID는 Twitter의 Snowflake처럼, 유니크하면서도 정렬 가능한 식별자다.

**구조:**
```
0ujss54H3k6PyrQEYFjP8sKZ0MT
```
- 앞부분(4바이트): UNIX 타임스탬프 (초 단위)
- 뒷부분(16바이트): 랜덤 값

**활용 사례:**
- 대규모 분산 시스템에서 정렬 가능한 ID 필요할 때
- 소셜 네트워크 서비스에서 유저, 게시글 ID로 활용
```sql
CREATE TABLE posts (
    id CHAR(27) PRIMARY KEY,
    content TEXT
);
```
---
### 5.4 장점

**정렬 가능 → 인덱스 성능 향상:**
- 시간 기반 정렬이 가능하여 DB 성능 저하를 방지
- B+트리 인덱스에서 삽입/검색 속도가 빨라짐

**충돌 없이 유니크 보장:**
- 랜덤성을 포함하므로 분산 시스템에서도 중복 없이 사용 가능

**가독성 향상:**
- UUID보다 짧고, 사람이 읽을 수 있는 형태

**저장 공간 절약 가능:**
- UUID(128비트)보다 짧은 길이로 동일한 기능 제공

---
### 5.5 단점

**UUID보다 약간 크기가 커질 수도 있음:**
- KSUID는 20바이트로 UUID(16바이트)보다 조금 더 큼

**일부 DB에서 기본 지원하지 않음:**
- MySQL, PostgreSQL 등에서는 별도의 라이브러리를 사용해야 함

**기존 UUID 기반 시스템과의 호환성 문제:**
- UUID를 이미 사용하고 있다면, KSUID/ULID로 변경하는 작업이 필요할 수 있음

---
### 5.6 결론

**ULID/KSUID를 사용하기 좋은 경우:**
- UUID보다 성능이 중요할 때 (정렬 가능한 ID 필요)
- 로그 시스템, 소셜 미디어 게시물, 트랜잭션 ID 등
- 대규모 분산 환경에서 충돌 없이 ID를 생성해야 할 때

**ULID/KSUID를 피해야 하는 경우:**
- 표준 UUID 호환성이 중요한 경우
- 라이브러리 설치가 어려운 환경
- 기존 UUID 시스템과의 호환이 필요한 경우

---
## 6. 유니크 정렬 숫자 (Snowflake, TSID)

### 6.1 Snowflake 알고리즘

> Snowflake는 Twitter에서 개발한 유니크한 정렬 숫자 ID 생성 방식이다.

**특징:**
- ID를 64비트 숫자로 표현하여 UUID보다 작고, 정렬이 가능
- 앞부분은 시간 정보를 포함하므로 ID가 시간 순서대로 정렬됨
- 뒤쪽에 머신 ID + 시퀀스 번호를 추가하여 중복을 방지

**Snowflake ID 구조 (64비트):**
```
| 1비트 예약 | 41비트 타임스탬프 | 10비트 머신 ID | 12비트 시퀀스 번호 |
```
- 1비트(예약): 사용하지 않음
- 41비트(타임스탬프): 현재 시간(밀리초 단위) → ID를 시간순으로 정렬 가능
- 10비트(머신 ID): 서버나 데이터센터 ID → 분산 환경에서 중복 방지
- 12비트(시퀀스 번호): 같은 밀리초에 생성된 ID를 구별

---
### 6.2 TSID, FlakeID 비교

**TSID (Timestamped Secure ID):**
- UUID를 대체할 수 있는 정렬 가능한 숫자형 ID
- UUID의 랜덤성을 유지하면서도 정렬 가능
- 128비트(긴 버전)와 64비트(짧은 버전) 지원

**FlakeID:**
- Snowflake와 매우 유사
- AWS 환경에서 Snowflake를 최적화한 버전
- DynamoDB, NoSQL 환경에서 활용하기 좋음

---
### 6.3 장점

**정렬 가능 → 데이터베이스 성능 향상:**
- 시간 순으로 정렬되므로 B+트리 인덱스 최적화 가능
- UUID처럼 랜덤 삽입으로 인덱스 조각화 발생하지 않음

**분산 환경에서도 중복 없음:**
- 머신 ID + 시퀀스 번호를 포함하므로, 서버가 여러 개여도 중복 방지 가능

**UUID보다 저장 공간 절약 가능:**
- UUID(128비트)보다 숫자형 ID(64비트)가 더 작아 DB 저장 공간 효율적

**읽고 다루기 편리:**
- 145678912345678901 같은 숫자 ID는
- 550e8400-e29b-41d4-a716-446655440000 같은 UUID보다
- 로그 분석, 디버깅할 때 직관적

---
### 6.4 단점

**ID 생성 시스템 필요 (Snowflake 서버 운영해야 함):**
- Snowflake ID를 생성하려면 별도의 서버 또는 라이브러리가 필요
- 단순히 UUID()처럼 자동 생성되는 것이 아니라, ID 생성 서버를 운영해야 함

**시계 동기화 문제 (Clock Drift):**
- Snowflake는 타임스탬프 기반이라 서버 간 시간이 맞지 않으면 문제가 발생할 수 있음
- 해결 방법: NTP(Network Time Protocol)로 모든 서버 시간을 동기화

**초당 생성 가능한 ID 개수 제한:**
- 12비트 시퀀스 번호는 한 밀리초에 4,096개까지만 ID 생성 가능
- 트래픽이 너무 많으면 ID 생성 속도가 한계에 도달할 수 있음

---
### 6.5 유리한 경우

**로그 시스템, 트랜잭션 ID:**
- 로그를 시간순으로 정렬해야 할 때 Snowflake ID가 유리

**소셜 미디어 서비스 (게시글, 댓글 ID):**
- 게시물 ID를 시간순으로 정렬해야 한다면, Snowflake ID가 유리

**분산 데이터베이스 (NoSQL, DynamoDB, Cassandra):**
- 여러 개의 서버에서 중복 없이 ID 생성해야 할 때 Snowflake ID 사용하는 것이 좋음

**UUID보다 작은 저장 공간이 필요한 경우:**
- 64비트 정렬 숫자 ID는 UUID(128비트)보다 저장 공간 절약 가능

---
### 6.6 해결 방법

#### 6.6.1 서버 간 시간 동기화
모든 서버에 NTP(Network Time Protocol) 설정하여 시계 동기화한다. 서버 간 시간이 맞지 않으면, 동일한 타임스탬프에서 충돌이 발생할 수 있다.

#### 6.6.2 머신 ID 범위 조정
서버마다 고유한 머신 ID 할당하여 서버 간 중복 방지한다. 머신 ID를 더 많이 할당하여 단일 서버에서 생성하는 ID 개수 제한 해결할 수 있다.

#### 6.6.3 대체 알고리즘 사용
Snowflake ID의 한계를 극복하기 위해 TSID, ULID 같은 최신 방식 사용한다. TSID는 UUID처럼 사용할 수 있지만, 정렬 가능하여 Snowflake의 장점을 가진다.

---
### 6.7 결론

**Snowflake를 사용하기 좋은 경우:**
- UUID보다 정렬 가능한 ID가 필요할 때
- 대규모 분산 환경에서 충돌 없이 ID를 생성해야 할 때
- 데이터베이스 인덱스 성능을 높이고 싶을 때

**Snowflake를 피해야 하는 경우:**
- ID 생성 서버를 운영하기 어려운 경우
- 시계 동기화가 어려운 환경
- 초당 매우 많은 ID 생성이 필요한 경우 (4,096개 이상)

---
## 7. 기타 방식 (Hash ID, Nano ID)
### 7.1 Hash 기반 ID

Hash 기반 ID는 특정 데이터를 고유한 해시 값으로 변환하여 사용한다. 이 방식은 기존 데이터(예: 이메일, 사용자명 등)를 기반으로 유니크한 ID를 생성할 때 유용하다.

**해시 함수란:**
- 해시(Hash) 함수는 입력 값을 일정한 길이의 고유한 문자열로 변환하는 함수
- 같은 입력 값 → 같은 해시 값이 나옴
- 출력 값은 충돌 가능성이 매우 낮음
- 비밀번호 저장, 데이터 무결성 검사, 유니크 ID 생성 등 다양한 용도로 사용

**Java 예제 (SHA-256):**
```java
public static String generateSHA256Hash(String input) {
    try {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
        
        BigInteger number = new BigInteger(1, hash);
        StringBuilder hexString = new StringBuilder(number.toString(16));
        
        while (hexString.length() < 64) {
            hexString.insert(0, '0');
        }
        
        return hexString.toString();
    } catch (NoSuchAlgorithmException e) {
        throw new RuntimeException("해시 알고리즘 오류", e);
    }
}
```

**장점:**
- 기존 데이터로부터 유니크한 ID 생성 가능
- 별도의 ID 생성 시스템이 필요 없음
- 암호화 수준이 강한 해시(SHA-256 이상)는 보안성이 높음

**단점:**
- 길이가 길어질 수 있음 (SHA-256: 64자리, SHA-512: 128자리)
- 역추적 가능성 (Rainbow Table 공격)
    - 해시 값이 예측 가능하면 공격자가 원래 데이터를 찾을 수 있음
    - 해결 방법: Salt(랜덤 값)를 추가하여 보안 강화
---
### 7.2 Nano ID

Nano ID는 짧고 충돌 가능성이 낮은 유니크한 문자열을 생성하는 방법이다. UUID보다 더 짧고, 읽기 쉽고, URL-safe한 형식으로 ID를 생성할 수 있다.

**Python 예제:**
```python
from nanoid import generate

nano_id = generate(size=21)
print(nano_id)  # 예: "V1StGXR8_Z5jdHi6B-myT"
```

**장점:**
- UUID보다 짧고, 사람이 읽기 쉬움
- URL-safe (특수 문자 없이 안전한 ID 생성 가능)
- 속도가 매우 빠름 (UUID보다 60% 이상 빠름)

**단점:**
- 이론적으로 충돌 가능성은 존재하지만, 충분한 길이를 사용할 경우 UUIDv4 수준의 충돌 안전성을 가진다.
- 특정 길이를 유지해야 함
- 랜덤성이 높아 정렬이 어려움

---
### 7.3 유리한 경우

**Hash 기반 ID가 유리한 경우:**
- 기존 데이터(이메일, 사용자명 등)로부터 유니크한 ID를 만들 때
- 보안이 중요한 환경에서 데이터 무결성을 유지해야 할 때
- 별도의 ID 생성 시스템 없이도 유니크한 값이 필요할 때

**Nano ID가 유리한 경우:**
- 짧고 사람이 읽기 쉬운 ID가 필요할 때
- URL-safe한 ID가 필요할 때
- 빠른 속도로 고유한 ID를 생성해야 할 때

**UUID나 Snowflake 대신 사용하면 좋은 경우:**
- UUID가 너무 길고 가독성이 나쁠 때
- Snowflake 같은 정렬 가능한 ID가 필요 없을 때
---
### 7.4 해결 방법

#### 7.4.1 Salt 추가로 보안 강화

해커가 미리 계산된 해시 값을 통해 원래 데이터를 역추적하는 것을 방지할 수 있다.
```python
import hashlib
import os

def generate_salted_hash(input_value):
    salt = os.urandom(16).hex()  
    hash_value = hashlib.sha256((salt + input_value).encode()).hexdigest()
    return f"{salt}:{hash_value}"

print(generate_salted_hash("user@example.com"))
```

#### 7.4.2 Nano ID의 충돌 문제 해결

특정 길이와 패턴을 유지하면서 충돌 가능성을 줄일 수 있다.
```python
from nanoid import generate

def generate_custom_nanoid():
    return generate(alphabet="0123456789ABCDEF", size=16)

print(generate_custom_nanoid())  # "A1B2C3D4E5F67890"
```

#### 7.4.3 짧은 Hash ID 사용

Base58을 사용하면 길이를 줄이면서도 유니크한 해시 값을 유지할 수 있다.
```python
import base58
import hashlib

def generate_base58_hash(input_value):
    hash_value = hashlib.sha256(input_value.encode()).digest()
    return base58.b58encode(hash_value).decode()[:16]

print(generate_base58_hash("user@example.com"))
```
---
### 7.5 결론

**Hash ID를 사용하기 좋은 경우:**
- 기존 데이터(이메일, 사용자명) 기반으로 유니크한 ID 만들기

**Nano ID를 사용하기 좋은 경우:**
- 짧고 URL-safe한 유니크 ID 만들기

**Base58 변환을 사용하기 좋은 경우:**
- UUID보다 가독성 좋은 ID가 필요

**정렬이 필요 없고, 빠른 랜덤 ID가 필요:**
- Nano ID

---
## 8. 전체 정리

### 8.1 상황별 최적 전략

| 상황                  | 추천 전략                     | 이유             |
| ------------------- | ------------------------- | -------------- |
| 단일 서버 환경            | Auto Increment            | 간단하고 성능이 좋음    |
| 분산 환경 (Sharding)    | Snowflake, UUID           | 서버 간 중복 방지     |
| 보안이 중요한 경우          | UUID, Hash ID             | ID 예측 불가능      |
| 시간순 정렬이 중요한 경우      | Snowflake, UUIDv7, ULID   | 시간 기반 정렬 가능    |
| 저장 공간이 제한적인 경우      | Auto Increment, Snowflake | 작은 크기 (4-8바이트) |
| 복합 조건 검색이 많은 경우     | Composite Key             | 복합 인덱스 최적화     |
| URL-safe ID가 필요한 경우 | Nano ID, ULID             | 짧고 안전한 문자열     |

---
### 8.2 성능 비교

| 전략             | 저장 크기    | 정렬 가능 | 분산 환경 | 보안성   | 성능     |
| -------------- | -------- | ----- | ----- | ----- | ------ |
| Auto Increment | 4-8바이트   | O     | X     | 낮음    | 매우 빠름  |
| UUID           | 16바이트    | X     | O     | 높음    | 보통     |
| UUIDv7         | 16바이트    | O     | O     | 높음    | 빠름     |
| Snowflake      | 8바이트     | O     | O     | 보통    | 빠름     |
| ULID           | 16바이트    | O     | O     | 높음    | 빠름     |
| KSUID          | 20바이트    | O     | O     | 높음    | 빠름     |
| Composite Key  | 가변       | O     | X     | 보통    | 조건부 빠름 |
| Hash ID        | 32-64바이트 | X     | O     | 매우 높음 | 보통     |
| Nano ID        | 21바이트    | X     | △     | 보통    | 매우 빠름  |

---
### 8.3 선택 가이드

**1단계: 환경 파악**
- 단일 서버인가, 분산 환경인가?
- 데이터 규모는 어느 정도인가?

**2단계: 요구사항 확인**
- 보안이 중요한가?
- 시간순 정렬이 필요한가?
- 저장 공간이 제한적인가?

**3단계: 전략 선택**
- 단일 서버 + 보안 낮음 → Auto Increment
- 분산 환경 + 시간순 정렬 → Snowflake, UUIDv7
- 보안 중요 + 분산 환경 → UUID, ULID
- 복합 조건 검색 많음 → Composite Key

**4단계: 최적화**
- 내부/외부 식별자 분리 고려
- 보조 인덱스 추가 고려
- 성능 모니터링 및 조정