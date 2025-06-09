---
dg-publish: true
---
# Contents
## 1. Swagger 도입
## 2. 커스텀 어노테이션을 통한 중복 제거 시도
## 3. 커스텀 어노테이션이 갖는 한계와 문제점
## 4. 결론: 공통은 분리하고, 상세는 명시한다
## 5. 추가
---
# 1. Swagger 도입
## 1.1 배경
API 명세를 자동으로 생성하고, 프론트엔드와의 협업 효율을 높이기 위해  **Springdoc + Swagger UI** 기반의 OpenAPI 문서화를 도입했다.

Swagger는 다음과 같은 이점을 제공했다:
- 요청/응답 구조의 **자동 명세화**
- 다양한 조건별 요청에 대한 **예시 응답 작성 가능**
- 프론트 개발자와의 **명확한 인터페이스 공유**
- JWT 인증이 필요한 API 테스트도 UI 상에서 가능
---
## 1.2 기본 설정
### build.gradle
``` groovy
// === API 문서화 (Swagger) ===
implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.6' // Swagger UI 및 OpenAPI
```
### SwaggerConfig
``` java
@Configuration
@OpenAPIDefinition(info = @Info(title = "TripMate 명세서", description = "API 명세서 테스트", version = "v0.0.1"))
public class SwaggerConfig {

    @Bean
    GroupedOpenApi attractionOpenApi() {
        return GroupedOpenApi.builder()
                .group("Attraction 관련 API")
                .pathsToMatch("/api/attractions/**")
                .build();
    }

	// 기타 도메인 생략
	
    @Bean
    public OpenAPI jwtOpenApi() {
        return new OpenAPI()
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme()
                                .name("Authorization")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
```
- 도메인별 API를 `GroupedOpenApi`로 구분하여 **Swagger UI 상에서 분리된 메뉴**로 표시
- JWT 인증이 필요한 API 테스트를 위한 **bearerAuth 설정 포함**
---
## 1.3 명세 작성 예시
### 핵심 Swagger 어노테이션 구성
``` java
@Operation(     
	summary = "관광지 페이징 검색",
	description = "조건(지역, 시군구, 타입)에 따라 결과 반환" 
) 
@ApiResponse(responseCode = "200", description = "조회 성공", content = @Content(...)) 
@ApiResponse(responseCode = "400", description = "잘못된 요청", content = @Content(...)) 
@ApiResponse(responseCode = "500", description = "서버 오류", content = @Content(...))
```
### ExampleObject
``` java
@ExampleObject(
    name = "AreaTypeExample",
    summary = "지역 + 타입 조건",
    value = """
			{ 
			    "message": "조회 성공",
				"data": [...] 
			}
			"""
)
```
### 요청 파라미터 문서화
``` java
@Parameter(description = "페이지 번호", example = "0") @RequestParam(defaultValue = "0") int page
```
- 각 요청 파라미터도 `@Parameter`로 설명 추가 → UI에 자동 표시됨
## 1.4 문제점
> Swagger 설정 자체는 어렵지 않았고, 예시도 잘 나오긴 했다.  그런데 API가 점점 많아지면서 어노테이션이 반복되고, 작성해야 할 내용도 많아졌다.

> 그러다 보니, 문서화를 위한 코드가 **컨트롤러 안에 너무 많이 들어오게 됐고**, 딱히 중요한 로직도 아닌데 컨트롤러에 자리를 차지하고 있으니,  정작 중요한 로직보다 **부가적인 설명들이 눈에 더 띄고 있다고 느껴졌다.**
---
# 2. 커스텀 어노테이션을 통한 중복 제거 시도
## 2.2 구조 설계
![](https://i.imgur.com/jLwwqXa.png)
위 그림처럼, 컨트롤러에 반복되던 Swagger 어노테이션들을 역할별로 분리해서  **커스텀 어노테이션 3개로 정리**했다.

| 색상  |          의미           |                         어노테이션 파일                         |
| :-: | :-------------------: | :------------------------------------------------------: |
| 빨강  |         성공 응답         | `UserSuccessResponses.java` → `@ApiUserRegisterSuccess`  |
| 초록  |  400 Bad Request 예시   | `UserErrorResponses.java` → `@ApiUserRegisterBadRequest` |
| 파랑  | 공통 오류 응답 (401, 500 등) | `CommonErrorResponses.java` → `@ApiCommonErrorResponses` |
## 2.3 어노테이션 정의 예시
### 회원가입 성공 응답
``` java
public final class UserSuccessResponses {
	@Target(ElementType.METHOD)
	@Retention(RetentionPolicy.RUNTIME)
	@ApiResponse(
	    responseCode = "200",
	    description = "회원가입 성공",
	    content = @Content(
	        mediaType = "application/json",
	        schema = @Schema(implementation = UserRegisterResponse.class)
	    )
	)
	public @interface ApiUserRegisterSuccess {}

	// Swagger 문서에 표시할 200 응답 예시용 객체 (응답 구조와 메시지 명시)
	public static class UserRegisterResponse extends CommonResponse<UserResponseDto> {
	    public UserRegisterResponse() {
	        super("회원가입 성공", new UserResponseDto());
	    }
	}
}
```
### 회원가입 중복 오류 응답(400)
``` java
public final class UserErrorResponses {
	@Target(ElementType.METHOD)
	@Retention(RetentionPolicy.RUNTIME)
	@ApiResponse(
	    responseCode = "400",
	    description = "회원가입 시 중복 ID 또는 이메일",
	    content = @Content(
	        mediaType = "application/json",
	        schema = @Schema(implementation = ErrorResponseDto.class),
	        examples = @ExampleObject(
	            name = "Register400Example",
	            summary = "회원가입 중복 예시",
	            value = "{ ... }"
	        )
	    )
	)
	public @interface ApiUserRegisterBadRequest {}
}
```
### 공통 인증 / 서버 오류 응답 (401, 500)
``` java
public final class CommonErrorResponses {
	@Target(ElementType.METHOD)
	@Retention(RetentionPolicy.RUNTIME)
	@ApiResponse(
	    responseCode = "401",
	    description = "Refresh Token 누락 또는 비어있음",
	    content = @Content(...) // 토큰 오류 예시
	)
	@ApiResponse(
	    responseCode = "500",
	    description = "서버 내부 오류",
	    content = @Content(...) // DB/서버 예시
	)
	public @interface ApiCommonErrorResponses {}
}
```
---
## 2.4 개선된 컨트롤러 코드
기존에는 Swagger 관련 코드만으로 컨트롤러 메서드가 20~30줄씩 길어졌지만,  
아래처럼 필요한 응답만 골라 한 줄씩 붙이면 깔끔하게 명세가 구성된다
``` java
@PostMapping("/api/users") 
@ApiUserRegisterSuccess 
@ApiUserRegisterBadRequest 
@ApiCommonErrorResponses 
public ResponseEntity<?> register(@RequestBody @Valid UserCreateDto dto){ 
}
```
이렇게 바꾸고 나서야, **문서화 코드는 문서화대로, 비즈니스 로직은 로직대로 분리된 느낌**을 받을 수 있었다.

---
# 3. 커스텀 어노테이션이 갖는 한계와 문제점

처음에는 중복을 줄이고 컨트롤러를 깔끔하게 만들기 위해  
Swagger 어노테이션들을 역할별로 분리해 커스텀 어노테이션으로 관리했다.

하지만 API가 점점 많아지고, 응답의 설명이나 예시 내용이 조금씩 달라지기 시작하면서  
이 방식에도 한계가 있다는 걸 느꼈다.

---

## 3.1 설명과 예시가 API마다 미묘하게 다름

예를 들어, 모두 400 응답이라 하더라도…

- A API는 `"요청 값 누락"`이고,  
- B API는 `"형식 오류"`며,  
- C API는 `"중복 ID"`와 같이  
**description, example, errorCode, schema가 API마다 다르게 필요**했다.

그러다 보니 결국 이런 상황이 벌어졌다:

> 커스텀 어노테이션을 재사용하지 못하고,  
> 결국엔 **API마다 하나씩 따로 어노테이션을 또 만들어야 하는 상황**

---

## 3.2 커스텀 어노테이션이 오히려 늘어남

- `@ApiUserRegisterBadRequest`
- `@ApiUserLoginBadRequest`
- `@ApiUserUpdateBadRequest`
- `@ApiAttractionCreateBadRequest`
- ...

결국 이 방식은 **중복 제거**가 아니라  **‘중복된 어노테이션 클래스를 늘리는 구조’로 바뀌고 있었다.**

---

## 3.3 유지보수가 더 어려워질 가능성

이처럼 어노테이션이 늘어나면:

- 응답 구조를 변경하거나 예시를 바꾸는 일이 더 번거로워지고,
- 해당 어노테이션이 어디서 쓰였는지 추적하기도 어려워진다.

결국, "코드를 덜 쓰려고 만든 구조가  **관리할 게 더 많아지는 구조로 변질될 수 있다**"는 걸 깨달았다.

---

# 4. 결론: 공통은 분리하고, 상세는 명시한다
### 4.1 결론
처음엔 최대한 공통화해서 깔끔하게 관리하고 싶었다.  그런데 막상 적용해보니 응답 구조나 설명, 예시가 API마다 조금씩 달라지는 경우가 많았고,  결국엔 모든 API를 따로 어노테이션으로 만들어야 하는 상황이 반복됐다.

그래서 지금은 아래처럼 정리해서 적용하고 있다:

1. 응답 내용이 자주 바뀌거나, API마다 다르게 보여야 하는 경우는  
   컨트롤러 안에서 **명시적으로 직접 작성**한다.

2. 반대로, **어디서나 공통으로 쓰이는 응답**  
   (예: 401 인증 실패, 500 서버 오류 등)은  
   **공통 어노테이션으로 분리해서 재사용**한다.

이렇게 나누고 나니 관리도 편해졌고, 나중에 봐도 훨씬 이해하기 쉬웠다.

---
### 4.2 실제 적용 예시 – 로그아웃 API
아래는 이 전략을 실제 프로젝트에 적용한 로그아웃 API다.  
성공/실패 응답은 명시적으로 작성했고, 공통 서버 오류는 어노테이션으로 처리했다.
```java
@PostMapping("/logout")
@Operation(
    summary = "로그아웃",
    description = "Refresh Token 쿠키와 DB에 저장된 값을 삭제하여 로그아웃합니다. Access Token은 클라이언트에서 제거해야 합니다.",
    responses = {
        @ApiResponse(
            responseCode = "200",
            description = "로그아웃 성공",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = CommonResponse.class),
                examples = @ExampleObject(
                    name = "LogoutSuccessExample",
                    summary = "로그아웃 성공",
                    value = """
                        {
                          "message": "Logout successful.",
                          "data": []
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Refresh Token 누락",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = CommonResponse.class),
                examples = @ExampleObject(
                    name = "LogoutMissingTokenExample",
                    summary = "Refresh Token이 없는 경우",
                    value = """
                        {
                          "message": "Refresh token is required.",
                          "data": []
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Refresh Token이 유효하지 않음 또는 일치하지 않음",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = CommonResponse.class),
                examples = @ExampleObject(
                    name = "LogoutInvalidTokenExample",
                    summary = "Refresh Token 유효하지 않음",
                    value = """
                        {
                          "message": "Invalid or mismatched refresh token",
                          "data": []
                        }
                        """
                )
            )
        )
    }
)
@ApiCommonErrorResponses
public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = extractValidatedRefreshToken(request);
    User user = validateRefreshTokenAndGetUser(refreshToken);

    userService.updateRefreshToken(user.getId(), null);
    CookieUtil.deleteRefreshTokenCookie(response);

    return ResponseEntity.ok(new CommonResponse<>("Logout successful.", List.of()));
}
```
---
# 5. 추가
Swagger의 코드 침범 문제를 고민하던 중, [Smart-Doc : Swagger 대체안](https://velog.io/@dongvelop/Java-Smart-Doc-Swagger-%EB%8C%80%EC%B2%B4%EC%95%88)을 통해 Smart-Doc을 알게 되었다.  Smart-Doc은 Javadoc 기반으로 문서를 생성할 수 있어 컨트롤러를 침범하지 않는다는 장점이 있지만, Swagger만큼 다양한 UI 기능은 제공하지 않는다고 한다. 다음 프로젝트에서는 Smart-Doc 도입도 한번 고려해 봐야겠다.