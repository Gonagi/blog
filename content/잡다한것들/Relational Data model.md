# Contents
## 1. 개념
## 2. Relation 구성
## 3. Relational Database
## 4. Relation 특징
## 5. NULL의 의미
## 6. Keys
## 7. Constraints
---

> 데이터를 relation(테이블) 형태로 표현하는 데이터 모델

- 수학의 **relation(집합)** 개념 기반
- 데이터 = **tuple들의 집합**
- 관계형 DB의 이론적 기반
## 1. 개념
### 1.1 Set

> relation은 **set of tuples** 이다.

- 중복 없는 원소들의 집합
- 순서 없음
- 서로 다른 elements를 가지는 collection
- 하나의 set에서 elements의 순서는 중요하지 않다.
### 1.2 Relation(수학적 정의)

> Cartesian Product의 부분집합
> 속성들의 조합으로 이루어진 tuple 집합

- A x B = {(a, b) | a ∈ A, b ∈ B}
- relation ⊆ A x B
- n-ary relation ⊆ X1 x X2 x ... x Xn
---
## 2. Relation 구성

> attribute와 tuple로 이루어진 데이터들의 집합

![|506](https://i.imgur.com/oDWrKpJ.png)
### 2.1 Domain

> 각 attribute가 가질 수 있는 값의 집합
> set of atomic values

- 하나의 attribute는 하나의 domain을 가진다.
- 값은 반드시 해당 domain에 속해야 한다.
- Domain은 데이터의 유효 범위를 제한하여 데이터 무결성을 보장한다.

예시:
- students_ids: 학번 집합, 7자리 integer 정수
- human_names: 사람 이름 집합, 문자열
- university_grades: 대학교 학년 집합, {1, 2, 3, 4}
- major_names: 대학교에서 배우는 전공 이름 집합
- phone_numbers: 핸드폰 번호 집합
### 2.2 Attribute

> relation의 컬럼

- domain이 relation에서 맡은 이름

예시:
- students_ids → id
- human_names → name
- university_grades → grade
- major_names → major
- phone_numbers → phone_num, emer_phone_num
### 2.3 Tuple

> 하나의 데이터(행)

- 각 attribute의 값으로 이루어진 집합
- 일부 값은 NULL일 수 있다.
### 2.4 Relation Schema

> relation의 구조 정의

- relation 이름과 attributes 리스트로 표기된다.

예시:
``` text
STUDENT(id, name, grade, major, phone_num, emer_phone_num)
```
- attributes와 관련된 constraints도 포함한다.
### 2.5 Degree

> relation schema에서 attributes의 수

예시:
``` text
STUDENT(id, name, grade, major, phone_num, emer_phone_num)
```
  - degree 6
### 2.6 Relation Instance

> 특정 시점의 실제 데이터(tuple들의 집합)

- relation은 개념적으로는 구조
- instance는 실제 데이터
---
## 3. Relational Database
### 3.1 Relational Database

> 여러 개의 relation으로 구성된 데이터베이스

### 3.2 Relational Database Schema

> Relation Schema들의 집합 + 제약 조건

---
## 4. Relation 특징

- 중복된 tuple을 가질 수 없다.
	- relation is **set** of tuples
- tuple을 식별하기 위해 attribute의 부분집합을 key로 설정한다.
- relation에서 tuple의 순서는 중요하지 않다.
- attribute의 이름은 중복되면 안된다.
- 하나의 tuple에서 attribute의 순서는 중요하지 않다.
- attribute는 atomic 해야 한다.(composite or multivalued attribute 허용 안됨)
	- ex) address → 서울특별시 강남구 청담동 => 서울시 / 강남구 / 청담동
	- ex) major → 컴공, 디자인 → 컴공 / 디자인
- relation은 수학적 집합 개념을 따르므로 **중복과 순서**가 없다.
---
## 5. NULL의 의미
- 값이 존재하지 않는다.
- 값이 존재하나 아직 그 값이 무엇인지 알지 못한다.
- 해당 사항과 관련이 없다.
- 비교 연산 `=`, `!=`이 아닌 `IS NULL`로 한단해야 한다.

 예시: toeic_score: NULL
- 아직 토익을 한번도 본적이 없다.
- 시험을 쳤지만 아직 제출하지 않았다.
- 시험도 보고 제출도 했지만, 누락이 됐다.
---
## 6. Keys
### 6.1 super key

> relation에서 tuples를 unique하게 식별할 수 있는 attributes set

예시: PLAYER(id, name, team_id, back_number, birth_date)의 superkey
- {id, name, team_id, back_number, birth_date}
- {id, name}
- {name, team_id, back_number}
### 6.2 candidate key

> 어느 한 attribute라도 제거하면 unique하게 tuple을 식별할 수 없는 super key

- key or minimal superkey
- super key는 불필요한 속성을 포함할 수 있지만, candidate key는 최소성을 만족한다.

예시: PLAYER(id, name, team_id, back_number, birth_date)의 candidate key
- {id}, {team_id, back_number}
### 6.3 primary key

> relation에서 tuples을 unique하게 식별하게 위해 선택된 candidate key

- Primary Key는 최소성 + 유일성 + NOT NULL을 만족해야 한다.

예시: PLAYER(id, name, team_id, back_number, birth_date)의 primary key
- {id} or {team_id, back_number}
- 일반적으로는 속성 수가 적은걸로 한다.
### 6.4 unique key

> primary key가 아닌 candidate keys

- alternate key
- FK는 반드시 PK를 참조할 필요는 없고, UNIQUE KEY도 참조할 수 있다.

예시: PLAYER(id, name, team_id, back_number, birth_date)의 pk가 id일 때 unique key
- {team_id, back_number}
### 6.5 foreign key

> 다른 relation의 PK를 참조하는 attributes set

예시: PLAYER(id, name, team_id, back_number, birth_date)와 TEAM(id, name, manager)가 있을 때 foreign key
- PLAYER의 {team_id}
---
## 7. Constraints

> relational database의 relations들이 언제나 항상 지켜줘야 하는 제약 사항

### 7.1 Implicit Constraints

> 모델 자체 제약

- relation은 중복되는 tuple을 가질 수 없다.
- relation 내에서는 같은 이름의 attribute를 가질 수 없다.

### 7.2 Schema-based Constraints

> 주로 DDL을 통해 schema에 직접 명시할 수 있는 constraints
> explicit constraints

#### 7.2.1 Domain Constraint

> attribute의 value는 해당 attribute의 domian에 속한 value여야 한다.

![|471](https://i.imgur.com/uAfCNw4.png)
#### 7.2.2 Key Constraints

> 서로 다른 tuples는 같은 value의 key를 가질 수 없다.
> key는 unique해야 한다.

![|474](https://i.imgur.com/M4VHScS.png)
#### 7.2.3 NOT NULL Constraint

> attribute이 NOT NULL로 명시됐다면 NULL을 값으로 가질 수 없다.

![|472](https://i.imgur.com/3yyUhdg.png)
#### 7.2.4 Entity Integrity

> primary key는 value에 NULL을 가질 수 없다.

![|487](https://i.imgur.com/vKNhatX.png)
#### 7.2.5 Referential Integrity

> FK와 PK와 도메인이 같아야 하고 PK에 없는 values를 FK가 값으로 가질 수 없다.

![|486](https://i.imgur.com/QDyIhL2.png)
- 참조 무결성 위반 시 삽입/수정/삭제가 제한된다.