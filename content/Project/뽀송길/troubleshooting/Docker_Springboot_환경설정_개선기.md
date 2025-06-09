# 문제 상황
## Dockerfile
```dockerfile
FROM openjdk:21-jdk-slim

# 작업 디렉토리 설정
WORKDIR /pposonggil

# JAR 파일 변수 지정
ARG JAR_FILE=build/libs/pposonggil-0.0.1-SNAPSHOT.jar

# JAR 복사
COPY ${JAR_FILE} app.jar

# 실행
ENTRYPOINT ["java", "-jar", "app.jar"]
```
- 소스 코드에 변경이 있을때마다 `./gradlew build` 명령을 수동으로 실행하여 JAR 파일을 생성해야하는게 귀찮았다.
---
# 1. Docker 환경에서의 직접 빌드
## Dockerfile.dev
``` dockerfile
# 빌드 스테이지
FROM openjdk:21-jdk-slim AS builder
WORKDIR /pposonggil

# Gradle Wrapper 복사
COPY gradlew .
COPY gradle gradle
RUN chmod +x ./gradlew

# 의존성 파일 복사 및 다운로드
COPY build.gradle .
COPY settings.gradle .
RUN ./gradlew --no-daemon dependencies

# 소스 코드 복사 및 애플리케이션 빌드
COPY src/main/resources ./src/main/resources
...
COPY src/main/java/com/pposonggil/service ./src/main/java/com/pposonggil/service
COPY . .
RUN ./gradlew --no-daemon clean build -Pprod

# 실행 스테이지
FROM openjdk:21-jdk-slim
COPY --from=builder /pposonggil/build/libs/*.jar /pposonggil/app.jar
ENTRYPOINT ["java", "-jar", "/pposonggil/app.jar"]
```
- 첫번째 FROM(작업공간)에서 build한 후, 두번 째 FROM(작업공간)에서 jar 파일을 복사해 이미지를 만든다.
- 불필요한 파일들(의존성, 파일, 빌드 도구, ...)을 최종 이미지에서 제외할 수 있어 이미지 크기를 줄일 수 있다.
## 멀티 스테이지 빌드의 목적
- 빌드 환경과 실행 환경을 **명확하게 분리**
- 실행 이미지에 **불필요한 파일(소스, 테스트, Gradle 등) 포함 안됨**
- **JAR 파일만 포함된 경량 실행 이미지** 생성
## docker-compose.dev.yml
``` yaml
pposonggil:
  build:
    context: ./Backend/pposonggil
    dockerfile: Dockerfile.dev
  container_name: pposonggil
  expose:
    - 8080
  environment:
    ...
  depends_on:
    mysql:
      condition: service_healthy
  networks:
    - front-network
    - back-network
    - osrm-network
```
####  결과
- Docker 이미지 내에서 직접 빌드하여 JAR 파일을 생성하고 실행할 수 있도록 했다.
- 빌드 및 실행 : `docker-compose -f docker-compose.dev.yml up -d --build`
- 종료 : `docker-compose -f docker-compose.dev.yml down -v`
#### 한계
- 의존성은 일부 캐시되지만, `COPY . .` 이후 전체 빌드가 다시 수행될 수 있다.(빌드 시간↑)
  ![left|300](https://i.imgur.com/y1OcD1a.png)
- 애플리케이션 코드가 변경될 때마다 빌드 및 ==서버 재시작==이 필요했다.
---
# 2. Layerd JAR
### Dockerfile.prod
``` dockerfile
# 빌드 스테이지
FROM openjdk:21-jdk-slim AS builder
WORKDIR pposonggil
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} application.jar
RUN java -Djarmode=layertools -jar application.jar extract

# 실행 스테이지
FROM openjdk:21-jdk-slim
WORKDIR pposonggil
COPY --from=builder /pposonggil/spring-boot-loader/ ./
COPY --from=builder /pposonggil/dependencies/ ./
COPY --from=builder /pposonggil/snapshot-dependencies/ ./
COPY --from=builder /pposonggil/application/ ./
ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-Duser.timezone=Asia/Seoul", "org.springframework.boot.loader.launch.JarLauncher"]
```
![left|400](https://i.imgur.com/JpUXzCB.png)
- application: 애플리케이션 소스 코드
- snapshot-dependencies: 프로젝트 클래스 경로에 존재하는 스냅샷 종속성 jar 파일
- spring-boot-loader: jar 로더와 런처
- dependencies: 프로젝트 클래스 경로에 존재하는 라이브러리 jar 파일
### docker-compose.prod.yml
``` yaml
pposonggil:
  build:
    context: ./Backend/pposonggil
    dockerfile: Dockerfile.prod # 여기만 다름
  container_name: pposonggil
  expose:
    - 8080
  environment:
    ...
  depends_on:
    mysql:
      condition: service_healthy
  networks:
    - front-network
    - back-network
    - osrm-network
```
#### 결과
- 애플리케이션 소스 코드만 변경 했을때 필요한 모듈만 로드하므로 메모리 사용량이 줄어들고 빠르다.
  ![left|300](https://i.imgur.com/terkybT.png)
- 빌드 및 실행 : `./gradlew build` + `docker-compose -f docker-compose.prod.yml up -d --build`
- 종료 : `docker-compose -f docker-compose.prod.yml down -v`
#### 문제점    
- `.jar` 파일을 먼저 빌드해야 하므로, **항상 `./gradlew clean build -Pprod`를 직접 실행해야 함**
- 코드가 바뀔 때마다 `.jar`를 새로 만들고, 다시 ==도커 이미지도 빌드해야 함==
- 매번 수동으로 `docker-compose up -d --build`를 실행해야 함
즉, **코드 변경 → 빌드 → Docker 이미지 재생성 → 서버 재기동**이라는 절차가 반복됨
---
## 3. auto reload
### 흐름
1. 개발자가 로컬 코드(src) 수정
2. 바인드 마운트로 컨테이너 내부 코드도 함께 수정됨
3. Gradle의 buildAndReload --continuous가 코드 변경 감지
4. .restart 파일을 수정함
5. Spring DevTools가 .restart 파일 변경 감지
6. 애플리케이션 자동 재시작
---
### 1. build.gradle
``` c
// Spring Dev Tools 추가
dependencies {
	developmentOnly 'org.springframework.boot:spring-boot-devtools'
}

// 라이브러리들을 /libs/ 폴더로 복사
// bootRun이 이 폴더에서 의존성을 읽을 수 있게 준비
task updateLib(type: Copy) {
	duplicatesStrategy = DuplicatesStrategy.EXCLUDE
	from configurations.compileClasspath into "libs/"
	from configurations.runtimeClasspath into "libs/"
}

// 코드를 빌드 후, .restart파일 갱신(timestamp 변경)
// Spring Devtools의 재시작 트리거 역할을 한다.
task buildAndReload {
	dependsOn build
	mustRunAfter build // buildAndReload must run after the source files are built into class files using build task
	doLast {
		new File(".", ".restart").text = "${System.currentTimeMillis()}" // update trigger file in root folder for hot reload
	}
}
```
- `buildAndReload`는 코드 변경 → `.restart` 파일 업데이트 역할
- 이 파일이 DevTools의 재시작 트리거로 작동
---
### 2. entrypoint.sh
``` sh
start_server() {
  (sleep 30; ./gradlew buildAndReload --continuous -PskipDownload=true -x test) &
  ./gradlew bootRun -PskipDownload=true
}
start_server
```
두 개의 명령을 **동시에 실행**
1. `buildAndReload --continuous` → 변경 감지 + `.restart` 파일 자동 갱신
	- `--continuous`: 변경 사항을 **계속 감시**
2. `bootRun` → Spring 애플리케이션 실행 (DevTools 활성화 상태)
	- `-PskipDownload=true`: 의존성은 이미 복사했으니 다시 다운로드하지 않음
	- `-x test`: 테스트는 생략
---
### 3. application.yml
``` yaml
# devtools 
devtools: 
  restart: 
    enabled: true # restart 활성 
    additional-paths: . # 추가 경로 설정 
    trigger-file: .restart # 트리거 파일로서 해당 파일이 수정되면 서버가 재시적됨 
    livereload: enables: true # livereload 활성화
```
- `.restart` 파일이 변경되면 → 서버를 재시작
---
### 4. Dockerfile.dev
``` dockerfile
COPY . /usr/src/pposonggil
RUN chmod +x entrypoint.sh && ./gradlew updateLib
```
- 소스코드 전체를 컨테이너에 복사
	- 빌드 시 이미지 크기는 커지지만, bind mount로 수정사항 실시간 반영
- 라이브러리를 복사하는 `updateLib` task 실행
- `entrypoint.sh`에 실행 권한 부여
---
### 5. docker-compose.dev.yml
```docker-compose.yml
pposonggil:
  build:
    context: ./Backend/pposonggil
    dockerfile: Dockerfile.dev
  container_name: pposonggil
  volumes:
    - type: bind
      source: ./Backend/pposonggil
      target: /usr/src/pposonggil
  expose:
    - 8080
  environment:
    ...
  depends_on:
    mysql:
	  condition: service_healthy
  networks:
    - front-network
    - back-network
    - osrm-network
```
- `./Backend/pposonggil`에 있는 코드를 바인드 마운트 하여 소스코드를 변경 했을 때 컨테이너 안에 있는 코드도 같이 변경된다.
---
#### 결과   
**Spring DevTools + `.restart` + Gradle 감지 + 바인드 마운트**를 활용하여  
Docker 컨테이너 안에서도 **자동 재시작되는** ==개발 환경==을 만들었다.
- `docker-compose up -f docker-compose.dev.yml -d --build`로 컨테이너 실행 후 코드를 수정하면, 변경사항을 감지하여 재빌드하고 `.restart` 파일을 수정한다. 해당 파일이 트리거가 돼서 서버가 재시작된다.
- Dockerfile의 `COPY . /usr/src/pposonggil` 때문에 이미지 크기가 늘어났지만, 매번 서버를 재시작 할 필요가 없어 편하다.
---
# 출처
- [Dockerfile 내 RUN ./gradlew bootJar 실행시 'xargs not available' 에러](https://velog.io/@mj3242/Dockerfile-%EB%82%B4-RUN-.gradlew-bootJar-%EC%8B%A4%ED%96%89%EC%8B%9C-xargs-not-available-%EC%97%90%EB%9F%AC))
- [도커파일-피드백](https://www.inflearn.com/community/questions/1169281/%EB%8F%84%EC%BB%A4%ED%8C%8C%EC%9D%BC-%ED%94%BC%EB%93%9C%EB%B0%B1)
- [Gradle, Layered Jar 그리고 Dockerbuild 최적화](https://velog.io/@ssol_916/Gradle-Layered-Jar-%EA%B7%B8%EB%A6%AC%EA%B3%A0-Dockerbuild-%EC%B5%9C%EC%A0%81%ED%99%94)
- [Spring Boot 3.2.X:JarLauncherPath](https://medium.com/viascom/spring-boot-3-2-x-jarlauncher-path-a3656f8e69b4)
- [Reusing Docker Layers with Spring Boot](https://www.baeldung.com/docker-layers-spring-boot)
- [spring boot 도커환경 auto reload 세팅](https://velog.io/@youngjun0627/spring-boot-%EB%8F%84%EC%BB%A4%ED%99%98%EA%B2%BD-auto-reload-%EC%84%B8%ED%8C%85)
- [# docker spring boot live reload 개발 환경 구성(vs code)](https://velog.io/@jjh930301/docker-spring-%EA%B0%9C%EB%B0%9C-%ED%99%98%EA%B2%BD-%EA%B5%AC%EC%84%B1vs-code)