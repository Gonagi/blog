# Advanced Intelligent Computing Architecture
## Hand-operated System
### 1950년대 초반
- ==기계적인 스위치==를 이용해 1bit 단위로 컴퓨터에 입력되어 실행  
  ![left|300](https://i.imgur.com/FJxwox4.png)
### 1950년대 중반
- 모든 프로그램은 ==기계어로 쓰여짐==
- Plug-Board에 Wiring을 통해 컴퓨터의 기능을 제어
  ![left|300](https://i.imgur.com/5HonT8x.png)
- 프로그래밍 언어 및 운영체제라는 존재가 없음
	- ==영구적인 저장장치가 없음==(매번 프로그램 다시 입력)
### 1960년대 초반
- ==펀치카드== 등장
  ![left|300](https://i.imgur.com/52M6O0K.png)
- 프로그래밍한 카드로 컴퓨터 구동(Plug-Board 대체)
---
## Mainframe - 일괄처리(Batch)
![left|300](https://i.imgur.com/QasZwhl.png)
### Business Machinery로써 쓰이면서 가치가 발생
- 계산을 하는데 주로 사용되기 시작함
- ==교량(Bridge → 주식, 산업용 시스템 설계할때 사용) 설계==
### 일괄 처리 - 아주 단순한 OS 개념
- 일단 시작한 job은 끝나야 다음 job이 실행됨
	- job(Punch card)이 다 읽히고 결과를 받을때까지 아무것도 못함(유저 개입 불가)
- 사람이 Scheduling 함
### CPU는 빈번히 Idle 상태로 전환됨
- 기계적인 I/O 장치와 전기 장치인 CPU 사이에 현격한 속도 차가 존재
- Idle Time(유휴 시간) : 사용할 수 있는 상태임에도 실제적인 작업이 없는 시간
## Automatic Job Sequencing - 좀 더 나은 OS
- 사람의 관여 없이, 여러 개의 프로그램을 순차적으로 실행
- 이전 작업이 종료되자마자 다음 작업을 실행하기 때문에, 일괄 처리 Batch보다 성능이 향상됨
- 스케줄링을 담당하는 소프트웨어가 프로그램을 실행
- I/O에 의해 CPU가 Idle 상태로 전환되는 문제는 해결 못함
  ![left|400](https://i.imgur.com/0IWG4Gd.png)
	- 입력하고 캐시에 올라갈때까지 시간이 걸림
## Spooling - 초기 해결책
### Simultaneous Peripheral Operation On-Line
### I/O와 Computation을 동시에 진행할 수 있음
- 예) 프린터 Spooling
	- 인쇄할 문서를 디스크나 메모리의 버퍼에 로드
	- 프린터는 버퍼에서 자신의 처리 속도로 인쇄할 데이터를 가져옴
	- 프린터가 인쇄하는 동안 컴퓨터는 다른 작업을 수행할 수 있음
- SSD에서 buffer에 입력 → buffer에 데이터가 있는지 확인 → buffer에서 꺼내서 사용
### Spooling을 통해 사용자는 여러 개의 인쇄 작업을 프린터에 순차적으로 요청할 수 있음
- 이전 작업의 종료를 기다리지 않고, 버퍼에 인쇄 작업을 로드하여 자신의 인쇄 작업을 요청함
  ![left|400](https://i.imgur.com/tmSTurh.png)
### I/O로 인한 Idle 지속 시간을 줄었지만 Interactive하지 못함
- 한번 시작한 job을 모두 끝내야 다른 job을 실행할 수 있음
- I/O 문제는 해결했으나 CPU 활용도는 낮음
---
## MultiProgramming
### 2개 이상의 작업을 동시에 실행
- 완전 동시에 X, user는 동시에 실행된다고 느낌(concurrent)
- 운영체제는 여러 개의 작업을 메모리에 동시에 유지 (memory에 process들이 올라와 있음)
- 현재 실행중인 작업이 ==I/O를 할 경우,== 다음 작업을 순차적으로 실행
- 스케줄링 고려사항 - ==First Come First Served==
	- 좋지않은 방식일 수 있음 (I/O가 수행되지 않고 연산만 하는 작업이 처음에 들어가면 비효율)
![](https://i.imgur.com/pNNn8mY.png)
### 목적
- CPU 활용도 (Utilization) 증가
	- CPU Idle Time 감소
### 단점
- 사용자는 여전히 실행중인 작업에 대해서는 관여할 수 없다.
	- 먼저 온 job이 CPU를 계속 차지하고 있으면 관여 못함
## Issues with Multiprogramming
### 다른 Job이 수행되기 위해서는 ==현재 수행되는 Job이 I/O를 해야함==(Voluntary Yield에 의존)
- 의도적으로 I/O 안함
### 공평성을 유지할 필요 발생
- 누구나 컴퓨터를 오래 많이 쓰고 싶어한다.
### High Priority로 수행할 필요도 생김
- 자동차의 안전
### Job Scheduling으로는 해결이 안됨
---
## Timesharing
![](https://i.imgur.com/BwGKZe5.png)
### CPU의 실행 시간을 타임 슬라이스(Time Slice)로 나누어 실행
- Job을 작게 쪼개서 보자 (예 → 10ms)
### 모든 프로그램은 ==타임 슬라이스==동안 ==CPU를 점유==하고, 그 시간이 끝나면 ==CPU를 양보==한다.(공평성 유지)
### 여러개의 작업들이 ==CPU 스위칭==을 통해 동시에 실행된다.
### CPU 스위칭이 ==매우 빈번하게 일어난다==
- 사용자는 실행중인 프로그램에 관여가 가능하다
## Multitasking
### 여러 개의 테스크(Task)들이 CPU와 같은 자원을 공유하도록 하는 방법
- Job을 task단위로 나눔
### 하나의 작업(==Job==)은 동시에 실행할 수 있는 ==Task==로 나눠질 수 있음
- 유닉스의 프로세스는 ==fork() 시스템 콜을 이용해서 여러 개의 자식 프로세스== 를 생성할 수 있음
- 안드로이드 어플리케이션은 UI 처리 프로세스, 입출력 처리 프로세스, 계산 처리 프로세스 등 다수의 프로세스를 생성할 수 있음
### Multitasking은 사용자가 여러 개의 프로그램을 실행할 수 있도록 하며, CPU가 ==Idle 상태일 때==는 ==Background 작업을 실행== 가능하도록 함

## Example of DBMS Multitasking
### Fork를 이용한 Child Process 생성
- 멀티태스킹 : 여러 프로그램이 동시에 수행 (Concurrent Execution)
- 하나의 태스크가 다른 테스크(Child Process)를 만들 수 있는 기능을 의미한다.
- 자신이 필요한 기능을 Child Process 형태로 만들어서 서로 협력을 통한 작업 수행
![|500](https://i.imgur.com/iBScZ6f.png)
## Issues with Multitasking System
### 복잡한 ==메모리 관리== 시스템
- 하나의 Job이 여러 process로 분화되면서 쓰는 메모리 양이 많아지고 관리를 잘 해야한다.
- 동시에 여러 개의 프로그램이 메모리에 상주
- 메모리 관리 및 보호 시스템 필요
### 적절한 ==응답 시간==을 제공
- Job들은 메모리와 디스크로 Swap In/Out 될 수 있음
### Concurrent Execution 제공
- CPU 스케줄링 필요
### 필요에 따라서 Job들 간의 Orderly Execution이 필요
- 동기화, Deadlock
---
# 출처
- 숭실대학교 공영호 교수님 운영체제
- [ohohgami (2006.04.25) 게임으로 보는 PC의 역사](https://www.gamemeca.com/view.php?gid=35993)
- [Plugboards](https://www.suomentietokonemuseo.fi/vanhat/eng/kytken_eng.htm)
- [JonghoonAn (2021.11.27) 운영체제 (Operating System) - 운영체제 구조](https://do-my-best.tistory.com/entry/%EC%9A%B4%EC%98%81-%EC%B2%B4%EC%A0%9C-Operating-System-%EC%9A%B4%EC%98%81%EC%B2%B4%EC%A0%9C-%EA%B5%AC%EC%A1%B0)
- [[OS] 프로세스/스레드의 개념: 멀티태스킹, 멀티스레딩, 멀티프로세싱, 멀티프로그래밍을 구분하자!](https://engineerinsight.tistory.com/281?utm_source=chatgpt.com)
