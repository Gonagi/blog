# Dynamic Loader: 로딩 + 재배치
![](https://i.imgur.com/vAkAKOg.png)
## 섹션 요소
- `.interp` : 동적 링커(`ld.so`)의 full path 이름을 저장
- `.plt` : 외부 참조 함수 이름 정보
- `.got` : load-time에 ld.so가 재배치할 전역변수 주소
- `.got.plt` : run-time에 `ld.so`가 재배치 할 (.plt와 대응되는) 함수들의 실제 주소
## (RW-)를 (R--) + (RW-)로 재배치 하는 이유
- 변경될 필요가 없는 영역은 Read-Only로 설정하고, 변경이 필요한 영역만 RW-로 유지하는 것이 더 안전하고 효율적인 방식이다.
	- 보안 강화
		- 실행 가능한 코드(`.text`)가 변경 가능(Read-Write)하면 보안 취약점이 발생할 수 있다.
	- 메모리 공유 최적화
		- 여러 프로세스가 같은 라이브러리 코드를 공유 가능
	- 페이지 보호
		- 잘못된 쓰기를 방지하여 Segmentation Fault 예방
	- 실행 성능 최적화
		- CPU 캐시 활용 최적화
---
## Shared Library 생성 후 (정적) 링킹
![](https://i.imgur.com/D0YmEkm.png)
1. `fPIC`옵션으로 `add.c`, `add.c`를 컴파일한다.
2. 동적 링커를 이용해 `add.o`, `sub.o`를 합쳐 공유 라이브러리 `libcalc.so` 생성
	- 심볼 해석이 동적 링킹으로 수행됨
3. `main.o`, 내가 만든 공유 라이브러리(`libcalc.so`), 기존 라이브러리(`libc.so`)를  정적 링킹하여 실행파일 sum-d 생성
4. 정적 로더(`execve`)로 실행(`./sum-d`)
	- ELF 헤더를 확인하여 실행 파일이 동적 링킹을 필요로 하는지 검사
5. `.interp` 섹션을 참조하여 동적 링커를 로딩
	- `.interp`가 존재하므로 동적 링커가 실행되야 함
6. 동적 링커가 `.dynamic`를 확인하여 필요한 모든 공유 라이브러리들(`libcalc.so`, `libc.so`)을 차례로 로딩
7. 동적 링커가 (RW-) 세그먼트를 (R--, RW-)로 재배치
	- 메모리 보호 및 공유 최적화
![](https://i.imgur.com/Q0H2id9.png)
## 정적 로딩 vs 동적 로딩 기준
- 로딩 방식은 실행 파일이 정적/동적 라이브러리를 포함하는지 여부에 따라 결정됨
### 정적 로딩
- 정적 라이브러리(`*.a` 또는 `*.lib`)만 사용한 경우
### 동적 로딩
- 동적 라이브러리(`*.so`또는 `*.dll`)를 하나라도 사용한 경우
- 실행할 때 정적 로더(`execve()`)가 동작하지만, 결국 동적 로더(`ld.so`)가 공유 라이브러리를 로드하여 동적 로딩이 수행됨
- 대부분의 프로그램은 표준 C 라이브러리를 포함하기 때문에, 대부분 ==동적 로딩==을 수행함
---
## 리눅스 커널이 실행파일을 동적 로딩하는 과정
![](https://i.imgur.com/RhhTYY7.png)
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
7. **`.interp` 섹션 확인 및 동적 링커(`ld-linux.so`) 로드**
8. `do_map()` : 각 섹션(TEXT, DATA, BSS등)을 메모리에 적재
9. `start_thread()`: EIP(명령어 포인터)를 ELF 실행 파일의 진입점(Entry Point)로 설정
	- 커널 모드에서 유저 모드로 전환
10. **동적 링커(`ld.so`) 실행 및 공유 라이브러리 로딩 시작**
	- ELF 실행 파일의 `.dynamic` 섹션을 참조하여 필요한 공유 라이브러리를 로드 시작
	- 11~12 반복
11. **`_dl_map_object()`를 호출하여 공유 라이브러리 매핑(1차 ping pong)**
	- 공유 라이브러리를 적절한 메모리 영역에 매핑함
		![left|300](https://i.imgur.com/AzN4gws.png)
12. **`dl_relocate_object()`를 호출하여 심볼 재배치 (2차 ping pong)**
	- `RW-`를`RW-` + `R--`로 분리
	   ![left|400](https://i.imgur.com/bBbxmnH.png)
13. 모든 공유 라이브러리가 로드되면 `main()` 실행

![](https://i.imgur.com/hv6V0vO.png)

14. 실행파일의 진입점 `_start()` 실행
15. `__libc_start_main()`에서 실행 환경을 설정한 후 `main()` 호출
16. `main()` 실행이 종료되면, `exit()`를 호출하여 프로그램 종료 과정 시작
17. `exit()`내부에서 `_destructor()`가 실행되어 리소스 해제 및 정리 수행
---
# 출처
- 숭실대학교 이정현 교수님 시스템 보안