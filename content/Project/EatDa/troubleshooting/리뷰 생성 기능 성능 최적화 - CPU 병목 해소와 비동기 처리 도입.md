# Contents
## 1. 리뷰 생성 기능
## 2. 사용한 Tool

## 3. CPU 사용률 99 → 서버 다운 발생
## 4. 리뷰 생성 기능 병목 원인 분석
## 5. 비동기로 개선(`CompletableFuture`)
## 6. 이미지 최적화 로직 삭제
---
# 1. 리뷰 생성 기능
## 1.1. 클라이언트 요청 단계
![](https://i.imgur.com/mHV5Mbj.png)
사용자가 앱에서 메뉴를 선택하고 프롬프트 및 이미지를 입력하면,  
`POST /api/reviews/assets` API가 호출됩니다.  
이때 서버(Spring)는 요청을 수신한 뒤 리뷰와 관련된 **asset 상태, review 상태**를 `PENDING`으로 저장합니다.

---
## 1.2. 비동기 처리 파이프라인
![](https://i.imgur.com/LKOz3wD.png)
Spring 서버는 리뷰 생성 요청을 **Redis Streams**에 발행(`XADD`)합니다.  
발행된 메시지는 `review.asset.generate` 스트림에 기록되며,  
FastAPI Consumer가 이를 구독해 AI 기반 이미지/영상 생성 작업을 실행합니다.
- **Spring (Producer)** : 요청을 Redis Streams에 적재 (PENDING 상태 유지)
- **Redis Streams (Broker)** : 요청을 안전하게 저장하고 대기
- **FastAPI (Consumer)** : 메시지를 구독 후 실제 이미지/영상 생성 실행
---
# 2. 테스트 환경 구성
리뷰 생성 기능의 성능을 검증하기 위해 **k6, Prometheus, Grafana**를 사용했습니다.
- **k6** : API에 부하를 걸어서 성능을 실험하는 도구
- **Prometheus** : 서버 지표(CPU, 메모리 등)를 모아주는 도구
- **Grafana** : Prometheus가 수집한 데이터를 시각화하는 도구
> 특히 k6에서는 요청 빈도(rate), 단위 시간(timeUnit), 테스트 지속 시간(duration), 가상 사용자 수(VUs) 등을 **환경 변수로 지정**하여 여러 시나리오를 반복적으로 실험할 수 있도록 했습니다.

## 2.1. k6 스크립트 예시
``` javascript
import http from 'k6/http';
import {check, sleep} from 'k6';
import {FormData} from 'https://jslib.k6.io/formdata/0.0.2/index.js';

const img = open('./test.png', 'b');

export const options = {
    scenarios: {
        normal_load: {
            executor: 'constant-arrival-rate', 
		    rate: __ENV.RATE,                  // 요청 발생 빈도
		    timeUnit: __ENV.TIME_UNIT,         // 기준 단위 시간
		    duration: __ENV.DURATION,          // 전체 테스트 실행 시간
			preAllocatedVUs: __ENV.PRE_VUS,    // 미리 확보할 가상 사용자 수
			maxVUs: __ENV.MAX_VUS,             // 최대 동시 실행 가능한 가상 사용자 수
        },
    },
};

export default function () {
    const url = 'https://****/test/api/reviews/assets';

    const fd = new FormData();
    fd.append('storeId', '4');
    fd.append('menuIds', '1');
    fd.append('menuIds', '2');
    fd.append('type', 'SHORTS_RAY_2');
    fd.append('prompt', '귀여운 햄스터가 치킨 한입 베어먹고 도망가는 영상 만들어줘.');
    fd.append('image', http.file(img, 'test.png', 'image/png'));

    const res = http.post(url, fd.body(), {
        headers: {
            'Content-Type': 'multipart/form-data; boundary=' + fd.boundary,
            'Authorization': 'Bearer ****'
		}
	});

    const ok = check(res, {
        'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    });

    // This logs the response time. It doesn't perform a check.
    console.log(`Response time for successful request: ${res.timings.duration} ms`);

    if (!ok) {
        console.error(`Request failed: status=${res.status}, body=${res.body}`);
    }
}

sleep(0.1); // 0.1초 대기
```
---
# 3. CPU 사용률 99% → 서버 다운 발생

리뷰 생성 API에 부하를 가하며 요청 빈도를 점점 올려 테스트했습니다.
## 3.1. 1초당 2회 요청 (RPS = 2)
![](https://i.imgur.com/Bp2CR7l.png)
- 총 시도 요청: **572건** (정상 처리 148건, Dropped 424건)
- 평균 응답 시간: **1.5s 내외**
- Dropped Iterations: **424건** → 실행조차 못한 요청 다수
- 정상 처리 비율은 **약 25%**
---
## 3.2. 1초당 3회 요청 (RPS = 3)
![](https://i.imgur.com/FnV2H3t.png)
- Dropped Iterations: **730건**으로 급증
- 평균 응답 시간은 1.5s로 보이지만, 이는 **드롭되지 않고 살아남은 일부 요청만 반영된 값**
- CPU 사용률 99% 도달
- 실제로는 **서버가 포화되어 정상 처리 불가 상태**
---
## 3.3. CPU 사용률 포화
![](https://i.imgur.com/jyHNXXU.png)
- `0, 1, 2, 3` → EC2의 **4개 CPU 코어 사용률**
- gunicorn 워커 4개(`-w 4`)가 각각 코어를 점유 → **모두 100% 사용 상태**
- `thr` → EC2 전체에서 실행 중인 스레드 개수
- #### 부하가 지속되자 **EC2 자체 다운 (ssh 연결 불가)**
---
## 3.4. htop 결과
![](https://i.imgur.com/suHHKJc.png)
- gunicorn 워커 4개가 각각 CPU 100% 점유
- 스레드 수는 Spring, FastAPI, Redis 등 모든 프로세스를 포함
- 결국 테스트 중 **EC2 다운 발생**
---
## 3.5. 결론
- 응답 시간만 보면 짧아 보이지만, 실제로는 **Dropped Iterations가 급증**
- CPU 사용률 99~100%로 포화 → 요청을 더 이상 감당 불가
- gunicorn 워커가 4코어를 모두 점유 → **EC2 자체 다운 발생**

> 즉, 단순히 응답 시간이 짧다고 해서 성능이 좋은 게 아니며,  
> **dropped Iterations와 CPU 사용률까지 함께 확인해야** 서버의 진짜 처리 능력을 알 수 있다.
---
# 4. 리뷰 생성 기능 병목 원인 분석
## 4.1. 단계별 타이머 삽입
서버가 정상적으로 응답하지 못하는 이유를 찾기 위해, 리뷰 생성 기능의 각 단계를 **Micrometer Timer**로 계측했습니다.
- 유저 조회 (`find_eater`)
- 가게 조회 (`find_store`)
- 요청 검증 (`validate`)
- 엔티티 생성 (`create_entities`)
- 이미지 업로드 (`upload_images`)
- Redis 메시지 발행 (`publish_message`)
---
## 4.2. 결과: 이미지 업로드 병목
![](https://i.imgur.com/EWOkKGh.png)  
- 측정 결과, **이미지 업로드 단계(upload_images)가 가장 큰 병목**
---
## 4.3. Thread Pool 확장 시도
처음에는 단순히 **스레드 풀 크기를 늘리면** 병목이 완화될 거라 생각했습니다.

- 초기 설정
    - `corePoolSize: 10`
    - `maxPoolSize: 20`
    - `queueCapacity: 100`
- 확장 후 설정
    - `corePoolSize: 20`
    - `maxPoolSize: 40`        
    - `queueCapacity: 200`

하지만 기대와 달리, **성능 개선은 거의 없었고 오히려 평균 응답 시간은 더 늘어나는** 결과가 나타났습니다.

---
# 5. 비동기로 개선 (`CompletableFuture`)
## 5.1. 기존 코드의 문제점
```java
// 동기 업로드: 모든 이미지 저장이 끝날 때까지 HTTP 스레드가 대기
List<String> uploadedImageUrls = uploadImages(images, base, convertToWebp);

private List<String> uploadImages(List<MultipartFile> images, String base, boolean convertToWebp) {
    return images.stream()
        .map(f -> fileStorageService.storeImage(f, base, f.getOriginalFilename(), convertToWebp))
        .toList();
}
```
- 모든 이미지 업로드가 끝날 때까지 **HTTP 요청 스레드가 블로킹**
- 요청이 많아질수록 응답 지연, Dropped Iterations 다수 발생
- CPU는 포화, 스레드는 업로드 대기 → 처리량 급격히 감소
---
## 5.2. 개선 코드
```java
// 업로드를 백그라운드로 위임하고, 완료되면 메시지 발행
CompletableFuture.supplyAsync(() -> uploadImages(  
        request.image(),  
        IMAGE_BASE_PATH + eater.getEmail(),  
        convertToWebp)  
), executor)  
.thenAcceptAsync(uploadedImageUrls -> {  
    publishReviewAssetMessage(reviewAsset, eater.getId(), request, store, uploadedImageUrls);  
}, executor);

// 비동기 업로드(HTTP 스레드가 아닌 별도 스레드에서 병렬 저장)
private List<String> uploadImages(final List<MultipartFile> images,
                                  final String relativeBase,
                                  final boolean convertToWebp) {
    List<CompletableFuture<String>> futures = images.stream()
        .map(file -> CompletableFuture.supplyAsync(() ->
                fileStorageService.storeImage(
                        file,
                        relativeBase,
                        file.getOriginalFilename(),
                        convertToWebp
                ), executor
        ))
        .toList();

    // join()을 사용하지만, 이 코드는 메인 스레드가 아닌 별도 스레드에서 실행되므로
    // HTTP 요청 스레드를 블로킹하지 않음
    return futures.stream()
        .map(CompletableFuture::join)
        .toList();
}
```
- 업로드를 **백그라운드 작업**으로 분리 → **HTTP 요청 스레드는 즉시 반환**
- 업로드 완료 후 **Redis 메시지 발행**을 체이닝 → 처리 흐름 유지
- 동시 업로드는 **전용 `executor`** 로 처리 → 처리량 안정화
---
## 5.3. 개선 효과
- **HTTP 요청 스레드가 이미지 업로드 완료를 기다리지 않음**  
    → 클라이언트는 요청 직후 **즉시 응답**을 받음
- **이미지 업로드 & Redis 메시지 발행은 백그라운드에서 처리**  
    → 서버는 부하 상황에서도 안정적으로 요청을 처리 가능
---
## 5.4. k6 & Grafana 테스트 결과
### 5.4.1. k6
![](https://i.imgur.com/zZc5Jt4.png)
- dropped Iterations = **0**
- 모든 요청이 정상 처리됨
- 평균 응답 시간도 크게 감소
---
### 5.4.2. Grafana
#### 처리량(Throughput)
![](https://i.imgur.com/G1xCKgW.png)
- 요청 처리량(RPS)이 일정하게 유지됨
- Dropped Iterations 없이 **모든 요청을 정상적으로 처리**
- 개선 전에는 CPU 포화로 그래프가 끊기거나 급격히 하락했지만,  
    개선 후에는 **안정적으로 처리량을 유지**
---
#### Redis Streams 발행 성공률
![](https://i.imgur.com/9WYJvvF.png)
- **Success 지표(녹색)** 가 꾸준히 증가
- **Failure 지표(주황색)** 는 0 → 메시지 유실 없음
- 개선 전에는 서버 다운으로 발행 실패 가능성이 있었으나,  
    개선 후에는 **모든 요청이 안정적으로 Redis Streams에 기록
---
#### CPU 사용률
![](https://i.imgur.com/qNUXrBI.png)
- **App CPU / System CPU 사용률이 10~20% 수준** 으로 유지
- 개선 전처럼 99~100%에 도달하지 않음
- gunicorn 워커가 병렬 처리하더라도 CPU 리소스가 고르게 분배되어,  
    **코어별 100% 점유 현상이 사라짐**
---
## 5.5. 리뷰 생성 기능 성능 개선 전/후 비교
| 구분                   | 개선 전                                             | 개선 후                                     |
| -------------------- | ------------------------------------------------ | ---------------------------------------- |
| **처리량 (Throughput)** | Dropped Iterations 다수 발생 → 요청 처리량이 불안정하고 급격히 하락  | 모든 요청 정상 처리, 처리량(RPS)이 일정하게 유지           |
| **응답 시간**            | 평균 응답 시간은 짧아 보이지만(1.5s), 사실상 대부분 Dropped → 착시 효과 | Dropped 없음 → 실제 응답 시간 (3~4s)이 안정적으로 측정   |
| **Redis 메시지 발행**     | 서버 다운 시 발행 실패/유실 가능성 존재                          | Success 100%, Failure 0 → 모든 요청 안정적으로 기록 |
| **CPU 사용률**          | 99~100% 포화 → 4코어 전부 100% 점유 → EC2 다운 발생          | 10~20 수준에서 안정적으로 유지, 워커 간 균등 분배          |
| **시스템 안정성**          | 트래픽 스파이크 시 서버 자체 다운 (ssh 연결 불가)                  | 부하 상황에서도 정상 동작, 다운 없음                    |

---
# 6. 이미지 최적화 로직 삭제

> 리뷰 생성의 병목이 **이미지 업로드(upload_images)** 단계임을 확인한 뒤, 
> 업로드 시간을 줄이기 위해 **이미지 최적화(웹P 변환/리사이징)** 를 제거하고 테스트했다.

## 6.1. 결과
![](https://i.imgur.com/uQRfkzJ.png)
- 이미지 업로드(`upload_images`, `background_upload`) 시간이 **0.5s → 0.01s 수준**으로 크게 감소

![](https://i.imgur.com/lfJiqqz.png)
- CPU 사용률이 **10 ~ 20% → 2 ~ 4% 수준** 으로 감소

![](https://i.imgur.com/YujH0I5.png)
- **http_req_duration(평균 응답 시간)**: 오히려 **증가** (**3.76s → 13.53s**)
---
## 6.2. 분석
- 기존에는 CPU가 이미지를 최적화하며 **I/O 비용을 줄여주고 있었음**
- 최적화를 제거하자 데이터 크기가 커져 **네트워크/디스크 I/O 대기시간이 지배**
- CPU는 가벼워졌지만, 전체 응답은 더 느려짐
---
## 6.3. 결론
- CPU 사용량은 줄었지만, **응답 시간은 오히려 악화**
- 이미지 최적화는 CPU를 많이 쓰더라도 **I/O를 줄여 총 처리 시간을 단축**
### 따라서 프로젝트에서는 **이미지 최적화 로직(webp 변환/리사이징)을 유지**하기로 결정

> CPU 부담을 줄인다고 무조건 빨라지지는 않는다.
> 병목은 상대적이며, 한쪽을 줄이면 다른 곳이 새로운 한계로 드러난다.