## 1. Spring 7부터 RestTemplate은 Deprecated 된다

Spring Framework 7.0 공식 문서에는 다음과 같은 경고가 추가되었다.
![](https://i.imgur.com/zUgpHs3.png)

> RestTemplate은 더 이상 권장되지 않으며, 향후 제거될 예정이다.  
> 
> Spring은 이를 대체하기 위한 동기 HTTP 클라이언트로 **RestClient**를 제공하고 있으며,  
> 
> 비동기 처리나 스트리밍이 필요한 경우에는 **WebClient** 사용을 권장하고 있다.

---
## 2. RestClient는 왜 등장했을까?

### 2.1 WebClient만으로는 해결되지 않았던 문제

Spring은 한동안 RestTemplate의 대안으로 WebClient를 제시해왔다.  
하지만 WebClient는 근본적으로 **WebFlux 기반의 비동기 HTTP 클라이언트**이다.

이로 인해 Spring MVC 환경에서는 다음과 같은 불편함이 있었다.
- WebClient 하나를 쓰기 위해 `spring-webflux` 의존성 추가 필요
- 기본 반환 타입이 `Mono`, `Flux`
- 동기 코드에서는 결국 `block()` 호출이 필요
- Reactive 방식에 대한 추가 학습 비용 발생

즉, WebClient는 “대체재”라기보다는  
**다른 패러다임의 도구**에 가까웠다.

---
### 2.2 Spring MVC를 위한 동기 HTTP Client의 부재

현실적으로 대부분의 Spring 서버는 여전히 **Spring MVC + Blocking 모델**을 사용한다.  
이 환경에서는 다음 조건을 만족하는 클라이언트가 필요했다.

- 동기 방식
- 간결한 API
- RestTemplate보다 가독성 좋은 코드
- WebFlux 의존성 없음

이 요구를 충족하기 위해 등장한 것이 **RestClient**다.

---
### 2.3 RestClient의 정체성

RestClient는 다음 두 가지를 결합한 결과물이다.

- WebClient의 **fluent API**
- RestTemplate의 **기존 인프라**
    - `HttpMessageConverter`
    - `ClientHttpRequestFactory`
    - `ClientHttpRequestInterceptor`

Spring 공식 설명 그대로 정리하면,

> RestClient는  
> **WebClient의 사용성 + RestTemplate의 기반을 결합한 동기 HTTP Client**이다.

---
## 3. RestClient와 RestTemplate의 차이
### 3.1 API 스타일의 차이

RestTemplate은 “템플릿 메서드” 중심의 API다.
```java
RestTemplate restTemplate = new RestTemplate();

HttpHeaders headers = new HttpHeaders();
headers.setContentType(MediaType.APPLICATION_JSON);
HttpEntity<String> entity = new HttpEntity<>("{}", headers);

String result = restTemplate.exchange(
    "https://example.com",
    HttpMethod.GET,
    entity,
    String.class
).getBody();
```

반면 RestClient는 WebClient와 동일한 체이닝 스타일을 제공한다.
```java
RestClient restClient = RestClient.create();

String result = restClient.get()
    .uri("https://example.com")
    .retrieve()
    .body(String.class);
```

가독성과 의도가 훨씬 명확하다.

---
### 3.2 구조적 차이 정리

| 구분     | RestTemplate          | RestClient |
| ------ | --------------------- | ---------- |
| 상태     | Deprecated (Spring 7) | 권장         |
| 호출 방식  | 템플릿 메서드               | Fluent API |
| 동작 모델  | Blocking              | Blocking   |
| 기반 인프라 | 기존 Spring HTTP 인프라    | 동일         |
| 신규 사용  | 비권장                   | 권장         |

---

## 4. 그렇다면 WebClient는 어디에 사용하는가

WebClient는 **Reactive 기반의 비동기 HTTP 클라이언트**다.  
Non-blocking 방식으로 동작하며, `Mono`, `Flux` 같은 Reactive Streams 타입을 반환한다.  
이 때문에 WebFlux 생태계의 핵심 컴포넌트로 사용된다.

```java
WebClient webClient = WebClient.create("https://example.com");

String response = webClient.get()
    .uri("/posts/1")
    .retrieve()
    .bodyToMono(String.class)
    .block();
```

`block()`을 사용하면 동기 방식처럼 보일 수 있다.  
하지만 공식 문서에서도 **권장하지 않는 사용 방식**임을 명시하고 있다.  
WebClient는 본질적으로 **비동기 흐름을 전제로 설계된 도구**이기 때문이다.

---
### 4.1 WebClient를 사용하는 경우
- 다수의 비동기 HTTP 호출이 필요한 경우
- 요청 간 조합이 필요한 경우 (`zip`, `flatMap`)
- 스트리밍 데이터 처리
- Reactive 서버(WebFlux) 환경
---
### 4.2 WebClient가 과한 선택이 되는 경우
- 단순한 외부 API 호출
- 동기 흐름의 비즈니스 로직
- Spring MVC 기반 서버

이러한 경우에는 WebClient보다 **RestClient가 더 자연스럽다.**

---
## 5. 정리

Spring의 현재 공식 방향을 한 번에 정리하면 다음과 같다.
- **RestTemplate**
    - Spring 7부터 deprecated
    - 신규 사용 비권장

- **RestClient**    
    - Spring MVC 환경의 기본 선택지
    - 동기 HTTP 호출의 표준

- **WebClient**    
    - Reactive / 비동기 / 스트리밍 전용 도구