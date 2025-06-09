![|500](https://i.imgur.com/ed9lbbg.png)
- ==실행 중==에 필요한 코드나 라이브러리를 해당 위치에서 가져와 메모리에 올리는 방식
- 실행 파일에는 필요한 라이브러리의 ==심볼 정보가 포함되지 않음==
	- 필요할 때 `dlopen()`, `LoadLibrary()`등으로 로드
- 미리 해석된 심볼 테이블을 그대로 활용하는 것이 아니라, ==로드된 라이브러리에서 직접 심볼을 검색하여 실행==
---
# [[Dynamic Loading-1]] (Dynamic Loading: 로딩 + 재배치)
![](https://i.imgur.com/vAkAKOg.png)
# [[Dynamic Loading-2]] (Dynamic Linking: 재배치 + 심볼 해석)
![](https://i.imgur.com/v6S7WyY.png)

---
# 출처
- 숭실대학교 이정현 교수님 시스템 보안