# 운영체제란 무엇인가?
## 하드웨어를 쉽고 효율적으로 사용하게하는 Abstraction을 제공한다.
### CPU → Process
- Process별로 Address Space가 분리되어 있다.
### Memory → Address Space
### Disk → File
### Network → Port
## 자원의 공유 및 분배를 위한 Policy를 결정한다.
- Policy의 예 : [[Paging]]의 페이지 교체 알고리즘
- 설계 결정 (Design Decisions)이 중요
	- 데이터 센터, 스마트폰에 사용되는 Policy가 다르다.
---
# Abstraction은 왜 필요한가?
![](https://i.imgur.com/LSDX4QU.png)
## Process
### Program
- 컴퓨터를 실행시키기 위한 일련의 순차적으로 작성된 명령어의 모음
- 컴퓨터 시스템의 Disk와 같은 Secondary Storage에 바이너리 형태로 저장되어 있다.
	- Primary memory(주기억장치)는 RAM처럼 CPU가 직접 접근 가능한 메모리를 말하며, Secondary memory(보조기억장치)는 HDD, SSD, USB, CD, DVD, 플래시 메모리 등을 포함한다.
### Process
- ==실행==되고 있는 프로그램의 추상화(Abstraction)
- process는 ==Disk==에 저장된 ==프로그램으로부터 변환되어 메모리로 로딩==된다.
- Program Counter, Stack, Data Section으로 구현된다.
	- PC(Program Counter)는 Process별로 몇번째 명령어에 접근하는지를 나타낸다. 
	- PC가 없으면 몇번째 명령어를 실행중인지 알 수 없고 동적으로 관리하기 어렵다.
### 흐름![](https://i.imgur.com/fSuokLR.png)![](https://i.imgur.com/wuvBrUU.png)![](https://i.imgur.com/Qkk47a1.png)
![](https://i.imgur.com/RFJqeOp.png)
### 필요한 이유
![left|400](https://i.imgur.com/BICm73N.png)
- CPU와 같은 Hardware Component로 하여금 각 Program을 구분하여 인식, 실행하게 한다.
- Program이 분리되어야 서로 데이터 유출이 안된다
## Address Space
### Process가 차지하는 ==메모리 공간==                                                                                       ![left|500](https://i.imgur.com/6g16rEX.png)
### 필요한 이유
- Protection Domain
	- 운영체제가 Address space를 분리해 상관없는 Process가 접근하지 못하게 관리한다.(서로의 공간 침범 X)
		- 실행 context의 보호
		- privacy Issue
- I/O Device의 관리
	- GPU, 마우스, 키보드, ...
## File
### Process에서 읽고 쓸 수 있는 ==Persistent Storage==
- Persistent : 없어지지 않는, 남아있는
![](https://i.imgur.com/jkAXAvf.png)
- 실제 저장되는 위치를 Process는 알지 않음
### 필요한 이유
- 어디까지가 Binary Data이고 해당 Binary Data가 어디에 저장되어 있는지 관리/유지 필요
## Port
### 컴퓨터 시스템이 메시지를 주고 받는 Communication Endpoint
![](https://i.imgur.com/FNIMr0m.png)
- Network를 통해 내부시스템, 외부시스템끼리 정보를 주고 받는다.
- 특정 Process와 통신할 수 있도록 Network를 제공한다.
### 필요한 이유
- 어떤 Process가 통신의 대상인지 구분해야 한다.
- Privacy Issue
---
# Policy는 왜 필요한가?
## 현재 운영체제가 쓰이는 영역
- PC(Personal Computer) → 성능
- Server & Data Center → 성능
- Smartphone → 성능 + 배터리 소모
- 자동차 → 안전(시간안에 반드시 처리)
- 원자력 발전소 → 안전
- IoT Systems(TV, 냉장고, 청소기, ...) → Privacy
## 필요한 이유
### 성능![](https://i.imgur.com/1xN9zz5.png)
- 빠른 Device에 고사양 Process 배치, 느린 Device에 저사양 Process 배치
### 성능 + 에너지
- 배터리 소모
	- 사용하지 않는 Program 및 Hardware Resource 종료
### 안전![](https://i.imgur.com/EI3750j.png)
---
## Software의 구분
### System Software
- 컴퓨터 시스템을 구동시키는 SW
- OS, Compiler, Assembler, Interpreter
### Application Software
- 특정 용도로 사용된다.
- Word, Internet Explorer, Game, ...
- 매우 다양한 응용프로그램이 존재한다.
## Application과 비교한 운영체제의 특징
### OS는 항상 동작한다.
### Supervisor Mode(통제 기능)으로서, 항상 자원의 관리, 감시 활동을 한다.
- 어떤 Process가 자원을 사용하고 있는지
- 어떤 Process에 어떤 자원을 할당할 것인지
### 하드웨어에 대한 제어 기능을 한다.
- Device Driver
	- 하드웨어를 OS가 완전히 제어할 수 있게 한다.
## OS와 Kernel에 대한 두 가지 관점
### OS == Kernel
### OS == Kernel + GUI + Library
- #### Kernel                                                                                  
	![|400](https://i.imgur.com/UWeQ3dW.png)
	- 운영체제의 핵심 부분으로, 자원 할당, 하드웨어 인터페이스(스케줄링을 어떻게 할것인가), 보안(보안 단계를 어떻게 할것인가) 등을 담당한다.
	- C, C++, 어셈블리어 코드로 이루어져 있다.
	- ##### 흐름
		1. 어플리케이션 요청
			- 어플리케이션은 시스템 콜(System Call)을 통해 커널에 특정 작업(예: 파일 읽기, 데이터 출력)을 요청.
		2. 커널이 장치 드라이버 호출
		    - 커널은 요청받은 작업이 특정 하드웨어와 관련이 있다면, 해당 ==장치 드라이버==에 요청을 전달.
			    - 예: 디스크 파일 읽기 → 디스크 드라이버 호출.
		3. 장치 드라이버가 하드웨어와 통신
		    - 장치 드라이버는 하드웨어의 레지스터를 직접 제어하거나, 입출력(I/O) 명령을 통해 하드웨어와 상호작용.
			    - 예: 데이터를 디스크에서 읽어 메모리로 전달.
		4. 결과 반환
		    - 장치 드라이버는 작업 결과를 커널로 전달.
		    - 커널은 해당 결과를 어플리케이션으로 반환.
- #### GUI
	- 그래픽 사용자 인터페이스
		- iOS, Android
- #### Library
	- 자주 사용되는 함수들의 집합
		- libc, win32.dll
## Relation of Hardware, OS, and Application
![|400](https://i.imgur.com/gJ9iN6c.png)

---
# 출처
- 숭실대학교 공영호 교수님 운영체제
- 숭실대학교 이정현 교수님 시스템 보안