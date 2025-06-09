# Privilege Level (PL)
![left|600](https://i.imgur.com/qWdDJ4S.png)
- x86 프로세서에서는 원래 4개의 **링 구조**를 지원한다.
- 윈도우, 리눅스 등 대부분 OS에서는 호환성을 위해 **커널 모드(PL = 0)와 사용자 모드(PL = 3)만 사용한다.**
	- 윈도우나 리눅스가 x86 프로세서만 동작하는 OS가 아니다.
	- 2개의 링 구조를 지원하는 프로세서도 있다.
## Privilege Level 종류
![left|500](https://i.imgur.com/3QVwlLq.png)
### CPL(Current Privilege Level)
- 현재 실행중인 프로세스의 PL
- code segment register의 PL
### RPL (Requested Privilege Level)
- 타겟 세그먼트의 PL
### DPL (Descriptor Privilege Level)
- 메모리를 차지하고 있는 타겟 세그먼트의 PL
- Descriptor 생성 시 설정
---
![](https://i.imgur.com/cqtkcyh.png)

---
# Segmentation Fault 
## 1. 범위를 벗어난 경우
## 2. r, rw, ... 등 권한 오류
## 3. Privilege Level Checking 위반

![](https://i.imgur.com/qeOp5eM.png)
![](https://i.imgur.com/VITHuMe.png)
![](https://i.imgur.com/KLiqwyY.png)