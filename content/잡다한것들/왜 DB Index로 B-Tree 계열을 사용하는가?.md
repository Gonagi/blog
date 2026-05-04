# Contents
## 1. BST를 DB Index로 쓰기 어려운 이유
## 2. B-Tree의 등장 배경
## 3. B-Tree의 기본 구조
## 4. B-Tree 계열이 DB Index에 적합한 이유
## 5. B+Tree
## 6. B-Tree와 B+Tree 차이
## 7. MySQL InnoDB에서의 B+Tree
## 8. Hash Index는 왜 안쓰일까?
---
## 1. BST를 DB Index로 쓰기 어려운 이유

BST, 즉 이진 탐색 트리는 각 노드가 최대 2개의 자식 노드를 갖는 탐색 트리이다.

왼쪽 서브트리에는 현재 노드보다 작은 값이 있고, 오른쪽 서브트리에는 현재 노드보다 큰 값이 있다.
```text
        10
      /    \
     5      15
    / \     / \
   3   7   12  20
```
BST는 정렬된 데이터를 탐색하기 좋은 구조이다.

하지만 일반적인 BST는 데이터가 한쪽으로 치우치면 트리의 높이가 커질 수 있다.
```text
1
 \
  2
   \
    3
     \
      4
```

이 경우 탐색 성능이 `O(log N)`이 아니라 `O(N)`에 가까워질 수 있다.

물론 AVL Tree나 Red-Black Tree처럼 균형을 유지하는 self-balancing BST도 있지만 균형이 중요한게 아니다.

DB 데이터는 주로 메모리가 아니라 디스크 같은 secondary storage에 저장됩니다. 따라서 DB 인덱스에서는 **비교 횟수보다 디스크 I/O 횟수를 줄이는 것**이 중요하다.

BST 계열은 한 노드가 가질 수 있는 key와 자식 수가 적어 같은 데이터 개수라면 트리의 높이가 상대적으로 커지고, root에서 leaf까지 내려가는 동안 더 많은 노드에 접근해야 한다.

DB에서는 노드 접근이 곧 page 또는 block 접근으로 이어질 수 있기 때문에, 트리 높이가 커지면 디스크 I/O가 증가한다.
```text
트리 높이 증가
→ 접근해야 하는 노드 수 증가
→ page/block 접근 증가
→ 디스크 I/O 증가
→ 조회 성능 저하
```

그래서 DB 인덱스에는 BST 계열보다 **B-Tree 계열 자료구조**가 더 적합하다.

---
## 2. B-Tree의 등장 배경

BST는 하나의 노드가 최대 2개의 자식만 가질 수 있지만, B-Tree는 하나의 노드가 여러 개의 key와 여러 개의 자식 노드를 가질 수 있다.

즉, B-Tree의 핵심은 다음과 같다.
- 하나의 노드에 여러 key를 저장한다.
- 하나의 노드가 여러 자식을 가진다.
- 트리의 높이를 낮춘다.
- 디스크 접근 횟수를 줄인다.

DB는 데이터를 page 또는 block 단위로 읽기 때문에 한 번 page를 읽었을 때 여러 key를 함께 확인할 수 있다면 더 효율적이다.

B-Tree 계열은 이 점에서 DB 인덱스에 적합하다.

---
## 3. B-Tree의 기본 구조

B-Tree에서 중요한 값은 차수 `M`이다.
`M`은 하나의 노드가 가질 수 있는 최대 자식 수를 의미한다.
```text
M: 각 노드의 최대 자식 노드 수
M - 1: 각 노드의 최대 key 수
⌈M / 2⌉: 각 internal node의 최소 자식 수
⌈M / 2⌉ - 1: 각 internal node의 최소 key 수

단, root node와 leaf node는 예외가 있음
```

예를 들어 4차 B-Tree라면 다음과 같다.
- 최대 자식 수: 4개
- 최대 key 수: 3개
- 최소 자식 수: 2개
- 최소 key 수: 1개

B-Tree의 주요 특징은 다음과 같다.
```text
1. 하나의 노드에 여러 key를 저장할 수 있다.
2. 하나의 노드가 여러 자식 노드를 가질 수 있다.
3. key는 정렬된 상태로 저장된다.
4. 모든 leaf node는 같은 레벨에 있다.
5. 항상 균형을 유지한다.
```
즉, B-Tree는 balanced tree이기 때문에 평균과 최악의 경우 모두 탐색 시간 복잡도가 `O(log N)`이다.

하지만 DB 인덱스 관점에서 더 중요한 것은 시간 복잡도 표기보다 **트리 높이가 낮아진다**는 것이다.
```text
트리 높이가 낮다
→ root에서 leaf까지 이동하는 횟수가 적다
→ 접근해야 하는 page 수가 줄어든다
→ 디스크 I/O가 줄어든다
```
---
## 4. B-Tree 계열이 DB Index에 적합한 이유

DB 인덱스에는 순수한 BST보다 B-Tree 계열 자료구조가 더 적합합니다.
DB가 데이터를 주로 secondary storage에 저장하고, 데이터를 page 또는 block 단위로 읽고 쓰기 때문이다.

B-Tree 계열은 하나의 노드에 여러 key와 자식 포인터를 저장할 수 있다.
즉, 한 번의 page read로 여러 key를 확인하고 탐색 범위를 크게 줄일 수 있다.

또한 자식 수가 많아지는 만큼 트리의 높이가 낮아진다.
```text
한 노드에 많은 key 저장
→ 자식 수 증가
→ fan-out 증가
→ 트리 높이 감소
→ page 접근 횟수 감소
→ 디스크 I/O 감소
```

그래서 DB 인덱스에는 BST 계열보다 B-Tree 계열이 적합하다.
MySQL InnoDB에서는 B-Tree 계열 중 **B+Tree**를 사용한다.

---
## 5. B+Tree

### 5.1 B+Tree란?

> B-Tree에서 파생된 balanced tree

- DB 인덱스와 파일 시스템에 더 적합하도록 변형된 구조
- MySQL InnoDB 스토리지 엔진은 인덱스 구조로 B+Tree를 사용한다.

B+Tree는 B-Tree의 핵심 장점인 **트리 높이를 낮추는 구조**를 유지하면서, DB 인덱스에 더 적합하도록 다음 특징을 가지고 있다.
```text
1. internal node에는 key만 저장한다.
2. 실제 데이터는 leaf node에만 저장한다.
3. leaf node끼리 linked list로 연결되어 있다.
```
### 5.2 특징

> B-Tree의 internal node는 key와 함께 실제 데이터 또는 데이터 포인터를 저장할 수 있지만, 
> B+Tree의 internal node는 탐색을 위한 key와 child pointer만 저장하고,  실제 데이터는 leaf node에 저장한다.

B-Tree:
- internal node에도 key + data 저장 가능
- leaf node에도 key + data 저장 가능

B+Tree:
- internal node에는 key만 저장
- leaf node에 key + data 저장

internal node에 실제 데이터를 저장하지 않으면, 하나의 node/page에 더 많은 key entry를 담을 수 있다.
- key 자체의 크기가 줄어든다는 의미가 아니라, internal node의 entry가 더 가벼워진다는 의미다.

따라서 같은 page 크기 안에 더 많은 key entry를 저장할 수 있고, 더 많은 child page를 가리킬 수 있다.
그 결과 fan-out이 커지고 트리 높이가 낮아진다.
```text
internal node에 key만 저장
→ 하나의 page에 더 많은 key 저장
→ 자식 수 증가
→ 트리 높이 감소
→ 디스크 I/O 감소
```
### 5.3 B+Tree의 leaf node는 연결되어 있다

> B+Tree의 leaf node들은 linked list 형태로 연결되어 있다.
```text
[1, 3, 5] → [7, 9, 11] → [13, 15, 17]
```

그래서 특정 key를 찾은 뒤, 그 다음 데이터들을 순차적으로 읽기 좋다.

예시:
```sql
WHERE age BETWEEN 20 AND 30
```

B+Tree에서는 먼저 `20`이 있는 leaf node를 찾고, 그 다음부터는 leaf node의 연결 리스트를 따라가며 `30`까지 순차적으로 읽는다.
```text
20 위치 탐색
→ leaf node linked list를 따라 순차 탐색
→ 30까지 조회
```
이 구조 때문에 B+Tree는 범위 검색에 유리하다.

---
## 6. B-Tree와 B+Tree 차이
### 6.1 데이터 저장 위치
```text
B-Tree:
internal node와 leaf node 모두 데이터 저장 가능

B+Tree:
internal node에는 key만 저장
실제 데이터는 leaf node에만 저장
```
B+Tree는 internal node에 실제 데이터를 저장하지 않기 때문에 하나의 internal node에 더 많은 key를 담을 수 있고, 그 결과 트리의 높이를 더 낮출 수 있다.
### 6.2 검색 경로
```text
B-Tree:
검색 중 internal node에서 데이터를 찾으면 탐색이 끝날 수 있음

B+Tree:
항상 leaf node까지 내려가서 데이터를 찾음
```

B+Tree는 항상 leaf node까지 내려가야 하므로 단건 조회만 보면 한 단계 더 가야 하는 것처럼 보일 수 있다.
하지만 internal node에 더 많은 key를 담을 수 있어 트리 높이가 낮아지고, 검색 경로가 일정해지는 장점이 있다.
### 6.3 범위 검색
```text
B-Tree:
범위 검색 시 tree traversal이 필요할 수 있음

B+Tree:
leaf node들이 연결되어 있어 순차 탐색이 쉽다
```
B+Tree는 leaf node끼리 연결되어 있으므로 범위 검색에서 유리하다.

```text
시작 key 탐색
→ leaf node linked list를 따라 순차 조회
```
---
## 7. MySQL InnoDB에서의 B+Tree

MySQL InnoDB는 인덱스 구조로 B+Tree를 사용한다.
여기서 Primary Key Index와 Secondary Index의 leaf node에 저장되는 내용이 다르다.
### 7.1 Primary Key Index

> Primary Key B+Tree의 leaf node에는 실제 row data가 저장된다.

```text
Primary Key Index leaf node
→ 실제 row data 저장
```
즉, InnoDB 테이블의 데이터는 Primary Key 기준으로 정렬되어 저장된다.
### 7.2 Secondary Index

> Secondary Index의 leaf node에는 실제 row data 전체가 아니라 Primary Key 값이 저장된다.

```text
Secondary Index leaf node
→ secondary index key + primary key 값 저장
```
그래서 secondary index로 데이터를 찾으면, 
필요한 경우 secondary index의 leaf node에서 얻은 Primary Key 값으로 clustered index를 다시 조회한다.
```text
Secondary Index 탐색
→ Primary Key 값 획득
→ Primary Key Index 탐색
→ 실제 row data 조회
```
---
## 8. Hash Index는 왜 안쓰일까?

Hash Index는 `=` 조건의 단건 조회에서는 평균적으로 매우 빠르다.

하지만 Hash Index는 key의 순서를 보존하지 않아 다음과 같은 조회에는 적합하지 않다.
```sql
WHERE age BETWEEN 20 AND 30
ORDER BY created_at
WHERE name LIKE 'kim%'
```

Hash Index의 한계:
1. `=` 조건 조회에만 적합하다.
2. 범위 검색에 사용할 수 없다.
3. 정렬에 사용할 수 없다.
4. prefix 검색에 사용할 수 없다.

반면 B+Tree는 key가 정렬된 상태로 유지되고, leaf node들이 연결되어 있어 단건 조회뿐 아니라 범위 검색, 정렬, 순차 탐색에도 적합하다.
따라서 일반적인 DB 인덱스에서는 Hash Index보다 B+Tree 계열이 더 널리 사용된다.