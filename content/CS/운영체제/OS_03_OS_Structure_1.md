# Contents
- ## System Structure
- ## OS Design Principle
	- ### Policy
	- ### Mechanism
- ## Methods for Operating System Desgin
	- ### Layering
	- ### Modularity
- ## Kernel Designs
	- ### Monolithic Kernel
	- ### Micro Kernel
	- ### Hypervisor
---
# 1. System Structure
## System Structure(시스템 구조)
- ### 운영체제는 규모가 매우 크고 복잡한 소프트웨어
	- 설계시 ==소프트웨어의 구조==를 신중히 고려해야 한다.
	- 구조적 설계 없이는 유지보수, 수정, 확장이 어렵다.
- ### 좋은 설계를 통해 쉬워지는 것들
	- 개발(develop)
		- 구조가 잘 잡혀 있으면, 각 구성요소의 명세가 명확해진다.
	- 수정 및 디버깅(Modify and Debug)
		- 모듈 단위로 분리돼 있으면 특정 기능(Input/Output, ...)이 기대한 대로 동작하는지 쉽게 확인이 가능해진다.
	- 유지보수
		- 변경이 필요한 부분만 수정할 수 있어 유지보수가 쉬워진다.
	- 확장(Extend)
		- 새로운 기능 추가나 버전 업데이트가 쉬워진다.
- ### 디자인 목표 중에 좋은 것이란?
	- 설계하고자 하는 ==시스템의 목적==과 관계가 있음 (빠른 반응성, 높은 보안성, 저전력, 다양한 하드웨어 지원, ...)
---
# 2. OS Design Principle
## OS Design Principle(운영체제 설계 원칙)
- ### Policy : ==무엇==이 되게 할 것인가?
	- **운영체제가 지향하는 목표, 전략**
		- 어떤 프로세스에 CPU를 먼저 줄것인가?
		- 어떤 순서로 메모리 할당을 할것인가?
	- Mechanism보다 추상화 수준이 높으며, Mechanism을 활용해 구현된다.
- ### Mechanism : 무엇을 ==어떻게== 할것인가?
	- **Policy를 구현하기 위한 수단, 도구**
	- 실제 동작 방식, 인터페이스
	- Policy를 만족시키기 위해 어떤 Mechanism을 쓸 것인가?
	- Policy를 잘 해석해서 적절한 Mechanism을 쓴다.
- ### Mechanism과 Policy를 분리 함으로서, 운영체제 설계를 보다 Module 화 할 수 있음
	- Policy, Mechanism을 분리하면서 운영체제 설계를 Module화 하게되면서 개발이 용이해진다.
	- 모듈화된 구조는 **테스트, 유지보수, 교체**가 쉽다.
---
# 3. Methods for Operating System Desgin
## Layering
- ### OS의 복잡도를 낮추기 위한 방안
	- 다양한 하드웨어/소프트웨어와 상호작용하는 복잡한 운영체제를 ==계층(Layer)==로 나누어 설계하면, **가독성, 유지보수성, 확장성**이 좋아진다.
- ### Layer는 정의가 명확한 (Well-Defined) 함수들로 이루어짐
- ### 하나의 Layer는 ==인접한 Layer와만 통신한다.==
	- 위, 아래에 인접한 Layer와만 통신하며, 2단계 이상 건너뛴 Layer와 직접적으로 통신하지 않는다.
  ![](https://i.imgur.com/JJEUvsS.png)
- ### 레이어 수가 너무 많으면, 시스템 오버헤드가 증가하게 된다.
	- 7-Layers of the OSI Model
	- 레이어 수가 너무 많으면 함수 호출이 중첩되고 오버헤드가 커진다.(간단한 파일 읽기 작업도 여러 계층을 거쳐야 하므로 성능 저하가 있을 수 있다.)
---
## Layering 장점
- ### 모듈화(Modularity)
	- 모듈화를 적용하면, 각 계층은 오직 자신보다 하위 계층의 기능(연산)과 서비스만을 사용하도록 계층이 구성된다. 
	- 각 Layer는 **기능이 명확히 분리**(==독립==)되어 있어, 다른 Layer에 영향을 주지 않고 변경 가능하다.
	- 유지보수와 테스트가 쉽다.
- ### 추상화(Abstraction)
	- 위에 있는 Layer는 아래 Layer의 **세부 구현을 몰라도 사용 가능**하다.
		- 애플리케이션은 시스템 콜이 내부에서 어떻게 메모리나 디스크를 관리하는지 몰라도 사용 가능
- ### 재사용성
	- 동일한 하위 Layer를 **다른 상위 Layer에서도 재사용** 가능
  ![|500](https://i.imgur.com/0qKXSwt.png)
---
## 커널 내의 모듈들
![](https://i.imgur.com/aNNAPHF.png)
- 리눅스 커널은 **기능 단위의 모듈**들로 구성되어 있다.
- 커널은 하드웨어를 직접 제어 하지 않고, **컨트롤러 모듈(디바이스 드라이버)** 에 명령을 전달하고 상태를 주고 받는다.
- ### 일반적인 커널의 구조 
	![left|300](https://i.imgur.com/rKYA2Jo.png)
---
## User Mode와 Kernel Mode
- ### CPU의 2가지 이상 실행 모드
	- System Protection을 위해서 필요하다.
		- 실행 Moded의 권한에 따라, 접근할 수 있는 메모리, 실행 가능한 명령어가 제한된다.
	- 각각의 ==Mode 별로 권한(Privilege Level, PL)이 설정 된다.==
	- Hardware 지원이 필요하다.
		- x86 프로세서(Intel) - Ring 0 ~ 3, 4개의 Mode 제공
		- 그 외 프로세서(윈도우, 리눅스) - 2개의 Mode 제공
		 ![left|400](https://i.imgur.com/qWdDJ4S.png)
			- 호환성을 위해 커널 모드(PL=0)와 사용자 모드(PL3)만 사용한다.
- ### Kernel Mode
	- 모든 권한을 가진 실행 Mode
	- 운영체제가 실행되는 Mode
	- Privilege 명령어 실행 및 레지스터 접근 가능
		- I/O 장치 제어 명령어, Memory Management Register - CR3
- ### User Mode
	- Kernel Mode에 비해 낮은 권한의 실행 Mode
	- 어플리케이션이 실행되는 Mode
	- Privilege 명령어 실행 불가능 ([[CS/시스템 보안/Segment Protection\|Segment Protection]])
- ### 실행 Mode 전환(Execution Mode Switch)
	- User Mode에서 실행 중인 Application이 Kernel Mode의 권한이 필요한 서비스를 받기 위한 방법이 필요하다.
---
## 시스템 콜
- ### User Mode에서 Kernel Mode로 ==진입==하기 위한 통로
	- Kernel에서 제공하는 Protected 서비스를 이용하기 위해 필요하다.
		- `open()` : file 또는 device 열기
		- `write()` : file 또는 device에 데이터 쓰기
		- `msgsnd()` : 메시지 큐를 통한 IPC
		- `shmat()` : 공유 메모리 attach
	- Linux에서는 모든 자원들을 **파일**처럼 다룬다.
		- file, device, socket, pipe 모두 file로 추상화되어 있다.
		- 직접 시스템 콜을 쓰기 보다 Library화된 코드를 주로 쓴다.
  ![](https://i.imgur.com/HPWDDot.png)
---
# 4. Kernel Designs
## Monolithic Kernel
![left|500](https://i.imgur.com/f8iRroX.png)
- ### 특징
	- Kernel의 모든 Service가 ==같은 주소 공간==(Address Space)에 위치한다.
	- 어플리케이션은 자신의 주소 공간에 커널 코드 영역을 매핑하여 커널 서비스를 이용한다.
	- H/W 계층에 관한 ==단일한== Abstraction을 정의한다.
		- 이를 사용하기 위해, 라이브러리나 어플리케이션에게 ==단일한== 인터페이스를 제공한다.
			![left|300](https://i.imgur.com/3tWOyok.png)
- ### 장점
	- 어플리케이션과 모든 Kernel 서비스가 같은 주소 공간에 위치하기 때문에, 시스템 콜 및 Kernel 서비스 간의 데이터 전달 시 Overhead가 작다.
		- 함수 호출 비용이 낮다.
		- 시스템 콜 이후 커널 내부 처리가 빠르다.
- ### 단점
	- 모든 서비스 모듈이 하나의 바이너리로 이루어져 있기 떄문에 **일부분의 수정이 전체에 영향을 미친다.**
	- 각 모듈이 유기적으로 연결되어 있기 때문에 Kernel 크기가 커질수록 유지/보수가 어렵다.
		- 모듈 간 결합도가 높다.
	- 한 모듈의 버그가 ==시스템 전체에 영향을 끼친다.==
---
## Micro Kernel
![](https://i.imgur.com/Ub1tutO.png)
- ### 특징
	- Kernel Service를 ==기능에 따라 모듈화 하여== 각각 ==독립된 주소 공간==에서 실행한다.
	- 이러한 모듈을 ==서버==라 하며, **서버들은 독립된 프로세스로 구현된다.**
	- Micro Kernel은 서버들간의 통신 (**IPC**)(어플리케이션의 서비스 콜 전달과 같은 단순한 기능만을 제공한다.)
		- Micro Kernel은 복잡한 커널 기능을 직접 처리하지 않고, 최소한의 역할(IPC, 스케줄링 등)만 수행한다.  
		- 커널 서비스 요청은 Micro Kernel을 통해 외부 서버에 전달되며, 서버들은 IPC로 통신하며 기능을 분담한다.
- ### 장점
	- 각 Kernel 서비스가 따로 구현되어 있기 떄문에 서로 간의 의존성이 낮다.
		- Monolithic Kernel보다 ==독립적인== 개발이 가능하다.
		- Kernel의 개발 및 유지 보수가 상대적으로 용이하다.
	- Kernel 서비스 서버의 간단한 시작/종료가 가능하다.
		- 불필요한 서비스의 서버는 종료한다.(많은 메모리 및 CPU 자원 확보 가능)
	- 이론적으로 , Micro Kernel이 Moholithic보다 안정적이다.
		- 문제 있는 서비스는 서버를 재시작하여 해결한다.
	- 서버 코드가 Protected Memory에서 실행되므로, 검증된 S/W 분야에 적합하다.
		- 의료, 항공, 임베디드, ...
	- 보안성이 우수하다.
		- 각 서버가 보호된 메모리 공간에서 실행되어, 잘못된 접근을 방지한다.
- ### 단점
	- Monolithic Kernel보다 ==낮은 성능==을 보인다.
		- 독립된 서버들 간의 통신 및 Context Switching
	- 설계가 복잡하고 구현이 어렵다.
---
## Monolithic Kernel vs Micro Kernel
- ### 블록 I/O 처리 (시스템콜) 비교
  ![](https://i.imgur.com/4zDjDw7.png)
	- Monolithic Kernel
		- 하나의 커널 공간 안에서 모든 커널 기능을 처리하기 때문에 성능이 우수하다.
		- 하지만, 결합도가 높아 유지보수와 안정성에 취약하다.
	- Micro Kernel
		- 기능을 사용자 공간의 서버로 분리하고, 커널은 IPC만 담당한다.
		- 모듈성과 안정성은 높지만, 성능 측면에서 오버헤드가 발생한다.
---
## Hypervisor
![](https://i.imgur.com/XYDH2ve.png)
- ==Monolithic Kernel + Micro Kernel가 아니다.==
- 하드웨어 위에 위치하여, **여러 운영체제(게스트 OS)** 가 **동시에 하나의 물리 머신을 공유**할 수 있게 만드는 **가상화 계층**이다.
- ### 특징
	- 가상화된 컴퓨터 H/W 자원을 제공하기 위한 관리 계층
		- 게스트 OS와 H/W 사이에 위치한다.
			- 게스트 OS : Hypervisor가 제공하는 가상화된 H/W 자원을 이용하는 운영체제
	- 각 게스트 OS들은 각각 서로 다른 가상 머신(Virtual Machine)에서 수행되며, ==서로의 존재를 알지 못한다.==
		- H/W에 대한 접근은 Hypervisor에게 할당 받은 자원에 대해서만 수행한다.
	- Hypervisor는 각 게스트 OS 간의 CPU, 메모리 등 시스템 자원을 분배하는 등 최소한의 역할을 수행한다.
- ### 장점
	- 하나의 물리 컴퓨터에서 여러 종류의 게스트 OS 운용이 가능하다.
		- 한 서버에서 다양한 서비스를 동시에 제공한다.
	- 실제의 컴퓨터가 ==제공하는 것과 다른== 형태의 ==명령어 집합 구조==(Instruction Set Architecture)를 제공한다.
		- 다른 H/W 환경으로 컴파일 된 게스트 OS 및 응용 프로그램도 실행 가능하다.
		- 한 시스템이 문제(해킹)가 생겨도 다른 시스템에 영향을 못미친다.
- ### 단점
	- H/W를 직접적으로 사용하는 다른 운영체제에 비해 성능이 떨어진다.(성능보다 보안성이 목적인 경우에 사용한다.)
		- 게스트 OS가 H/W 자원에 직접 접근하지 못하고, 항상 **Hypervisor를 경유**해야 하므로 오버헤드가 발생한다.
		- 반가상화(Para-Virtualization)로 성능저하 문제를 해결하려 한다.
		- 단 게스트 OS의 H/W 의존적인 코드에 대한 수정이 요구된다.
			- 높은 기술적인 능력이 필요하다.
			- OS의 소스가 공개되지 않았다면 게스트 OS로는 수정이 불가능하다.
---
## Monolithic kernel, Micro kernel, Hypervisor
![](https://i.imgur.com/iI7PHDz.png)
- **Monolithic Kernel**  
    하나의 큰 덩어리처럼 모든 기능이 커널에 직접 포함 → 빠르지만 유지보수 어려움
- **Micro Kernel**  
    기능을 최소한으로 줄이고 대부분의 커널 기능은 별도 서버로 분리 → 안정성/모듈성 좋음, 다만 IPC 오버헤드 존재
- **Hypervisor**  
    커널이 아닌 **가상화 계층**으로, 게스트 OS를 가상 환경에서 독립적으로 실행하게 함 → 보안성 우수, 다양한 OS 동시 실행 가능
---
# 출처
- 숭실대학교 공영호 교수님 운영체제
- 숭실대학교 이정현 교수님 시스템 보안