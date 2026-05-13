# Contents
## 1. Reflection이란?
## 2. 컴파일 타임과 런타임
## 3. Reflection이 가능한 이유
## 4. Class 객체를 얻는 방법
## 5. Reflection으로 조회할 수 있는 정보
## 6. getXXX와 getDeclaredXXX 차이
## 7. LogLens에서의 Reflection - 1
## 8. LogLens에서의 Reflection - 2
## 9. LogLens에서의 Reflection - 3
---
## 1. Reflection이란?

> 런타임에 클래스, 필드, 메서드, 생성자, 어노테이션 등의 정보를 조회하고 조작할 수 있는 자바의 기능

일반적인 코드는 컴파일 시점에 타입과 호출 대상이 어느 정도 결정되지만,
Reflection을 사용하면 프로그램 실행 중에 객체의 클래스 정보를 확인하고, 필드 값을 읽거나 변경하고, 메서드를 호출하고, 생성자를 통해 인스턴스를 생성할 수 있다.

즉, 프로그램이 실행 중에 자기 자신의 구조를 들여다보고 조작하는 기술로 볼 수 있다.
```java
Class<?> clazz = target.getClass();

Field[] fields = clazz.getDeclaredFields();

for (Field field : fields) {
    field.setAccessible(true);
    Object value = field.get(target);
}
```
---
## 2. 컴파일 타임과 런타임
### 2.1 컴파일 타임

> 소스 코드가 컴파일러에 의해 바이트 코드로 변환되는 시점

```java
String name = user.getName();
```

이런 코드는 컴파일 시점에 `user` 객체에 `getName()` 메서드가 있는지 확인할 수 있다.
### 2.2 런타임

> 컴파일된 바이트 코드가 JVM 위에서 실행되는 시점

이때 JVM은 클래스 로딩, 객체 생성, 메서드 실행, 외부 시스템과의 상호작용 등을 수행한다.
Reflection은 바로 이 **런타임 시점에 클래스 정보를 분석하고 조작하는 기능**이다.

---
## 3. Reflection이 가능한 이유

자바 코드는 다음 흐름으로 실행된다.
```text
Java Source Code
        ↓
	 Compiler
        ↓
.class Byte Code
        ↓
	ClassLoader
        ↓
JVM Runtime Data Area
        ↓
Method Area에 클래스 메타데이터 저장
```

자바 클래스가 JVM에 로딩되면, JVM은 해당 클래스의 정보를 메모리에 저장한다.
이때 저장되는 정보에는 다음과 같은 것들이 있다.
```text
클래스 이름
패키지 정보
부모 클래스
구현한 인터페이스
필드 정보
메서드 정보
생성자 정보
어노테이션 정보
```

Reflection API는 이 메타데이터에 접근해서 런타임에 클래스 구조를 분석한다.

즉, Reflection은 **Method Area에 저장된 클래스 메타데이터를 Class 객체를 통해 조회하고 조작하는 기능**이라고 볼 수 있다.

---
## 4. Class 객체를 얻는 방법

Reflection의 시작점은 항상 `Class` 객체이다.
```java
// 1. 인스턴스에서 얻기
String str = "Hello";
Class<?> clazz1 = str.getClass();

// 2. 클래스 리터럴 사용
Class<?> clazz2 = String.class;

// 3. 클래스 이름으로 동적 로딩
Class<?> clazz3 = Class.forName("java.lang.String");
```

| 방법                | 특징                 | 사용 상황          |
| ----------------- | ------------------ | -------------- |
| `getClass()`      | 실제 인스턴스의 런타임 타입 확인 | 객체가 이미 있을 때    |
| `.class`          | 컴파일 타임에 타입이 정해져 있음 | 타입 안전하게 클래스 참조 |
| `Class.forName()` | 문자열 기반으로 클래스 로딩    | 설정 기반 동적 로딩    |

---
## 5. Reflection으로 조회할 수 있는 정보

Reflection을 사용하면 다음 정보를 런타임에 가져올 수 있다.
```text
필드
메서드
생성자
어노테이션
부모 클래스
인터페이스
Enum
배열 타입
```

필드:
```java
Field[] fields = clazz.getDeclaredFields();
```

메서드:
```java
Method[] methods = clazz.getDeclaredMethods();
```

생성자:
```java
Constructor<?>[] constructors = clazz.getDeclaredConstructors();
```
---
## 6. getXXX와 getDeclaredXXX 차이
### 6.1 getXXX

```java
clazz.getFields();
clazz.getMethods();
clazz.getConstructors();
```

`getXXX` 계열은 **public 요소만 조회**한다.  
또한 상위 클래스에서 상속받은 public 요소도 포함한다.

---
### 6.2 getDeclaredXXX

```java
clazz.getDeclaredFields();
clazz.getDeclaredMethods();
clazz.getDeclaredConstructors();
```

`getDeclaredXXX` 계열은 **해당 클래스에 선언된 요소를 접근 제한자와 관계없이 조회**한다.

다만 private 필드나 메서드에 실제 접근하려면 다음 설정이 필요하다.
```java
field.setAccessible(true);
```

| 구분                     | 조회 범위              | private 포함 | 상속 요소 포함 |
| ---------------------- | ------------------ | ---------- | -------- |
| `getFields()`          | public 필드          | X          | O        |
| `getDeclaredFields()`  | 해당 클래스에 선언된 모든 필드  | O          | X        |
| `getMethods()`         | public 메서드         | X          | O        |
| `getDeclaredMethods()` | 해당 클래스에 선언된 모든 메서드 | O          | X        |

---
## 7. LogLens에서의 Reflection - 1

### 7.1 로그 마스킹 처리

> **로그 분석에 필요한 컨텍스트는 최대한 남기되,
> 민감정보는 어노테이션 기반으로 마스킹하거나 제외하기 위해 사용했다.**

AOP 기반으로 요청 정보를 로그로 남길 때,
DTO나 객체의 필드를 직접 하나씩 지정하지 않고 Reflection을 활용해서 객체 내부 필드를 동적으로 탐색했다.

예시:

1. 객체의 클래스 정보를 가져온다.
```java
Class<?> clazz = target.getClass();
```

2. 해당 클래스에 선언된 필드를 가져온다.
```java
Field[] fields = clazz.getDeclaredFields();
```

3. 이후 각 필드를 순회하면서 private 필드에도 접근 가능하도록 설정한다.
```java
field.setAccessible(true);
```

4. 필드에 붙은 어노테이션을 확인한다.
```java
field.isAnnotationPresent(Sensitive.class)
field.isAnnotationPresent(ExcludeValue.class)
```

5. 다음과 같이 처리한다.
```text
@Sensitive     → **** 로 마스킹
@ExcludeValue  → <excluded> 로 제외 표시
일반 필드       → 실제 값 출력
접근 실패       → <error> 출력
```

즉, 필드명을 하드코딩하지 않고도 객체 구조를 런타임에 분석해서 로그 문자열을 만들 수 있다.
### 7.2 Reflection을 사용한 이유

> Reflection을 사용하지 않았다면
> DTO마다 직접 `toString()`을 구현하거나, 각 필드를 하나씩 꺼내서 마스킹 처리해야 한다.

```java
return "UserRequest[email=" + mask(email) + ", password=****]";
```

이 방식은 DTO가 늘어날수록 중복 코드가 많아지고, 민감정보 필드가 추가될 때 누락될 위험도 있다.
Reflection을 사용하면 로그 수집 로직을 공통화할 수 있다.
```text
객체 전달
→ 클래스 정보 확인
→ 필드 목록 조회
→ 어노테이션 확인
→ 민감정보 마스킹
→ 로그 문자열 생성
```
### 7.3 로그 마스킹 흐름

```text
AOP에서 요청 파라미터 수집
        ↓
MaskingUtils.mask(target) 호출
        ↓
target.getClass()로 Class 객체 획득
        ↓
getDeclaredFields()로 필드 목록 조회
        ↓
각 Field에 setAccessible(true)
        ↓
@Sensitive 여부 확인
        ↓
@ExcludeValue 여부 확인
        ↓
마스킹된 문자열 생성
```

- DTO별 마스킹 코드 중복 제거
- 민감정보 처리 기준을 어노테이션으로 명확화
- 로그 분석에 필요한 컨텍스트 확보
- 필드가 추가되어도 공통 로직으로 처리 가능
---
## 8. LogLens에서의 Reflection - 2

LogLens에서는 장애 분석을 돕기 위해 애플리케이션의 컴포넌트 구조도 함께 수집했다.

예시:
```java
@Service
public class UserService {

    private final UserRepository userRepository;
    private final EmailService emailService;

    public UserService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
}
```
- 이 경우 `UserService`는 `UserRepository`를 의존하고 있다.
```
UserService → UserRepository
```

LogLens는 이런 관계를 자동으로 수집하기 위해 Reflection을 사용했다.

구체적으로는 애플리케이션이 실행된 뒤 Spring Bean을 조회하고, 각 Bean의 생성자 정보를 확인했다.
``` java
Constructor<?>[] constructors = targetClass.getDeclaredConstructors();
```

그리고 생성자 파라미터를 확인했다.
``` java
Parameter[] parameters = constructor.getParameters();

for (Parameter param : parameters) {
	Class<?> paramType = param.getType();
}
```
- 생성자 파라미터 타입을 보면 해당 클래스가 어떤 객체를 주입받는지 알 수 있다.

예를 들어 생성자 파라미터에 `UserRepository`가 있다면, LogLens는 다음 관계를 생성한다.
```
UserService → UserRepository
```

즉, Reflection을 사용해서 실행 중인 애플리케이션의 클래스 구조를 분석하고, Controller, Service, Repository 간 의존 관계를 수집했다.

---
## 9. LogLens에서의 Reflection - 3

의존 관계를 수집할 때는 각 클래스가 어떤 계층인지도 함께 구분해야 했다.

예시:
``` text
UserController → CONTROLLER
UserService    → SERVICE
UserRepository → REPOSITORY
```

이를 위해 클래스에 붙은 Spring 어노테이션을 확인했다.
```java
if (clazz.isAnnotationPresent(RestController.class)) {
    return "CONTROLLER";
}

if (clazz.isAnnotationPresent(Service.class)) {
    return "SERVICE";
}

if (clazz.isAnnotationPresent(Repository.class)) {
    return "REPOSITORY";
}
```
- `Class<?>` 객체를 통해 런타임에 클래스의 어노테이션 정보를 확인하므로 Reflection 이다.

예를 들어 `UserService` 클래스에 `@Service`가 붙어 있다면, LogLens는 해당 클래스를 `SERVICE` 계층으로 분류한다.
``` text
UserService → @Service 확인 → SERVICE
```

Repository의 경우에는 인터페이스 정보도 함께 확인했다.
- Spring Data JPA에서는 개발자가 Repository 인터페이스만 작성하고, 실제 구현체는 Spring이 런타임에 프록시 객체로 만들어주기 때문
``` java
public interface UserRepository extends JpaRepository<User, Long> {}
```

이 경우 클래스에 `@Repository`가 직접 붙어 있지 않아도 Repository 계층으로 봐야 해서 구현한 인터페이스 목록을 확인했다.
``` java
for (Class<?> interfaceClass : clazz.getInterfaces()) {
    String interfaceName = interfaceClass.getName();

    if (interfaceName.contains("Repository")) {
        return "REPOSITORY";
    }
}
```

즉, `@Repository` 어노테이션이 있는 경우뿐 아니라, Repository 관련 인터페이스를 구현한 경우도 Repository 계층으로 했다.

이를 통해 Spring Data JPA처럼 프록시 기반으로 동작하는 Repository도 LogLens의 의존성 수집 대상에 포함할 수 있었다.