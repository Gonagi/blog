## 1. 개념 정리
### 1.1 `@PathVariable`

> URL **경로에 포함된 값**을 매핑하는 방식

```http
GET /users/10
```

```java
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) { }
```
**핵심**
- 리소스의 **고유 식별자**
- 대부분 필수
- REST API 설계의 기본 요소

---
### 1.2 `@RequestParam`

> URL **쿼리 파라미터**를 매핑하는 방식

```http
GET /users?page=1&sort=name
```

```java
@GetMapping("/users")
public List<User> getUsers(
    @RequestParam int page,
    @RequestParam String sort
) { }
```
**핵심**
- 조회 **조건·옵션**
- 선택적으로 사용 가능
- 페이징, 정렬, 검색에 적합

---
### 1.3 `@RequestBody`

> HTTP 요청 **Body(JSON)** 를 객체로 매핑하는 방식

```http
POST /users
Content-Type: application/json

{
  "name": "gonagi",
  "email": "gonagi@naver.com"
}
```

```java
@PostMapping("/users")
public void createUser(@RequestBody UserRequest request) { }
```
**핵심**
- JSON → 객체 변환
- POST / PUT / PATCH에서 사용
- REST API에서 **데이터 전달의 표준**

---
### 1.4 `@ModelAttribute`

> 요청 파라미터들을 **객체로 묶어 바인딩**하는 방식

```http
GET /users?name=kim&page=1
```

```java
@GetMapping("/users")
public List<User> getUsers(@ModelAttribute UserSearchCondition condition) { }
```

**핵심**
- 쿼리 파라미터 / 폼 데이터를 객체로 묶음
- 값이 없어도 객체 생성
- 검색 조건 객체화에 적합

---
## 2. 차이점 정리 표

|구분|PathVariable|RequestParam|RequestBody|ModelAttribute|
|---|---|---|---|---|
|위치|URL 경로|쿼리 스트링|HTTP Body|Query / Form|
|의미|리소스 식별|조회 옵션|데이터 본문|조건 묶음|
|필수 여부|대부분 필수|선택 가능|기본 필수|선택 가능|
|주 용도|단건 리소스|필터·페이징|생성/수정|검색 조건|

---
## 3. 필수 / 선택 처리 기준

### 3.1 PathVariable
```java
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) { }
```
⚠️ `required = false` 사용은 **비권장**  
→ 식별자가 없는 리소스는 REST 의미가 불명확

---
### 3.2 RequestParam / ModelAttribute
```java
@GetMapping("/users")
public List<User> getUsers(
    @RequestParam(required = false) String name,
    @RequestParam(defaultValue = "1") int page
) { }
```

```java
@GetMapping("/users")
public List<User> getUsers(@ModelAttribute UserSearchCondition condition) { }
```

```http
GET /users
GET /users?page=2
GET /users?name=kim&page=1
```

---
### 3.3 RequestBody
```java
@PostMapping("/users")
public void createUser(@RequestBody UserRequest request) { }
```
- Body 없으면 400 에러
- 데이터 전달이 명확함

---
## 4. 언제 무엇을 써야 할까?

### PathVariable
- 특정 **하나의 리소스**를 가리킬 때
```http
GET /posts/5
PUT /users/10
DELETE /comments/7
```

### RequestParam / ModelAttribute
- 목록 조회
- 검색, 필터링, 정렬, 페이징
```http
GET /posts?keyword=spring&page=1
```

```java
@GetMapping("/posts")
public List<Post> search(@ModelAttribute PostSearch condition) { }
```

### RequestBody
- 생성 / 수정 요청
- JSON 데이터 전달
```java
@PostMapping("/posts")
public void create(@RequestBody PostRequest request) { }
```

---
## 5. 가장 많이 쓰는 형태
```http
GET /posts/3/comments?page=2&size=10
```

```java
@GetMapping("/posts/{postId}/comments")
public List<Comment> getComments(
    @PathVariable Long postId,                // 무엇을
    @RequestParam(defaultValue = "1") int page, // 어떻게
    @RequestParam(defaultValue = "10") int size
) { }
```

```java
@PostMapping("/posts")
public void createPost(@RequestBody PostRequest request) { }
```

---
## 6. 잘못된 사용 예
```java
// ❌ 검색 조건을 PathVariable로 받기
@GetMapping("/users/search/{keyword}")

// ❌ 리소스 식별을 RequestParam으로 처리
@GetMapping("/users")
public User getUser(@RequestParam Long id)

// ❌ 동사 사용
@GetMapping("/users/getAll")
```

---
## 7. REST 설계 기본 규칙

**DO**
- 명사 사용 (`/users`, `/posts`)
- 리소스 식별 → PathVariable
- 조회 옵션 → RequestParam / ModelAttribute
- 데이터 본문 → RequestBody

**DON'T**
- 동사 사용 (`/getUsers`)
- 식별자를 쿼리로 처리
- 의미 없는 URL 계층

### 한 줄로 정리하면

> **PathVariable = 무엇을**  
> **RequestParam / ModelAttribute = 어떻게**  
> **RequestBody = 무엇을 담아서**