## 1. 개요
### 1.1 네트워크 구조

**서버 구성**
- **Bastion Host**: `bastion.loglens.co.kr` (퍼블릭 접근 가능)
- **Private Server**: `loglens-server.home` (Bastion을 통해서만 접근 가능)
- **인증 방식**: SSH 키 (`loglens306.pem`)
---
### 1.2 접속 흐름
``` text
로컬 PC → Bastion Host (bastion.loglens.co.kr) → Private Server (loglens-server.home)
```

Bastion Host를 점프 서버로 사용하여 Private 서버에 접속합니다.

---
## 2. CLI로 접속하기

### 2.1 SSH 키 준비
```bash
# SSH 키 파일을 ~/.ssh 디렉토리로 이동
mkdir -p ~/.ssh
mv loglens306.pem ~/.ssh/

# 키 파일 권한 설정 (필수)
chmod 600 ~/.ssh/loglens306.pem
```

**주의**: SSH 키 파일의 권한이 너무 개방적이면 SSH 접속이 거부됩니다. 반드시 `600` 권한으로 설정해야 합니다.

---
### 2.2 SSH Config 파일 생성

**파일 위치**: `~/.ssh/config`
```bash
# Bastion Host (점프 서버)
Host bastion
    HostName bastion.loglens.co.kr
    User ubuntu
    IdentityFile ~/.ssh/loglens306.pem

# Private Server (최종 목적지)
Host loglens-server
    HostName loglens-server.home
    User ubuntu
    IdentityFile ~/.ssh/loglens306.pem
    ProxyJump bastion  # Bastion을 거쳐서 접속
```
**설명**
- `Host`: SSH 접속 시 사용할 별칭
- `HostName`: 실제 서버 주소
- `ProxyJump`: Bastion을 거쳐 접속하도록 설정

---
### 2.3 Config 파일 권한 설정
```bash
chmod 600 ~/.ssh/config
```

---

### 2.4 접속 명령어
```bash
# Bastion 호스트 접속
ssh bastion

# Private 서버 접속 (Bastion을 자동으로 거쳐서 접속)
ssh loglens-server
```
**결과**: `ssh loglens-server` 명령어 하나로 Bastion을 자동으로 거쳐 Private 서버에 접속됩니다.

---
## 3. Visual Studio Code에서 접속하기

### 3.1 확장 프로그램 설치

**Remote - SSH 설치**
- VSCode 실행
- 확장 프로그램 검색: `Remote - SSH`
- Microsoft의 **Remote - SSH** 설치

---
### 3.2 SSH Config 등록

**Config 파일 열기**
- `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`)
- `Remote-SSH: Open SSH Configuration File...` 선택
- `~/.ssh/config` 파일 선택
- 위에서 작성한 config 내용이 표시됨

---
### 3.3 서버 접속

**접속 절차**
- `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`)
- `Remote-SSH: Connect to Host...` 선택
- `loglens-server` 선택
- 자동으로 Bastion을 거쳐 Private 서버에 접속

---
### 3.4 폴더 열기

**작업 디렉토리 열기**
- 접속 후 `파일 > 폴더 열기`
- 원격 서버의 작업 디렉토리 선택 (예: `/home/ubuntu`)

VSCode에서 원격 서버의 파일을 로컬처럼 편집할 수 있습니다.

---
## 4. MobaXterm 설정 (Windows)

### 4.1 기본 SSH 설정

**Session 생성**
- MobaXterm 실행
- `Session` → `SSH` 선택
- 기본 정보 입력:
  ![](https://i.imgur.com/cfVvgvx.png)
  - **Remote host**: `loglens-server.home`
  - **Specify username**: 체크, `ubuntu` 입력
  - **Port**: `22`
---
### 4.2 Advanced SSH Settings

**인증 키 설정**
- `Advanced SSH settings` 탭 클릭
- `Use private key` 체크
- 키 파일 경로: `C:\Users\[사용자명]\.ssh\loglens306.pem`
  - Windows 경로 형식으로 입력
---
### 4.3 Network Settings (Jump Host 설정)

**Jump Host 추가**
- `Network settings` 탭 클릭
- `Connect through SSH gateway (jump host)` 체크
- Gateway 정보 입력:
  ![](https://i.imgur.com/drlQkDk.png)
  - **Gateway host**: `bastion.loglens.co.kr`
  - **Username**: `ubuntu`
  - **Port**: `22`
  - **Use SSH key**: 체크
  - **SSH key path**: `C:\Users\[사용자명]\.ssh\loglens306.pem`

이 설정으로 MobaXterm이 자동으로 Bastion을 거쳐 Private 서버에 접속합니다.

---
## 5. 접속 확인

### 5.1 접속 테스트

**CLI에서 확인**
```bash
ssh loglens-server
```

**성공 시 출력**
``` shell
Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-1234-aws x86_64)

ubuntu@loglens-server:~$
```

---
### 5.2 연결 흐름 확인

**verbose 모드로 접속**
```bash
ssh -v loglens-server
```

**출력 예시**
``` text
debug1: Connecting to bastion.loglens.co.kr [x.x.x.x] port 22.
debug1: Connection established.
debug1: Entering interactive session.
debug1: Connecting to loglens-server.home [x.x.x.x] port 22.
debug1: Connection established.
```
Bastion을 거쳐 Private 서버에 접속되는 과정을 확인할 수 있습니다.
