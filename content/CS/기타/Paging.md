# 페이징
- 운영체제가 컴퓨터 메모리 사용을 최적화하는데 사용하는 ==메모리 관리 기술==
- 메모리를 고정 크기 페이지로 나누어 물리적 메모리 프레임에 매핑하여 단편화를 줄이고 시스템 성능을 개선한다.
### 주소 공간을 동일한 크기인 Page로 나누어 관리
- 보통 1 Page의 크기는 4KB로 나누어 사용한다.
- #### Frame
	- ==물리 Memory==를 고정된 크기로 나누었을 때, 하나의 Block
- #### Page
	- ==가상 Memory==를 고정된 크기로 나누었을 때, 하나의 Block
- 각각의 프레임 크기와 페이지 크기는 같다.
### Page가 하나의 Frame을 할당 받으면 물리 메모리에 위치하게 된다.
- Frame을 할당받지 못한 Page들은 외부 저장장치(Backing Storage)에 저장된다.
	- Backing Storage도 Page, Frame과 같은 크기로 나누어져 있다.
### CPU가 관리하는 모든 주소는 두 부분으로 나뉜다.
- #### Page 번호
	- 각 Process가 가진 Page 각각에 부여된 번호
	- 몇번째 page를 접근할 것인지
	- ex) 1번 Process는 0부터 63번까지의 Page를 가지고 있다.
- #### Page 주소(Offset)
	- 각 Page의 ==내부 주소==를 가리킨다.
	- page 주소
	- ex) 1번 Process 12번 Page의 34번째 Data
---
# Page Fault
### Process가 Page를 참조하였을 때 해당 Page가 할당 받은 Frame이 없는 경우
- #### 있는 경우 (present bit == valid)
	- Page base address를 통해 해당 Frame에 접근
- #### 없는 경우 (present bit == invalid)
	- Page Fault 발생
		- Frame을 새로 할당 받아야 함
	- Page Fault Handler 수행
- 실제 메모리는 가상 메모리보다 훨씬 작기 때문에 페이지 폴트가 발생한다.
### Page Fault Handler가 수행하는 내용
- 새로운 Frame을 할당 받음
- Backing Storage에서 Page의 내용을 다시 Frame에 불러들인다. (로딩타임 or 프로세스 먹통)
- Page Table을 재구성한다.
- Process의 작업을 재시작한다.
![](https://i.imgur.com/8iOEgYd.png)
- Page-fault 발생 빈도는 프레임의 개수와 반비례한다.
### 지역성(Locality)
- 프로세스가 실행되면서 특정 메모리를 참조하면 일정한 기간동안은 현재 참조하는 메모리 또는 근처에 있는 메모리를 계속 참조하는 특성![](https://i.imgur.com/m91cbwn.png)![](https://i.imgur.com/KEvPSN4.png)
### 작업 공간(Working Set)
- 어떤 시간 Window 동안에 접근한 Page들의 집합
- 시간마다 Working Set이 변한다.
- 지역성을 고려하여 현재 시점으로부터 이전에 실행된 일정한 메모리 참조만을 working set으로 구별하고, 그 working set을 메모리에 할당한다.![](https://i.imgur.com/EJe3yQp.png)
- working set 구간을 working set window라고 한다.
	- ex) 지역성을 고려한 페이지의 개수를 6개로 하면 working set window는 6이 된다.
![left|400](https://i.imgur.com/RV9o2Y3.png)
- working set에는 현재 프로세스가 실행될 떄 필요한 지역성에 해당하는 페이지만 들어있기 때문에 page fault를 최소화 할 수 있다. (==Page fault는 working set window가 이동할때만 발생한다.==)
### 쓰레싱(Thrashing)
- Process의 실행 시간 중, Page Fault를 처리하는 시간이 Execution 시간보다 긴 상황
- Page Fault가 시스템의 허용 수준을 넘어가는 현상
- 메모리 허용량보다 더 많은 프로세스를 동시에 실행하려고 할 때 발생한다.
- Page fault가 발생하면 CPU는 아무 일도 하지 않으므로 스케줄러는 CPU가 놀고 있다고 판단하여 계속해서 새로운 프로세스를 더 많이 실행한다.                      ![|400](https://i.imgur.com/ru2c4lT.png)
# 페이지 교체 알고리즘
- 페이지 폴트가 발생하고 메모리에 사용 가능한 페이지 프레임이 없을 때 어느 페이지를 교체할것인가를 결정하는 알고리즘
- 페이지 폴트 수를 줄이는 것을 목표로 한다.
- 교체 대상 선택 → 보조기억장치에 보관 → 새로운 페이지를 적재
### 최적화의 원칙
- 앞으로 가장 오랫동안 사용되지 않을 페이지를 교체 대상으로 선택 (이상적임)
### 교체 제외 페이지
- 페이징을 위한 슈퍼바이저 코드 영역, 보조기억장치 드라이버 영역, 입출력장치를 위한 데이터 버퍼 영역 등
### 페이지 교체 알고리즘
- 시스템의 특정 요구 사항에 따라 적합한 알고리즘을 선택해야 한다.
- #### FIFO(First-In First-Out)                             
  ![left|400](https://i.imgur.com/mH4eLVo.png)
	- 대기열에 있는 메모리의 모든 페이지를 추적한다.
	- 메모리 내에 가장 오래있었던 페이지를 교체 
	- FIFO 큐를 이용하여 구현한다.                                    
- #### Optimal Page replacement
  ![left|400](https://i.imgur.com/wjjUQuE.png)
	- 가장이상적인 교체 알고리즘이지만 불가능함
	- 다른 교체 알고리즘을 분석하는 벤치마크 기능을 한다.           
- #### LRU(Least Recently Used)
  ![left|400](https://i.imgur.com/ZJYQin0.png)
- #### MRU(Most Recently Used)
  ![left|400](https://i.imgur.com/CqICtUP.png)