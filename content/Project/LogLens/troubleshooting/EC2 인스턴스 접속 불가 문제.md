## 1. 문제 상황
### 1.1 발생한 문제

AWS 콘솔에서 EC2 Instance Connect를 통해 인스턴스 접속 시도 시 다음 오류가 발생했습니다.
``` shell
Failed to connect to your instance
EC2 Instance Connect is unable to connect to your instance.
Ensure your instance network settings are configured correctly for EC2 Instance Connect.
```
**문제 증상**
- AWS 콘솔의 EC2 Instance Connect 접속 불가
- 로컬 PC의 SSH 클라이언트로도 접속 불가
- 인스턴스 자체는 Running 상태
---
### 1.2 환경 정보

**EC2 인스턴스**
- OS: Ubuntu 22.04 LTS
- 인스턴스 상태: Running
- 보안 그룹: 22번 포트 개방됨

**네트워크 설정**
- VPC: 정상
- 서브넷: 정상
- 인터넷 게이트웨이: 연결됨
---
## 2. 원인 분석

### 2.1 문제 범위 좁히기

**로컬 네트워크 문제 아님**
- AWS 콘솔에서도 접속 불가 → 로컬 PC 문제가 아님
- 다른 인스턴스는 정상 접속 → 네트워크 설정 문제가 아님

**EC2 인스턴스 내부 또는 보안 설정 문제**
- 보안 그룹, 네트워크 ACL은 정상
- 인스턴스 내부 방화벽 문제 가능성
---
### 2.2 AWS 공식 문서 확인

[AWS 공식 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-prerequisites.html)에 따르면, 다음 조건 중 하나라도 만족하지 않으면 연결 실패가 발생합니다.

| 항목             | 설명                     | 확인 결과    |
| -------------- | ---------------------- | -------- |
| **보안 그룹**      | 22번 포트 개방 여부           | ✅ 이미 개방됨 |
| **네트워크 ACL**   | 인바운드/아웃바운드 규칙          | ✅ 제한 없음  |
| **OS 방화벽**     | UFW, iptables 등 내부 방화벽 | ❓ 확인 필요  |
| **Cloud-init** | 부팅 시 자동 방화벽 설정         | ❓ 확인 필요  |

**결론**: 보안 그룹과 네트워크 ACL은 정상이므로, **내부 방화벽(UFW 또는 iptables) 설정이 SSH 연결을 차단**하고 있을 가능성이 높음

---
## 3. 문제 해결 시도

### 3.1 시도 단계

| 단계  | 조치 내용             | 결과                   |
| --- | ----------------- | -------------------- |
| 1️⃣ | EC2 인스턴스 재부팅      | ❌ 실패 (재부팅 후에도 접속 불가) |
| 2️⃣ | 보안 그룹 22번 포트 확인   | ✅ 이미 개방되어 있었음        |
| 3️⃣ | User Data 수정 후 부팅 | ✅ 성공 (방화벽 비활성화로 해결)  |

---
## 4. 해결 방법 (User Data 초기화)
### 4.1 User Data란?

**User Data**는 EC2 인스턴스가 처음 시작될 때 자동으로 실행되는 스크립트입니다.

**주요 특징**
- 인스턴스 부팅 시 자동 실행
- 루트 권한으로 실행
- Cloud-init에 의해 처리
---
### 4.2 해결 절차

**1. 인스턴스 중지 (Stop)**
```bash
# AWS 콘솔 또는 CLI
aws ec2 stop-instances --instance-ids i-xxxxxxxxx
```

**2. User Data 수정**
- EC2 콘솔에서 인스턴스 선택
- Actions → Instance Settings → Edit user data
- 아래 스크립트 입력

**3. 인스턴스 시작 (Start)**
```bash
aws ec2 start-instances --instance-ids i-xxxxxxxxx
```

---
### 4.3 User Data 스크립트
```bash
Content-Type: multipart/mixed; boundary="//"
MIME-Version: 1.0

--//
Content-Type: text/cloud-config; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="cloud-config.txt"

#cloud-config
cloud_final_modules:
- [scripts-user, always]

--//
Content-Type: text/x-shellscript; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="userdata.txt"

#!/bin/bash
ufw disable
iptables -L
iptables -F

--//
```

---
### 4.4 스크립트 구조 설명

**MIME 선언부**
```bash
Content-Type: multipart/mixed; boundary="//"
MIME-Version: 1.0
```
- 여러 종류의 파일(Cloud Config + Shell Script)을 묶어서 전달
- `//` 경계 문자로 각 블록 구분

**Cloud Config 블록**
```yaml
#cloud-config
cloud_final_modules:
- [scripts-user, always]
```
- Cloud-init 모듈 설정
- `always`: 매 부팅 시마다 사용자 스크립트 실행 (기본값은 최초 1회만)

**Shell Script 블록**
```bash
#!/bin/bash
ufw disable      # UFW 방화벽 비활성화
iptables -L      # 현재 iptables 규칙 출력 (로깅용)
iptables -F      # 모든 iptables 규칙 삭제
```

---
### 4.5 각 명령어의 역할

| 명령어           | 역할                | 효과              |
| ------------- | ----------------- | --------------- |
| `ufw disable` | UFW 방화벽 비활성화      | SSH 차단 규칙 해제    |
| `iptables -L` | 현재 iptables 규칙 확인 | 디버깅 목적 (로그에 기록) |
| `iptables -F` | 모든 iptables 규칙 삭제 | SSH 차단하는 규칙 제거  |

---
## 5. 결과 확인
### 5.1 접속 테스트

**EC2 Instance Connect (AWS 콘솔)**
```
✅ 정상 접속 확인
```

**SSH 클라이언트 (로컬 PC)**
```bash
ssh -i "key.pem" ubuntu@ec2-xx-xx-xx-xx.compute.amazonaws.com
```
```
✅ 정상 접속 확인
```

---
### 5.2 방화벽 상태 확인
```bash
# UFW 상태 확인
sudo ufw status

# 결과
Status: inactive
```
```bash
# iptables 규칙 확인
sudo iptables -L

# 결과
Chain INPUT (policy ACCEPT)
target     prot opt source               destination

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination
```
**결과**: 모든 방화벽 규칙이 초기화되어 SSH 연결이 정상적으로 열림
