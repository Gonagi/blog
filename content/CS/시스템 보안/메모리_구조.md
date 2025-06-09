# Contents
- ## 프로그램이 만들어지는 과정 
- ## Process State
- ## Process Control Block
- ## 프로세스 생성 관리
---
# 1. 프로그램이 만들어지는 과정

## [[ELF 파일 구조-1]]

---
# 2. Process State
## Porcess State
- ### New : the process is being created
	- process가 막 생성된 상태 (`fork()`등으로 생성)
- ### Running : Instructions are being executed
	- CPU를 점유해 명령어를 실행 중인 상태
- ### Waiting : the process is waiting for some event to occur
	- ### (e.g., an I/O completion or reception of a signal)
	- I/O 등 외부 이벤트가 끝나길 기다리는 상태 (CPU 양보 상태)
		- I/O를 위해 CPU를 자발적으로 양보한다.
		- I/O가 끝날때까지 기다린다.
- ### Ready : the process is waiting to be assigned to a processor
	- CPU 할당을 기다리는 상태 (I/O 작업은 없음)
- ### Terminated : the process has finished execution
	- 실행이 종료되어 자원이 회수된 상태 (`exit()` 또는 `return`)
---
## 프로세스 상태 다이어그램
### 커널 내에 Ready Queue, Waiting Queue, Running Queue 를 두고 프로세스들을 상태에 따라 관리한다.
![](https://i.imgur.com/juLGN6z.png)
1. **`fork()`를 통해 새로운 프로세스가 생성되면** → `New` 상태로 진입한다.
2. **CPU 할당을 기다리기 위해** → `Ready` 상태로 이동하며, **Ready Queue에 삽입**된다.
3. **스케줄러가 CPU를 할당하면** → `Running` 상태로 전환되어 **명령어를 실행**한다.
4. CPU 스케줄링에 따라 **CPU를 너무 오래 점유하면** → 인터럽트가 발생하여 다시 `Ready` 상태로 이동된다.
5. **I/O 작업이 필요하면**, 프로세스는 자발적으로 CPU를 반납하고 `Waiting` 상태로 전환된다.  (예: 디스크 읽기, 키보드 입력 등)
6. **I/O 작업이 완료되면** → 다시 `Ready` 상태로 돌아가 **CPU 할당을 기다린다.**
7. **다시 스케줄러에 의해 CPU를 할당받으면**(`scheduler dispatch`) → `Running` 상태가 되어 작업을 계속한다.
8. **작업이 모두 끝나거나**, `exit()` 혹은 `main()` 함수 종료 시 → `Terminated` 상태로 진입하고,  운영체제가 해당 프로세스의 **메모리와 자원을 회수**한다.

### **New → Ready → Running → (Waiting ↔ Ready) → Running → Terminated**
---
# 3. Process Control Block
## PCB(Process Control Block)
  ![left|300](https://i.imgur.com/HTF6Yq4.png)
- ### 운영체제가 프로세스를 관리하기 위해 유지하는 정보들의 구조체
	-  각 프로세스는 고유한 PCB를 하나씩 가지며,  운영체제는 이를 통해 프로세스의 상태를 추적하고 제어한다.
	- 운영체제는 이 PCB들을 큐(Ready Queue, Waiting Queue 등)로 관리하면서  **스케줄링, Context Switch, 자원 할당 등을 수행**한다.

| 항목                            | 설명                                                     |
| ----------------------------- | ------------------------------------------------------ |
| **Process State**             | 현재 프로세스의 상태 (New, Ready, Running, Waiting, Terminated) |
| **Program Counter**           | 다음에 실행할 명령어의 메모리 주소 → CPU가 해당 위치에서 명령어를 fetch한다.       |
| **CPU Registers**([[메모리_구조]]) | 실행 중이던 레지스터 값 (레지스터 스냅샷 저장) → Context Switch 시 필요 하다.  |
| **CPU Scheduling Info**       | 우선순위, 스케줄링 큐 포인터 등                                     |
| **Memory Management Info**    | 페이지 테이블, 세그먼트 테이블 등                                    |
| **Accounting Info**           | 어떤 user가 creation 했는지 등                                |
| **I/O Status Info**           | 연관된 I/O 장치, 어떤 자원을 열었고 lock을 걸었는지 등                    |

---
## Program Counter
![](https://i.imgur.com/e9sLrb6.png)
- ### 프로그램 실행 중 **다음에 실행할 명령어의 주소**를 담고 있는 레지스터  
	1. **Fetch(가져오기) : 다음에 실행할 명령어를 메모리에서 읽어온다.**
		- Program Counter(PC)는 다음에 실행할 명령어의 메모리 주소를 가리킨다.
		- 해당 주소의 명령어를 메모리에서 가져와서(Fetch),  Instruction Queue(IQ)에 저장한다.
	2. **Decode(해석하기) : 무슨 명령인지 해석해서 실행을 준비한다.**
		- IQ에 저장된 명령어를 분석하여 어떤 연산인지 파악한다.
	3. **Fetch Operands(피연산자 가져오기) : 실제로 연산할 값들을 메모리/레지스터에서 읽어온다.**
		- 명령어가 참조하는 값들을 메모리나 레지스터에서 불러온다.
	4. **Execute(실행) : 명령어에 따라 연산을 수행한다.**
		- 산술/논리 연산, 메모리 접근, 분기 등 연산 유닛(ALU 등)이 동작한다.
	5. **Store Output(결과 저장) : 연산 결과를 저장한다.**
		- 연산 결과를 레지스터 또는 메모리에 저장한다.
- ### 이 사이클은 각 명령어 단위로 반복되며,  Program Counter는 다음 명령어 주소를 가리키도록 자동으로 증가한다.
---
## Process Concept
- ### Process
	- a program that performs a **single thread of execution**
	- process는 한번에 하나의 일만 수행할 수 있다.
	- 현대의 운영체제는 여러개의 일을 동시에 실행(멀티 프로세싱)할 수 있다.![left|400](https://i.imgur.com/RKvMokC.png)
		1. Kernel이 P0의 PCB0를 참조해서 PC, Register 정보 등을 CPU에 로드한다.
		2. interrupt나 I/O 요청이 발생하면 현재 PC,  Register정보 등을 PCB0에 저장한다.(**Context Save**)
		3. 다음에 실행될 process인 P1의 PCB를 참조해서 상태를 CPU에 복원한다.(**Context Restore**)
---
## Context Switch
### 커널이 프로세스 실행 상태를 저장하고, 다른 프로세스를 불러오는 작업
- ### Context
	- the context of a process is represented in the **PCB**
	- 모든 프로세스는 코드, 데이터, 스택의 주소 공간과 프로세스가 동작할 때의 레지스터 값 등의 ==context==를 가지고 있다.
- ### Context Switch
	- Process가 바뀌는 과정
	- when CPU switches to a new process, kernel must ==save the state of the old process== and ==load the saved stated for the new process==![](https://i.imgur.com/x9WUdUR.png)
		- Context switching time is **overhead**
			- 시스템은 switching하는동안 아무것도 할 수 없다.
		- Context switching time은 hardware support(scheduling을 얼마나 잘하는가)에 의존된다.
---
# 4. Process Creation
## process creation이란?
![](https://i.imgur.com/vsiujUO.png)
- 모든 프로세스는 code, data, stack의 주소 공간과 프로세스가 동작할 때의 레지스터 값 등의 **context**를 가지고 있다.
- 커널 관점에서 프로세스 생성이란 context를 관리하기 위한 **process descriptor**를 의미한다.

---
## process descriptor
### 운영체제에서는 process descriptor로 process를 관리한다.
- state, pid, 레지스터, 메모리, 파일 정보등이 있다.
- 리눅스에서는  **task_struct** 구조체로 process를 관리한다.
  ![left|400](https://i.imgur.com/PELO70O.png)
### PID만으로는 프로세스를 고유하게 식별하기 어렵다.
- PID는 사용자 입장에서 프로세스를 식별하기 위한 **단순한 숫자 ID**일 뿐이며,  
  프로세스가 종료되면 재사용될 수 있다.
- 커널은 각 프로세스의 모든 정보를 담고 있는 **`task_struct`(process descriptor)를 통해  프로세스를 정확하게 식별하고 관리**한다.
- 과거에는 `task_struct`를 배열 형태로 관리하며 **인덱스**로 접근하기도 했지만,  
  현재는 주로 **포인터 기반의 연결 리스트 또는 해시 테이블**로 관리한다.
---
## Linux Task(Process Task, Thread Task)
### Process == Task, Thread == Task (Linux)
- 리눅스에서는 process, thread 모두 `task_struct`를 통해 관리한다.
	- 따라서 리눅스에서는 process, thread라는 표현 대신 **task**라는 용어를 통일적으로 사용한다.
### process descriptor를 ==PCB==(Process Control Block) 또는 ==TCB==(Thread Control Block)으로 부르기도 한다.
![](https://i.imgur.com/4oqq6Ar.png)
- 하나의 **process는 1개 이상의 thread**를 가질 수 있다.
- 사용자 공간의 각 **thread는 커널 공간의 `task_struct`와 1:1로 매핑**된다.
    - `task_struct`는 해당 **thread/process의 상태, 레지스터, 메모리, 파일 정보 등**을 담고 있는 **커널의 관리 구조체**이다.
- thread의 수만큼 `task_struct`가 생성되고,  각각은 **커널 스케줄러가 관리하는 독립적인 task**가 된다.
- **유저 스레드 간 전환**은 context switching을 통해 이뤄진다.
- **커널 스레드 간 전환**의 경우:
    - ==같은 커널 주소 공간 내에서 동작하므로==
    - 상황에 따라 **full context switching 없이 최소한의 상태만 전환**할 수 있다.
    - 따라서 **전환 오버헤드가 매우 작거나, 불필요한 경우도 있다.**
---
## MultiProcess VS Multithread
### 멀티스레드는 주소 공간을 공유해 빠르지만 동기화 이슈가, 멀티프로세스는 독립성이 높지만 전환 비용이 크다.
![](https://i.imgur.com/ju4hTxn.png)
### Multiprocesses
- 운영체제 관점에서의 실행흐름을 제어한다.
- ==context switching==에 대한 부담이 크다.
	- 완전히 다른 주소 공간으로 전환해야 하므로  페이지 테이블 교체, 캐시/TLB 플러시 등 부가 비용 발생
- process간 데이터 교환이 불가능하다. (주소 공간이 다름)
	-  데이터를 주고받기 위해 **IPC(Inter-Process Communication)** 필요  
	    - 예: Pipe, Message Queue, Shared Memory, Socket 등
### Multithreads
- process 내에서의 실행 흐름을 제어한다.
- ==context switching==에 대한 부담이 덜하다.
	- 같은 프로세스 내이므로 주소 공간은 그대로  → 레지스터만 저장/복원하면 되므로 빠름
- thread간 데이터 교환이 매우 쉽다.
- 동기화 문제가 발생할 수 있다.(mutex, semaphore 필요)
	![left|500](https://i.imgur.com/YWuq32p.png)
---
## Context Switching(SW / HW)
### 리눅스/윈도우는 ==SW 기반 Context Switching==방식을 사용한다.
![](https://i.imgur.com/3ucEW3w.png)
### S/W 방식
- 커널이 직접 프로세스 상태를 **task_struct(프로세스 디스크립터)** 에 저장하고 복원함
- 전환 시에는 아래와 같은 과정이 수행됨:
	  1. 현재 실행 중인 **프로세스 A의 레지스터 값, PC(Program Counter) 등**을 task_struct에 저장
	  2. 다음에 실행할 **프로세스 B의 task_struct에 저장된 값**을 읽어와 CPU에 복원
### H/W 방식
- **Intel**에서  각 프로세스의 상태를 **TSS(Task State Segment)** 라는 자료구조에 저장하고 자동 전환한다.
- 주요 구조:
	- 각 Task의 TSS는 **GDT(Global Descriptor Table)**에 정의됨
	  - 전환할 Task를 바꾸기 위해 **TR(Task Register)** 값을 변경
	  - CPU가 자동으로 레지스터, 스택, PC 등을 교체
---
## fork()
### 현재 실행 중인 프로세스를 **복제(copy)** 하여,  동일한 실행 흐름을 가진 **새로운 자식 프로세스**를 생성하는 시스템 콜
![](https://i.imgur.com/2dJo3IG.png)
- 자식 프로세스는 부모 프로세스와 **코드(Code) 영역은 공유**합니다.
- **데이터(Data), 스택(Stack), 힙(Heap) 영역은 각각 독립적으로 복사되어** 프로세스마다 별도로 할당됩니다.
- 따라서 실행 흐름은 동일하더라도, 변수나 메모리 변경은 **부모와 자식 간에 서로 영향을 주지 않는다.**
---
## execve()
### 현재 process를 새로운 process로 대체하는 시스템 콜
![left|550](https://i.imgur.com/CRKeT4p.png)
- 현재 process를 새로운 process로 대체한다.(==pid 변경 없음==)
	- 현재 process의 **주소공간을 완전히 교체**한다.
---
## fork() + execve()
### fork(복제), execve(대체)을 조합해 다른 프로그램을 실행할 수 있다.
![](https://i.imgur.com/KkUgjXK.png)
### 1. 부모 process가 `fork()`를 호출하면, **거의 동일한 자식 process가 복제**된다.
- 부모 프로세스가 `fork()`를 호출하면,  
    → **거의 동일한 자식 프로세스가 생성**됩니다.
- 이때 **부모와 자식은 완전히 독립된 프로세스**이며,  
    각각 **다른 PID**를 가집니다.
### 2. 부모 / 자식 역할 분리
- #### 부모 process
	-  부모 process는 `wait()`를 호출하여, 자식이 끝날 때까지 기다린다.
- #### 자식 process
	-  자식 process는 `execve()`를 통해 자신을 새로운 프로그램으로 덮어쓴다.
	    - **자식 프로세스의 주소 공간이 완전히 새롭게 바뀐다.**
	    - **PID는 그대로 유지**한다.
---
## Process Creation in Unix
``` c
#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
	int counter = 0;
	pid_t pid;
	
	printf("Creating Child Process\n");
	pid = fork();
	if (pid < 0) { // Error in fork
		fprintf(stderr, "fork faild, errno: %d\n", errno);
		exit(EXIT_FAILURE);
	}

	else if (pid == 0) { // This is Child Process
		int i;
		printf("I am Child Process %d!\n", getpid());
		execl("/bin/ls", "ls", "-l", NULL); // Run 'ls -l' at /bin/ls
		
		for (i = 0; i < 10; i++) { // Cannot be run
			printf("Counter: %d\n", counter++);
		}
	}

	wait(NULL);
	return EXIT_SUCCESS;
}
```
---
# 출처
- 숭실대학교 공영호 교수님 운영체제
- 숭실대학교 이정현 교수님 시스템 보안