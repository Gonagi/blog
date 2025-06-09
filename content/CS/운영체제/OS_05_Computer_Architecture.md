# Contents
- ## 병목 현상
- ## 컴퓨터 시스템의 일반적인 구조
- ## I/O Device Basic Concepts
	- ### Event Handling Mechanisms
		- #### Interupt
		- #### Trap
	- ### I/O 처리 기법
		- #### Polling
		- #### Direct Memory Access (DMA)
			- DMA-Read
			- DMA-Write
	- ### I/O Device Access 기법
		- #### I/O Instruction
		- #### Memory Mapped I/O
---
# 1. 병목 현상
## Bus
- CPU, RAM, I/O 장치 간 데이터가 전송되는 통로
	- Data 버스, Address 버스
## 병목 현상
- 같은 버스에 연결된 디바이스들 사이의 속도 차이로 인해 발생
- CPU > Memory >> I/O 로 속도의 격차가 커짐
  ![left|400](https://i.imgur.com/2vppxc5.png)
- 빠른 디바이스가 처리하는 양 만큼을 느린 디바이스가 처리하지 못함
	- 전체 시스템 속도는 느린 디바이스 속도로 제한 됨
  ![left|400](https://i.imgur.com/E3liB0i.png)
- CPU는 초당 5 단위의 일을 처리할 수 있는데, 메모리가 초당 3 단위의 일만을 전달해 줄 수 있다고 할 때, 전체 시스템 속도는 메모리의 속도로 제한된다.
---
# 2. 컴퓨터 시스템의 일반적인 구조
## 단일 Bus 구조
### 단일 Bus
![left|500](https://i.imgur.com/JlOmJgJ.png)
- **CPU, Memory, I/O 장치가 하나의 버스를 공유**한다.
- 초창기 컴퓨터(CPU, Memory, I/O 속도가 비슷하던 시절)에는 충분했지만, 현재는 속도 차이로 인해 **병목 문제**가 자주 발생한다.
- **동시 접근 불가**
	- 한 장치가 버스를 점유하면, 다른 장치는 기다려야 한다.

---
## 계층적 버스 구조
### 세분화된 버스 채용
- 시스템을 **여러 버스 계층**으로 나누어 **동시 처리량을 향상**시킨다.
- CPU Local Bus, Memory Bus, PCI Bus, ...
### 이중 버스
![left|500](https://i.imgur.com/TBxTxEa.png)
- CPU와 IO 속도 격차로 인한 병목 현상을 해결하고자 한다.
- 빠른 CPU와 메모리는 시스템 버스에 연결한다.
- I/O/ 장치는 I/O 버스에 연결한다.
---
# 3. I/O Device Basic Concepts
> 실제 I/O 장치의 하드웨어적 구성 요소에 대한 설명
## 3.1. Device Registers
- 하드웨어 장치는 일반적으로 4종류의 Register를 가짐
  - Control Register: 장치 제어 명령 저장
  - Status Register: 장치의 현재 상태 정보
  - Input Register: 장치에서 받은 데이터 저장
  - Output Register: 장치로 보낼 데이터 저장
- Register들은 메인 메모리의 일부 영역에 Mapping됨
  - Mapping된 영역의 주소만 알면, CPU에서 접근 가능
## 3.2. I/O Controller
- 역할: High-Level의 I/O 요청을 Low-Level Machine Specific Instruction으로 해석하는 회로
- 장치와 직접 상호작용(중개자 역할)
- 예시: SATA 컨트롤러, USB 컨트롤러, 네트워크 컨트롤러 등
---
# 4. Basic HW Mechanisms
> CPU와 I/O 장치가 데이터를 주고받는 기본적인 하드웨어 동작 방식
## 4.1 Event Handling Mechanisms
> CPU가 외부 또는 내부 이벤트에 반응하는 방식
- **Interrupt**: I/O 장치가 준비되면 하드웨어 신호를 통해 CPU에 알려줌 (비동기적)
- **Trap**: 프로그램 내부에서 예외 상황 또는 시스템 콜이 발생하면 CPU가 직접 발생시킴 (동기적)
## 4.2 I/O 처리 기법 (How to process I/O data)
> I/O 요청이 발생했을 때 데이터를 어떻게 처리할 것인가?
- **Polling**: CPU가 장치 상태를 계속 확인(polling loop)
- **Direct Memory Access (DMA)**: 전용 하드웨어가 메모리 ↔ I/O 장치 간 데이터를 직접 전송
## 4.3 I/O Device Access 기법 (How CPU accesses devices)
> CPU가 I/O 장치를 어떻게 제어하고 데이터를 주고받는가?
- **I/O Instruction 방식**: CPU가 특수한 명령어(IN, OUT)로 장치를 제어 (주소 공간 분리)
- **Memory Mapped I/O 방식**: I/O 장치를 메모리 주소 공간에 포함시켜 접근 (메모리처럼 read/write)
---
# 4.1 이벤트 처리 기법
## 4.1.1 Interrupt
![|500](https://i.imgur.com/oSIjhC0.png)
- ### 비동기적 이벤트를 처리하기 위한 기법
	- E.g., 네트워크 패킷 도착 이벤트, I/O 요청
- ### Interrupt 처리 순서
	1. Interrupt Disable
	2. 현재 실행 상태 (State)를 저장
	3. ISR (Interrupt Service Routine)으로 jump
	4. 저장한 실행 상태(State)를 복원
	5. 인터럽트로 중단된 지점부터 다시 시작
- ### Interrupt에는 우선 순위가 있으며, H/W 장치마다 다르게 설정된다.
- ### Note
	- ISR은 짧아야 한다.(너무 길면 다른 Interrupt 들이 처리되지 못한다.)
	- Time Sharing은 Timer Interrupt의 도움으로 가능하게 된 기술이다.
---
## 4.1.2 Trap
![](https://i.imgur.com/20qtAbg.png)
- ### 동기적 이벤트를 처리하기 위한 기법
	- E.g., Divide by Zero 와 같은 프로그램 에러에 의해 발생
	- Trap handler에 의해 처리
	- Trap Service Routine이 있기 때문에 Interrupt와 유사하지만, Interrupt와 달리 **실행 상태(state)를 저장/복원 하지 않음**(동기적인 이벤트이기 떄문)
---
## 4.1.3 Intel x86 아키텍처의 인터럽트와 예외 처리 메커니즘
### 4.1.3.1 개념적 계층 구조
x86 아키텍처에서는 **인터럽트**와 **예외**를 포괄적으로 **이벤트(Event)** 라고 부르며, **IDT(Interrupt Descriptor Table)** 를 공유한다.

| 구분        | 인터럽트(Interrupt)          | 예외(Exception)      |
| --------- | ------------------------ | ------------------ |
| **발생 원인** | 외부 장치/소프트웨어 의도적 호출       | CPU 명령어 실행 중 오류 감지 |
| **동기성**   | 비동기적(하드웨어) 또는 동기적(소프트웨어) | 동기적(명령어 실행과 직결)    |
### 4.1.3.2 Interrupt 세부 유형
- #### Hardware Interrupt
	- **외부 장치(예: 키보드, 네트워크 카드, 디스크 컨트롤러 등)** 가 CPU에 직접 신호를 보냄.
	- **비동기적**으로 발생 (CPU가 예측할 수 없음)
- #### Software Interrupt(Trap)
	- 소프트웨어가 **의도적으로 인터럽트를 발생**시킴.
	- **동기적**으로 발생
### 4.1.3.3 Exception 세부 메커니즘

| 유형    | 처리 후 복귀 위치    | 대표 사례                        |
| ----- | ------------- | ---------------------------- |
| Fault | **원 명령어 재실행** | #PF(페이지 폴트), #DE(0으로 나누기)    |
| Trap  | 다음 명령어 진행     | Breakpoint(`int3`), Overflow |
| Abort | 프로세스 강제 종료    | Machine Check Error          |

---
## 4.2 I/O 처리 기법
### 4.2.1 Polling
### 4.2.2 Direct Memory Access(DMA)



# 출처
- 숭실대학교 공영호 교수님 운영체제