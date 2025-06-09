# Dynamic Linking : 재배치 + 심볼 해석
 함수 호출 시 ==함수 이름==만 존재하는 ==PLT==(Procedure Linkage Table)을 참조하면 해당 함수의 ==실제 주소==가 들어 있는 ==GOT==(Global Offset Table)로 연결되어 해당 함수 주소를 찾아가게 된다.
- 그러나 동적 링킹 시에 GOT는 dynamic linker(`ld.so`) 호출 주소가 저장되어 있고, 해당 함수가 처음 호출될 때 `ld.so`가 실제 함수 주소를 찾아서 GOT 값을 업데이트한다. → ==Lazy Binding==
![](https://i.imgur.com/v6S7WyY.png)
---
# 재배치
## PLT와 GOT
![](https://i.imgur.com/hvHq8mP.png)
### PLT(Procedure Linkage Table) : `.plt` 섹션
- 참조할 ==외부 함수들의 이름==을 가지고 있음
	- add, sum, printf, ... 등 함수 이름을 가진 table
- 다른 외부 라이브러리에 위치한 함수를 호출할 경우 PLT를 사용한다.
### GOT(Global Offset Table) : `.got.plt` 섹션
- PLT에 있는 ==함수들의 실제 주소==를 가지고 있음
- PLT가 어떤 외부 함수를 호출할 때 이 GOT를 참조해서 해당 주소로 점프한다.
### ※ `.got` 섹션은 재배치할 전역변수들의 주소들로 ==load-time==에 결정된다.
## Lazy Binding
- 초기에 GOT 엔트리는 dynamic linker 호출을 위한 PLT 코드를 가리키고 있음
- 호출된 dynamic linker 내의 `_dl_runtime_reslove()`를 통하여 실제 함수 주소를 찾아 GOT 값을 업데이트 한다.(==Lazy Binding==)
- 이후 동일 함수에 대한 호출에 대해서는 dynamic linker 호출 없이 GOT 값을 통해 실제 함수 주소를 얻게 된다.
![](https://i.imgur.com/EktklQu.png)
---
## Dynamic Linking 실습
![](https://i.imgur.com/X9NB3fU.png)
- `sum-d` 실행파일은 `add`를 두번 호출한다.
- add 함수를 실행하기 위해 PLT에 저장되어 있는 주소로 jump한다.
![](https://i.imgur.com/HCdWTvA.png)
- `add`를 호출하는 라인에 브레이크 포인트를 걸고 실행한다.
	- 첫번째 `add`를 실행하기 직전 상태가 된다.
- 해당 지점에서 disassemble 했을 때
	1. `0x804a010`에 들어 있는 값으로 jump한다.
		- `0x804a010`에는 `0x804845e`가 들어 있다. → PC는 `0x804845e`로 jump한다.
	2. `push $0x20` 실행
	3. `0x08048408`로 jump한다.
		- `0x08048408`에는 ==동적 링커(Dynamic Linker, ld.so)의 이름이 위치하고 있다.==
![](https://i.imgur.com/84vo1ml.png)
- `0x8048408`에서 다시 disassemble를 했을 때
	4. `pushl 0x8049ff8` 실행
		- $이 없으니 해당 위치에 있는 값인 `0x0012d918`를 stack에 넣는다.
	5. `0x8049ffc`에 위치한 값인 `0x00122a80`으로 jump한다.
		- 메모리에 적재된 ==실제 동적 링커(ld.so) 주소==가 위치하고 있다.
![](https://i.imgur.com/AcALaae.png)
- `0x00122a80`으로 jump하면 `_dl_runtime_resolve`가 실행된다. 
	6. `_dl_fixup`(실제 함수 주소를 찾고 GOT를 업데이트하는 함수)가 실행된다.
![](https://i.imgur.com/TR8AZO8.png)
- 라이브러리에 있는 `add`에 브레이크 포인트를 걸고 실행한다.
- 메모리 내 add 함수의 실제 위치는 `0x0012f41c`이다.
![](https://i.imgur.com/v92d6Ts.png)
- `finish` 실행 → (현재 함수의 실행을 끝내고, 해당 함수가 return하는 시점까지 실행한 뒤 멈춘다.)
7. 두번째 `add` 함수를 호출한다.
![](https://i.imgur.com/wwyWItZ.png)

8. 이전과 동일하게 `0x804a010`에 저장된 값으로 점프한다.
	- 해당 값에는 `0x0012f41c`, ==라이브러리 내 실제 add 함수가 위치한 곳==이라는 것을 확인할 수 있다.
![](https://i.imgur.com/WrB4E3c.png)

---
# 심볼 해석
## .dynsym, .dynstr, .rel.plt
![](https://i.imgur.com/qlXdh6s.png)
### Dynamic Symbol Table: `.dynsym` 섹션
- 심볼 이름, offset, 크기, 바인딩 정보 등이 저장되어 있다.(add, sub, printf 같은 함수 이름이 몇번째 항목인지, 해당 함수의 라이브러리 내부에서 offset(상대 주소)는 얼마인지)
### Dynamic String Table: `.dynstr` 섹션
- `.dynsym`의 항목이 가리키는 문자열 데이터(심볼 이름)이 저장되어 있다.  ![Left|400](https://i.imgur.com/oOLY5UE.png)
	- 심볼 이름 : Dynamic String Table(`dynstr`)의 인덱스
	- 1 엔트리 크기 == 16 바이트
### Relocation for PLT : `.rel.plt` 섹션
- PLT를 사용하는 함수 호출을 위해 재배치 정보가 있다.
	- 어떤 GOT 슬롯을 수정해야 하는지, 어떤 `dynsym`에서 찾아야 하는지 알려준다.
---
## sum-d의 재배치 정보
![](https://i.imgur.com/2qDByc7.png)
- add함수의 실제 주소는 `0x0804a010`이다.
- Info의 상위 3바이트는 `.dynsym`에서 몇번째 심볼인지를 나타낸다.
- Info의 하위 1바이트는 Relocation 타입으로 어떤 방식으로 재배치 할지를 나타낸다.
## sum-d와 libcalc.so의 심볼 정보
![](https://i.imgur.com/GefVg0Z.png)
- ### `sum-d`(실행파일)
	- 내부에서 add()를 호출하지만 주소는 모르는 상태이다.
		- dynamic symbol table의 add 함수가 UND(Undefined) 상태 이다.
- ### `libcalc.so`(내가 만든 동적 라이브러리)
	- add함수는 0x0000041c에 위치하고 있다.(상대 위치)
## 정리
1. `sum-d`는 실행파일이고, 내부에서 `add()`를 호출하지만 ==주소는 모른다.==
	- 그래서 `.dynsym` 심볼 테이블에 ==UND (undefined)== 상태로 존재하고 있다.
2. `sum-d`를 실행하던 중, 동적 링커(`ld.so`)가 이 심볼을 해석(resolution)한다.
3. 해석 과정에서 `libcalc.so`에 있는 `add()`를 찾고, 그 오프셋 값이  `0x0000041c`임을 확인한다.
	- 공유 라이브러리의 `.dynsym`에 strcmp해서 일치하는 심볼이 없는 경우 다른 라이브러리로 이동한다.
4. 메모리에서 로딩된 실제 주소(Base Address, `0x0012f000`)와 해당 오프셋을 더해서 최종 주소 `0x0012f41c`를 계산한다.
![](https://i.imgur.com/rSM2kau.png)
---
# 출처
- 숭실대학교 이정현 교수님 시스템 보안