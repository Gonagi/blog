## 1. 문제 상황
### 1.1 발생한 문제

**서비스 정보**
- 서비스: LogLens (로그 분석 플랫폼)
- 인프라: AWS ALB + EC2 (Spring Boot)
- 증상: 간헐적으로 서비스 접속 불가
- 발생 패턴: 약 50% 확률로 타임아웃 또는 503 에러

**에러 유형**
1. 간헐적 타임아웃 (응답 없음)
2. 502 Bad Gateway
3. 503 Service Unavailable
---
### 1.2 인프라 구성
``` text
VPC: vpc-00c3fdaea4574e2d0 (10.0.0.0/16)

ALB: loglens-elb-178704670
├── ap-northeast-2a: subnet-00b106250c782ea0f (퍼블릭)
└── ap-northeast-2c: subnet-0b4986e227f0c2866 (퍼블릭)

EC2: loglens-server (i-04c1b60d4552c1623)
└── ap-northeast-2a: subnet-0e3d80778701289b0 (프라이빗)

애플리케이션:
├── Spring Blue (포트 8080) - 메인 서비스
├── Spring Green (포트 8081) - Blue-Green 배포용
└── Jenkins (포트 9000) - CI/CD
```

---
## 2. 1차 문제 - 간헐적 타임아웃

### 2.1 문제 발견

**DNS 조회 결과**
```bash
dig loglens-elb-178704670.ap-northeast-2.elb.amazonaws.com

# 결과: 2개의 IP 반환
43.202.200.102  (ALB 노드 1)
52.78.216.127   (ALB 노드 2)
```

**각 IP 테스트**
``` bash
# IP 1 테스트
curl http://43.202.200.102
# 결과: 302 Found (HTTPS로 리다이렉트) ✅ 정상

# IP 2 테스트
curl http://52.78.216.127
# 결과: 타임아웃 (응답 없음) ❌ 연결 실패
```
---
### 2.2 원인 분석

**ALB의 다중 IP 구조**
``` text
                ALB DNS
                  ↓
         (라운드로빈으로 분배)
                  ↓
    ┌─────────────┴─────────────┐
    ↓                           ↓
ALB 노드 1                  ALB 노드 2
43.202.200.102              52.78.216.127
(2a 또는 2c AZ)             (2a 또는 2c AZ)
```

**왜 ALB가 2개의 IP를 가지는가?**

ALB는 각 가용영역(AZ)에 독립적인 노드를 배치하여 고가용성을 보장합니다. DNS 라운드로빈으로 트래픽을 분산하며, 각 노드는 독립적으로 동작합니다.

---
### 2.3 라우팅 테이블 확인

**문제의 서브넷 (ap-northeast-2c)**
``` text
서브넷: loglens-subnet-public02
Route Table: rtb-049b0ebae6b2ae71a

라우팅 규칙:
├── 10.0.0.0/16 → local (VPC 내부 통신)
└── ❌ 인터넷 게이트웨이 경로 누락!
```

**정상 서브넷 (ap-northeast-2a)**
``` text
서브넷: loglens-subnet-public01
Route Table: rtb-0580b9f2d29113b29

라우팅 규칙:
├── 10.0.0.0/16 → local
└── ✅ 0.0.0.0/0 → igw-0a35cbe270d81f838
```

---
### 2.4 문제 발생 메커니즘
``` text
사용자 요청 흐름:

1. DNS 조회
   └── 50% 확률로 각 IP 반환

2-A. 43.202.200.102로 연결 (50% 확률)
   └── ap-northeast-2a ALB 노드
       └── IGW 경로 있음 ✅
           └── 인터넷 응답 가능
               └── 302 정상 응답

2-B. 52.78.216.127로 연결 (50% 확률)
   └── ap-northeast-2c ALB 노드
       └── IGW 경로 없음 ❌
           └── 인터넷 응답 불가
               └── 타임아웃 발생
```

> 퍼블릭 서브넷에 인터넷 게이트웨이(IGW) 경로가 없으면, 외부 인터넷과 통신할 수 없습니다.

---
### 2.5 해결 - 라우팅 테이블 수정

**AWS 콘솔 방법**
1. VPC → Route Tables → `rtb-049b0ebae6b2ae71a` 선택
2. Routes 탭 → Edit routes
3. Add route:
   - Destination: `0.0.0.0/0`
   - Target: `igw-0a35cbe270d81f838`
4. Save changes

---
### 2.6 해결 결과

| IP 주소          | 수정 전   | 수정 후      |
| -------------- | ------ | --------- |
| 43.202.200.102 | ✅ 정상   | ✅ 정상      |
| 52.78.216.127  | ❌ 타임아웃 | ✅ 타임아웃 해결 |

---
## 3. 2차 문제 - 502 Bad Gateway

### 3.1 문제 발견

1차 문제(퍼블릭 서브넷 IGW 경로 누락)를 해결한 이후,  간헐적인 타임아웃은 사라졌지만 새로운 에러가 발생했다.
```bash
curl https://loglens.store
# 결과: 502 Bad Gateway
```

---
### 3.2 원인 분석

**HTTP 502의 의미**

> **Bad Gateway**는 ALB가 요청을 정상적으로 수신했으나, 백엔드 타겟(Target Group)으로 요청을 전달하지 못했거나 유효한 응답을 받지 못했음을 의미한다.

**인프라 구조 확인**
``` text
ALB 배치:
├── ap-northeast-2a (퍼블릭 서브넷)
└── ap-northeast-2c (퍼블릭 서브넷)

EC2 타겟:
└── ap-northeast-2a (프라이빗 서브넷) ← 한 AZ에만 존재

Cross-Zone Load Balancing: ❌ OFF (기본값)
```

---
### 3.3 당시 타겟 그룹 상태 확인

ALB가 연결하고 있는 타겟 그룹들의 헬스 상태를 확인했다.
``` bash
jenkins-tg (포트 9000):
└── ❌ UNHEALTHY (403 Forbidden)

spring-blue (포트 8080):
└── ❌ UNHEALTHY

spring-green (포트 8081):
└── ❌ UNHEALTHY (헬스체크 실패)
```
**모든 Target Group에 Healthy 상태의 타겟이 존재하지 않는 상황**이었다.

---
### 3.4 문제 발생 메커니즘
``` bash
요청 흐름:

1. 클라이언트 요청이 ALB에 도착
2. ALB 리스너 규칙에 따라 Target Group 선택
3. 선택된 Target Group 내에 Healthy Target이 없음
4. ALB가 백엔드로 요청 전달 불가 판단
5. 502 Bad Gateway 응답 반환
```

이 상태에서는 요청이 어떤 AZ의 ALB 노드로 들어오든 관계없이, **ALB가 요청을 전달할 수 있는 백엔드 자체가 존재하지 않았다.**

---
### 3.5 원인 요약

502 Bad Gateway의 직접적인 원인은 다음과 같다.
- ALB 리스너는 정상 동작
- 네트워크 및 보안 그룹 설정도 정상
- **그러나 요청이 전달된 Target Group에 Healthy Target이 0개**
- 결과적으로 ALB가 백엔드 연결에 실패

---
### 3.6 결과
- 네트워크 문제가 아닌 **타겟 그룹 헬스 상태 문제**임을 확인
- 이후 애플리케이션 상태 및 헬스체크 설정을 점검
- 정상적인 Target Group이 확보된 이후 502 에러 해소
---
## 4. 3차 문제 – 503 Service Unavailable

### 4.1 문제 재발견

2차 문제(502 Bad Gateway)의 원인이었던 타겟 그룹 헬스 상태를 점검·조치한 이후에도,  
일부 요청에서 여전히 **503 Service Unavailable** 에러가 발생했다.
```bash
curl http://43.202.200.102
# 결과: 302 Found ✅ 정상

curl -k https://52.78.216.127
# 결과: 503 Service Temporarily Unavailable ❌
```

동일한 ALB에 대한 요청임에도, 요청 방식에 따라 응답 결과가 달라지는 현상이 관찰되었다.

---
### 4.2 원인 분석

**HTTP 503의 의미**

> **Service Unavailable**은 ALB가 요청을 처리할 수 있는 **Healthy Target을 찾지 못했을 때** 반환하는 응답이다.

즉, 네트워크 단절이나 ALB 장애가 아니라 **요청이 전달된 Target Group의 상태 문제**를 의미한다.

---
### 4.3 타겟 그룹 헬스 상태 확인

각 target Group의 상태를 다시 확인했다.

```text
jenkins-tg (포트 9000):
└── ❌ UNHEALTHY (403 Forbidden)

spring-blue (포트 8080):
└── ✅ HEALTHY

spring-green (포트 8081):
└── ❌ UNHEALTHY (헬스체크 실패)
```
- `spring-blue`만 정상(HEALTHY)
- `spring-green`, `jenkins-tg`는 여전히 Unhealthy 상태

---
### 4.4 리스너 및 라우팅 규칙 분석

HTTPS(443) 리스너의 라우팅 규칙을 확인했다.
```text
HTTPS:443 리스너
├── Host: jenkins_be.loglens.co.kr
│   └── Forward → jenkins-tg ❌ (UNHEALTHY)
│
├── Host: api.loglens.co.kr
│   └── Forward → spring-blue ✅ (HEALTHY)
│
└── Default Rule
    └── Forward → spring-green ❌ (UNHEALTHY)
```

**문제 흐름은 다음과 같았다.**
```text
1. 특정 요청이 Host 기반 규칙과 매칭되지 않음
2. Default Rule 적용
3. Default Rule이 spring-green Target Group을 가리킴
4. spring-green은 Unhealthy 상태
5. ALB가 Healthy Target을 찾지 못함
6. 503 Service Unavailable 반환
```

이로 인해,
- `api.loglens.co.kr` 요청은 정상 처리
- 그 외 대부분의 요청은 **Unhealthy Target Group으로 전달되어 503 발생**
---
### 4.5 추가 조사 – AZ 및 네트워크 영향 여부 확인

503 에러가 특정 요청에서만 발생했기 때문에,  
ALB와 EC2가 서로 다른 AZ에 위치해 통신 문제가 발생한 것은 아닌지 추가로 확인했다.

**실제 인프라 구조**
```text
ALB:
├── ap-northeast-2a (퍼블릭 서브넷)
└── ap-northeast-2c (퍼블릭 서브넷)

EC2:
└── ap-northeast-2a (프라이빗 서브넷)
```
- EC2는 `ap-northeast-2a`에 위치
- ALB 역시 동일 AZ(`2a`)에 노드를 보유

→ **AZ 간 통신 여부와는 무관한 문제**임을 확인했다.

---
### 4.6 보안 그룹 검증

다음으로, 보안 그룹 설정에 의해 트래픽이 차단되고 있는지 점검했다.
#### ALB 보안 그룹
```text
loglens-sg-elb

Inbound:
├── TCP 80  ← 0.0.0.0/0
└── TCP 443 ← 0.0.0.0/0

Outbound:
└── All traffic → 0.0.0.0/0
```

#### EC2 보안 그룹
```text
loglens-server

Inbound:
├── TCP 8080 ← ALB SG (spring-blue)
├── TCP 8081 ← ALB SG (spring-green)
├── TCP 9000 ← ALB SG (jenkins)
└── TCP 22   ← bastion SG

Outbound:
└── All traffic → 0.0.0.0/0
```
- ALB → EC2 포트 접근 허용
- 인바운드 / 아웃바운드 모두 정상

→ **보안 그룹으로 인한 차단 가능성도 배제**할 수 있었다.

---
### 4.7 최종 원인 확정

추가 조사 결과를 종합한 결과, 503 에러의 원인은 다음으로 정리되었다.
```text
503 Service Unavailable의 원인:

1. spring-green (8081) 애플리케이션이 Unhealthy 상태
   └── 서비스 미기동 또는 헬스체크 실패

2. HTTPS 리스너의 기본(Default) 라우팅 규칙이
   spring-green Target Group을 가리키고 있음

3. 기본 규칙에 매칭되는 요청이
   Healthy Target이 없는 Target Group으로 전달됨
```
---
### 4.8 해결 방법

#### 4.8.1 즉시 조치 – 기본 라우팅 규칙 수정

HTTPS(443) 리스너의 기본(Default) 규칙을 항상 Healthy 상태인 Target Group으로 변경했다.
```text
HTTPS:443 리스너
├── Host: jenkins_be.loglens.co.kr
│   └── Forward → jenkins-tg
├── Host: api.loglens.co.kr
│   └── Forward → spring-blue
└── Default Rule (변경)
    └── Forward → spring-blue ✅ (HEALTHY)
```
이를 통해,  Host 규칙에 매칭되지 않는 요청도 정상 처리되도록 개선했다.

---
#### 4.8.2 추가 조치 Blue-Green 배포 자동화

수동으로 리스너 규칙을 변경하는 방식은 휴먼 에러 가능성이 높기 때문에,  
Jenkins 파이프라인을 통해 트래픽 전환을 자동화했다.

**파이프라인 주요 단계**
```groovy
// 1. 배포 대상 결정
// 2. 신규 버전 배포 (Blue 또는 Green)
// 3. 헬스체크 통과 여부 확인
// 4. ALB 리스너 규칙을 Healthy Target Group으로 자동 전환
```

**동작 흐름**
```text
배포 전:
Default Rule → spring-green (UNHEALTHY)
→ 503 발생

배포 후:
Default Rule → spring-blue (HEALTHY)
→ 200 OK
```

---
## 5. 결론
### 5.1 문제 요약 (최종)

| 문제 유형                   | 원인                                          | 해결                |
| ----------------------- | ------------------------------------------- | ----------------- |
| 간헐적 타임아웃                | 퍼블릭 서브넷 IGW 경로 누락                           | 라우팅 테이블 수정        |
| 502 Bad Gateway         | Healthy Target이 없는 Target Group으로 요청 전달     | 타겟 그룹 헬스 정상화      |
| 503 Service Unavailable | Default 라우팅 규칙이 Unhealthy Target Group을 가리킴 | 기본 규칙 변경 + 배포 자동화 |

> **본 장애는 네트워크 문제가 아닌,  
> 
> ALB 리스너 라우팅 규칙과 타겟 그룹 헬스 상태 관리 미흡으로 발생한 문제였다.**
