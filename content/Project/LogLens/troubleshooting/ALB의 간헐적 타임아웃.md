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

라우팅 테이블 수정 후 새로운 유형의 에러가 발생했습니다.
```bash
curl https://loglens.store
# 결과: 502 Bad Gateway
```

---
### 3.2 원인 분석

**HTTP 502의 의미**

> Bad Gateway = ALB가 타겟으로부터 유효하지 않은 응답을 받았거나, 타겟에 도달할 수 없음을 의미합니다.

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
### 3.3 Cross-Zone Load Balancing 문제

**OFF 상태 (기본값) - 문제 발생**
``` text
┌─────────────────────────┐    ┌─────────────────────────┐
│  ap-northeast-2a        │    │  ap-northeast-2c        │
│  ┌──────┐               │    │  ┌──────┐               │
│  │ ALB  │               │    │  │ ALB  │               │
│  │ Node │               │    │  │ Node │               │
│  └──┬───┘               │    │  └──┬───┘               │
│     │                   │    │     │                   │
│     ↓ (자신의 AZ만)       │    │     ↓ (자신의 AZ만)        │
│  ┌─────┐ ┌─────┐        │    │   (타겟 없음)             │
│  │EC2-1│ │EC2-2│ ✅     │    │     ❌ 502 에러!          │
│  └─────┘ └─────┘        │    │                         │
└─────────────────────────┘    └─────────────────────────┘
```

**문제 발생 메커니즘**
``` text
시나리오 1: 2a AZ 노드로 요청
클라이언트 → ALB(2a) → EC2(2a) ✅ 정상 응답

시나리오 2: 2c AZ 노드로 요청
클라이언트 → ALB(2c) → ❌ 2c에 타겟 없음
                     → Cross-Zone OFF
                     → 다른 AZ 타겟 사용 불가
                     → 502 Bad Gateway
```

---
### 3.4 Cross-Zone Load Balancing이란?

**OFF 상태**: 각 ALB 노드는 자신의 AZ에 있는 타겟만 사용

**ON 상태 (권장)**: 모든 ALB 노드가 모든 AZ의 타겟 사용 가능
``` text
┌─────────────────────────┐    ┌─────────────────────────┐
│  ap-northeast-2a        │    │  ap-northeast-2c        │
│  ┌──────┐               │    │  ┌──────┐               │
│  │ ALB  │◄──────────────┼────┼─►│ ALB  │               │
│  │ Node │───────────────┼───►│  │ Node │               │
│  └──┬───┘               │    │  └──┬───┘               │
│     │                   │    │     │                   │
│     ↓                   │    │     └──────┐ (모든 AZ)   │
│  ┌─────┐ ┌─────┐        │    │            ↓            │
│  │EC2-1│ │EC2-2│ ✅     │◄───┼───────  EC2-1, EC2-2    │
│  └─────┘ └─────┘        │    │        사용 가능 ✅       │
└─────────────────────────┘    └─────────────────────────┘
```
---
### 3.5 해결 방법 - Cross-Zone Load Balancing 활성화

> ALB는 기본적으로 Load Balancer 레벨에서 Cross-Zone이 항상 켜져 있지만, **타겟 그룹 레벨에서는 별도 설정이 필요**합니다.

**AWS 콘솔 방법**

1. EC2 → Target Groups 선택
2. 문제의 타겟 그룹 선택 (spring-blue, spring-green 등)
3. Attributes 탭 클릭
4. Edit 버튼 클릭
5. Cross-zone load balancing:
   - 현재: Off 또는 Use load balancer configuration
   - 변경: On ✅
6. Save changes

---
### 3.7 해결 결과

| 설정             | 2a 노드    | 2c 노드       |
| -------------- | -------- | ----------- |
| Cross-Zone OFF | 2a 타겟만 ✅ | 타겟 없음 ❌ 502 |
| Cross-Zone ON  | 모든 타겟 ✅  | 모든 타겟 ✅ 해결  |

---

### 3.8 Cross-Zone Load Balancing 장단점

**장점**
- 고가용성 향상 (한 AZ 장애 시에도 서비스 가능)
- 트래픽 분산 개선 (모든 타겟에 균등 분산)
- 유연한 배포 (모든 AZ에 타겟 배치 불필요)

**단점**
- Cross-AZ 데이터 전송 비용 발생 ($0.01/GB)
- 약간의 지연 시간 증가 (1-2ms)
- 복잡한 장애 격리 (한 AZ 문제가 다른 AZ에 영향)
---
## 4. 3차 문제 - 503 Service Unavailable

### 4.1 문제 재발견

Cross-Zone 설정 후에도 특정 경로에서 503 에러가 발생했습니다.
```bash
curl http://43.202.200.102
# 결과: 302 Found ✅ 정상

curl -k https://52.78.216.127
# 결과: 503 Service Temporarily Unavailable ❌
```

---
### 4.2 원인 분석

**HTTP 503의 의미**

> Service Temporarily Unavailable = ALB가 요청을 처리할 healthy한 타겟을 찾지 못했음을 의미합니다.

**타겟 그룹 헬스 상태 확인**
``` text
jenkins-tg (포트 9000):
└── ❌ UNHEALTHY (403 Forbidden)

spring-blue (포트 8080):
└── ✅ HEALTHY

spring-green (포트 8081):
└── ❌ UNHEALTHY (헬스체크 실패)
```

---
### 4.3 ALB 리스너 라우팅 규칙 확인
``` text
HTTPS:443 리스너:
├── Host: jenkins_be.loglens.co.kr
│   └── Forward to: jenkins-tg ❌ (UNHEALTHY)
│
├── Host: api.loglens.co.kr
│   └── Forward to: spring-blue ✅ (HEALTHY)
│
└── Default (기본 규칙) ← 🚨 여기가 문제!
    └── Forward to: spring-green ❌ (UNHEALTHY)
```

**문제 흐름**
``` text
1. 대부분의 요청 → 기본 규칙 매칭
   (jenkins_be, api 외의 모든 요청)

2. 기본 규칙 → spring-green (8081)
   └── spring-green이 UNHEALTHY 상태

3. ALB → healthy한 타겟 없음
   └── 503 Service Temporarily Unavailable 반환
```

---
### 4.4 왜 한 IP는 정상이고 한 IP는 503인가?
``` text
43.202.200.102 노드: 
└── 네트워크 경로 안정적 → 일부 요청 정상

52.78.216.127 노드: 
└── 네트워크 경로 불안정 + unhealthy 타겟 
    → 503 에러 발생
```
---
### 4.5 추가 조사 - AZ 위치 확인

EC2가 다른 AZ에 있어서 Cross-AZ 통신 문제가 발생하는 것 아닐까?

**실제 구조**
``` text
ALB:
├── ap-northeast-2a (퍼블릭 서브넷)
└── ap-northeast-2c (퍼블릭 서브넷)

EC2:
└── ap-northeast-2a (프라이빗 서브넷)

결론: 같은 AZ였음! Cross-AZ 문제가 아니었다!
```

---
### 4.6 보안 그룹 검증

**ALB 보안 그룹**
``` text
loglens-sg-elb:

Inbound:
├── TCP 80  ← 0.0.0.0/0 ✅
└── TCP 443 ← 0.0.0.0/0 ✅

Outbound:
└── All traffic → 0.0.0.0/0 ✅
```

**EC2 보안 그룹**
``` text
loglens-server:

Inbound:
├── TCP 8080 ← ALB SG ✅ (spring-blue)
├── TCP 8081 ← ALB SG ✅ (spring-green)
├── TCP 9000 ← ALB SG ✅ (jenkins)
└── TCP 22   ← bastion SG ✅

Outbound:
└── All traffic → 0.0.0.0/0 ✅

결론: 보안 그룹 설정은 완벽함!
```
---
### 4.7 최종 원인 특정
``` text
503 에러의 진짜 원인:

1. spring-green (8081) 애플리케이션 문제
   └── 서비스 다운 또는 헬스체크 실패

2. ALB 기본 라우팅 설정 오류
   └── 대부분의 요청이 unhealthy한 타겟으로 전달

3. 타겟 그룹 "unused" 상태
   └── spring-green 타겟 그룹이 제대로 구성되지 않음

네트워크는 정상! 애플리케이션 레벨 문제!
```
---
### 4.8 해결 방법

**1. 즉시 조치 - 기본 라우팅 변경**
``` text
HTTPS:443 리스너:
├── Host: jenkins_be.loglens.co.kr
│   └── Forward to: jenkins-tg
│
├── Host: api.loglens.co.kr
│   └── Forward to: spring-blue
│
└── Default (기본 규칙) ← 변경!
    └── Forward to: spring-blue ✅ (HEALTHY)
```

**2. 자동화 조치 - Jenkins Blue-Green 배포 파이프라인**

수동으로 매번 ALB 규칙을 변경하는 것은 번거롭고 휴먼 에러가 발생할 수 있습니다. Jenkins 파이프라인을 통해 이 과정을 자동화했습니다.

**Jenkins 파이프라인 주요 단계**
```groovy
// 1. 배포 대상 결정
stage('Determine Target Environment') {
    // Blue가 실행 중이면 Green에 배포
    // Green이 실행 중이면 Blue에 배포
}

// 2. 새 버전 배포
stage('Deploy New Version') {
    // 새로운 컨테이너 실행 (Blue 또는 Green)
}

// 3. 헬스체크
stage('Health Check') {
    // 새 버전이 정상 작동하는지 확인
}

// 4. 트래픽 전환 (핵심!)
stage('Switch Traffic') {
    // ALB 규칙을 새 버전(HEALTHY)으로 자동 변경
}
```

**트래픽 전환 자동화 핵심 코드**
```groovy
stage('Switch Traffic') {
    steps {
        script {
            sh """#!/bin/bash
                # 배포 대상에 따라 Target Group 결정
                if [ "${env.DEPLOY_TARGET}" = "blue" ]; then
                    TG_NAME="\${BLUE_TG}"
                else
                    TG_NAME="\${GREEN_TG}"
                fi
                
                # Target Group ARN 조회
                TG_ARN=\$(aws elbv2 describe-target-groups \
                    --names "\$TG_NAME" \
                    --query 'TargetGroups[0].TargetGroupArn' \
                    --output text \
                    --region \${AWS_REGION})
                
                # ALB Listener 규칙 수정
                aws elbv2 modify-rule \
                    --rule-arn "\${ALB_RULE_ARN}" \
                    --actions Type=forward,TargetGroupArn="\$TG_ARN" \
                    --region \${AWS_REGION}
            """
        }
    }
}
```

**작동 방식**
``` text
배포 전 상태:
Default Rule → spring-green (8081) ❌ UNHEALTHY
→ 503 Service Unavailable

Jenkins 파이프라인 실행:
1. Blue 환경에 새 버전 배포 (8080)
2. Health Check 통과 확인
3. AWS CLI로 ALB 규칙 자동 변경:
   - ALB_RULE_ARN의 대상을 spring-blue로 변경
4. Old Environment (green) 정리

배포 후 상태:
Default Rule → spring-blue (8080) ✅ HEALTHY
→ 200 OK
```

---
## 5. 결론

### 5.1 문제 요약

| 문제 유형                   | 원인                            | 해결                    |
| ----------------------- | ----------------------------- | --------------------- |
| 간헐적 타임아웃                | 퍼블릭 서브넷 IGW 경로 누락             | 라우팅 테이블 수정            |
| 502 Bad Gateway         | Cross-Zone Load Balancing 미설정 | 타겟 그룹별 Cross-Zone 활성화 |
| 503 Service Unavailable | Unhealthy 타겟 + 잘못된 기본 라우팅     | 기본 규칙 변경 + 애플리케이션 수정  |


