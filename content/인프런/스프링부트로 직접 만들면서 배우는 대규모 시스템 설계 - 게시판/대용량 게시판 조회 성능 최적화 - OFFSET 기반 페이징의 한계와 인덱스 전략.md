## 1. 실험 배경
![|500](https://i.imgur.com/RgSIsZF.png)
게시판 조회 API의 성능을 검증하기 위해 1,200만 건의 article 데이터를 생성했다.

![|300](https://i.imgur.com/cXzYNIV.png)

조회 조건은 다음과 같다.
- 특정 board_id에 속한 게시글
- 최신 글 기준 내림차순 정렬
- 페이지네이션은 LIMIT + OFFSET 방식

---
## 2. 기본 쿼리와 성능 문제
쿼리:
![](https://i.imgur.com/oJrjIJG.png)

결과: 6.31초
![](https://i.imgur.com/3OaPbYZ.png)

이 시점에서 성능 병목이 발생했고, 원인을 확인하기 위해 `EXPLAIN`을 실행했다.

---
### 2.1 EXPLAIN 결과 (인덱스 없음)
![](https://i.imgur.com/6oVjb2X.png)

- `type = ALL`
    - **Full Table Scan**
- `key = NULL`
    - 사용 가능한 인덱스 없음
- `Extra = Using where; Using filesort`
    - 조건 필터링 후
    - **별도의 정렬(filesort)** 수행

> **board_id 필터링 → 전체 데이터 정렬 → offset만큼 버림 → 30건 반환**

즉, LIMIT 30을 가져오기 위해 수백만 건을 읽고 정렬한 뒤 대부분을 버리는 구조였다.

---
## 3. 인덱스 설계: created_at vs article_id

### 3.1 created_at 인덱스를 바로 쓰지 않은 이유

이론적으로는 아래 인덱스도 가능하다.
```sql
(board_id, created_at desc)
```

하지만 실험 데이터에서는 다음 문제가 있었다.
- 대량 insert 시 **created_at 충돌**
- 동일한 timestamp가 다수 발생
- 정렬 안정성이 깨질 가능성

이 경우 정렬 자체는 가능하지만, 동일한 created_at을 가진 row가 많아질수록 페이징 결과의 일관성을 보장하기 어렵다.

---
### 3.2 Snowflake 기반 article_id 사용

article_id는 Snowflake 알고리즘으로 생성된 값이며,
- 시간 순 정렬 가능
- 유니크 보장
- 생성 순서 ≒ 최신순

따라서 정렬 기준을 `created_at` 대신 `article_id`로 변경했다.
![](https://i.imgur.com/oAANW08.png)

---
## 4. 인덱스 적용 후 결과

쿼리:
![](https://i.imgur.com/PvHSpKT.png)

결과: 0.02초
![](https://i.imgur.com/uFMTwnI.png)
### 4.1 EXPLAIN 결과 변화
![](https://i.imgur.com/mHhbJ5L.png)

- `type = ref`    
- `key = idx_board_id_article_id`
- `Using filesort` 사라짐

> **정렬이 인덱스에서 해결됨**

---
## 5. OFFSET이 커질수록 다시 느려지는 이유

쿼리:offset → 149,970
![](https://i.imgur.com/a5kOOUf.png)

결과: 6.41초
![](https://i.imgur.com/amSxR5f.png)


![](https://i.imgur.com/OrRGlLo.png)
- EXPLAIN 상 인덱스는 사용됨
- 하지만 `rows ≒ 수백만` 유지

OFFSET 기반 페이징은 구조적으로 **앞의 N개 행을 읽고 버린 뒤, 다음 행을 반환** 한다.

> 즉, 인덱스를 타더라도**OFFSET 만큼은 반드시 스캔**해야 한다.

---
## 6. Covering Index + Join 전략 시도

### 6.1 접근 방식
1. Secondary Index에서 필요한 article_id만 조회
	 쿼리:![](https://i.imgur.com/MWPZe6Q.png)

	 결과: 0.29초![](https://i.imgur.com/W3WcD4e.png)

2. 그 결과를 article 테이블과 JOIN
	 쿼리:![](https://i.imgur.com/KNSDQf5.png)

	 결과: 0.29초![](https://i.imgur.com/KKY5ize.png)

---
### 6.2 EXPLAIN 결과
![](https://i.imgur.com/yYoNGbl.png)
- 서브쿼리: `Using index` (Covering Index)
- article 조인: `eq_ref`, PRIMARY KEY 접근

---
### 6.3 결론
- 중간 offset 구간은 **개선 효과 있음**
- 하지만 offset이 **30만, 100만 단위로 커지면**  ![](https://i.imgur.com/9GlIEgv.png)![](https://i.imgur.com/jx8jESF.png)
    → 여전히 느려짐

> OFFSET이 수십만, 수백만 단위로 커질수록
> 
> Covering Index + Join 전략을 사용하더라도
> 
> 응답 시간은 다시 급격히 증가했다.

---
## 7. 결론: OFFSET 페이징의 구조적 한계

이번 실험을 통해 확인한 점은
- 인덱스는 **정렬 비용**은 줄여준다
- 하지만 OFFSET 자체의 비용은 제거할 수 없다

따라서
-  **데이터 분리**(예: 연도별 테이블)
- **애플리케이션 레벨 제한**(비정상적인 깊은 페이지 접근 차단)
- **Cursor 기반 페이징**(article_id < lastId)
을 고려해볼 필요성을 느꼈다.