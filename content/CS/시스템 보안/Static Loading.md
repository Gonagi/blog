![|400](https://i.imgur.com/a14S6LO.png)
- ==실행 전==에 모든 코드와 라이브러리를 메모리에 미리 로드하여 실행하는 방식
- 심볼 테이블이 컴파일 시점에 완전히 해석되고, ==실행 시점에는 추가적인 심볼 해석 과정이 없음==
---
# Static Loading
## Static Library 생성 후 링킹
![](https://i.imgur.com/v1sNtQy.png)
![](https://i.imgur.com/7qf9RJv.png)
- main.o, 내가 만든 라이브러리, 기존 라이브러리를 정적 링커로 링크하여 `sum-s` 실행 파일을 생성한다.
- 정적 로더가 해당 실행 파일을 메모리에 적재한다.
![](https://i.imgur.com/JJDJmdI.png)
- `.text`, `.rodata`, `.data`, `.bss` 영역 존재
- `.interp`, `.dynsym`, `.dynstr`, `.dynamic` 존재 X
## sum-s의 프로그램 헤더 테이블
![](https://i.imgur.com/mcNa1m8.png)
- `Elf file type is EXEC` → 실행 가능한 파일
	- (EXEC: Executable, DYN: .so or PIE)
- `Entry point 0x080481e0`
	- 실행파일이 시작되는 주소
	- CPU가 프로그램을 실행할 때 이 주소로 jump하여 실행을 시작함
- ### 메모리에 로드되는 섹션 정보
	- LOAD : 실행시에 실제 메모리에 로딩될 프로그램의 세그먼트
	- 첫번째 LOAD
		- TEXT 영역
		- `Offset` : 실행파일의 0x000000부터 시작
		- `VirtAddr` : 실행할 때 가상 메모리 주소
		- `PhysAddr` : 물리 메모리 주소
		- `Flg` : 읽기 실행 가능
		- `Align` : 메모리 정렬 기준 → 4KB(가상 메모리 page 단위)
	- 두번째 LOAD
		- DATA, BSS 영역
		- ...
## 프로그램이 실행중`./sum-s`인 상태에서 sum-s의 프로세스 맵 확인
![](https://i.imgur.com/rxPdc0k.png)
- 첫번째 LOAD(TEXT)의 가상주소는 일치한다.
- 두번째 LOAD(DATA)의 가상주소는 일치하지 않는다.
	- 페이지 단위가 4KB이므로, `0x080cef8c`가 포함된 가장 가까운 페이지 경계인 `0x080ce000`부터 메모리를 할당함.
- heap-stack 영역 생성
![](https://i.imgur.com/FdwP358.png)
- Entry Point는 process 시작 주소인 `0x0848000` + 실행 가능한 파일의 .text 영역 Offset인 `0x000001e0`을 더한 `0x80481e0`이다.
- Page 단위를 맞추기 위해 padding을 줘서 Data 영역의 시작 주소는 `0x80ce000`이다.
## 리눅스 커널이 실행파일을 정적 로딩하고 실행하는 과정
![](https://i.imgur.com/BgtiMva.png)
1. `./sum-s` : 사용자가 실행파일 실행
	- Shell이 해당 실행 파일을 찾아 실행 요청
2. `execve("sum-s")` : Shell이 실행 파일 실행 요청
	- `sum-s`를 현재  프로세스에 적재하고 실행
3. `sys_execve()` : 파일 시스템을 통해 `sum-s` 실행 파일 검색
	- 커널 모드로 전환
4. `do_execve()` : 실행 파일 로딩 시작
	- 실행 파일의 형식을 확인하고(ELF), ==적절한 실행 파일 로더를 선택함==
5. `search_binary_hanlder()` : 실행 파일 핸들러 선택
	- 실행 파일의 형식을 확인하고(ELF), ==적절한 핸들러를 선택함==
6. `load_elf_binary()` : ELF 실행 파일을 메모리에 적재
7. `do_map()` : 각 섹션(TEXT, DATA, BSS등)을 메모리에 적재
8. `start_thread()`: EIP(명령어 포인터)를 ELF 실행 파일의 진입점(Entry Point)로 설정
9. `main()` : 유저 영역에서 `sum-s` 실행
---
# 출처
- 숭실대학교 이정현 교수님 시스템 보안