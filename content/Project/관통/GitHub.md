# Contents
## 1. GitHub - 왜 사용하는가
## 2. Git Branch 전략
## 3. Git Commit Convention
## 4. 실습
## 5.  Git 운영 규칙 사전 정의 항목
---
# 1. GitHub - 왜 사용하는가

> Git은 로컬에서도 작업이 가능하고, 브랜치 생성이나 전환이 가볍고 유연해서 병렬 개발이 훨씬 수월하다.

## 1.1. 형상관리 툴 비교

| 항목     | **CVS**     | **SVN**        | **Git**             |
| ------ | ----------- | -------------- | ------------------- |
| 구조     | 중앙 집중형      | 중앙 집중형         | **분산형**             |
| 속도     | 느림          | 중간             | **빠름 (로컬 작업 가능)**   |
| 브랜치    | 없음          | 있음 (무거움)       | **가볍고 유연**          |
| 복구     | X (롤백 불가)   | O              | **O (로컬에서도 복구 가능)** |
| 협업     | 파일 단위 잠금 위주 | 병합 가능          | **분산 병합 최적화**       |
| 대표 사용처 | 예전 오픈소스     | 일부 기업, 레거시 시스템 | **사실상 업계 표준**       |
## 1.2. Git의 강점
### **로컬 작업 가능**(네트워크 없이도 자유롭게 작업)
- 저장소를 `clone`하면 로컬에서도 `add`, `commit`, `branch`, `merge`가 모두 가능
- 나중에 온라인 상태에서 `git push`로 변경 사항을 서버에 반영
### **빠른 속도**(브랜치 전환과 커밋이 즉시 처리됨)
- `git switch`, `git checkout`으로 브랜치 간 전환이 빠르고 간단        
- **SVN은** 브랜치를 전환할 때마다 서버에서 새 디렉터리를 `checkout`해야 하므로 느리고 번거로움  
	→ 브랜치마다 작업 폴더를 따로 관리해야 함
### **브랜치 전략의 유연성**(기능 개발 / 실험 / 테스트를 병렬로 분리하기 용이)
- 다양한 브랜치 전략(GitHub Flow, Git Flow 등)을 손쉽게 적용 가능
### **분산 협업에 최적화** (팀원 각자가 로컬에서 독립적으로 작업 가능)
- 동시에 여러 명이 충돌 없이 개발 진행 가능
---
# 2. Git Branch 전략

> 협업의 충돌을 줄이고, 코드 품질과 배포 흐름을 일관되게 관리한다.

## 2.1. 필요한 이유
- **역할을 분리해 충돌 최소화**  
    → 기능 개발, 버그 수정, 배포 준비 등을 분리된 브랜치에서 독립적으로 수행
- **안정적인 main 유지**  
    → 항상 배포 가능한 상태를 보장하고, 실험적 기능은 별도 브랜치에서 진행
- **코드 품질 향상**  
    → Pull Request 기반으로 리뷰 → 병합 → 테스트 → 배포의 일관된 흐름 확보
- **동시 작업의 체계화**  
    → 여러 명이 같은 파일을 작업해도 병렬 개발 가능
- **협업 & 배포 자동화와 연계**  
    → CI/CD 시스템과 쉽게 통합되어 브랜치 단위로 테스트·배포 자동화 가능

## 2.2. 종류
### 2.2.1. Git-flow
![](https://i.imgur.com/75GKaHT.png)
- ##### 브랜치 종류
	- `master`: 제품 출시 버전을 관리하는 메인 브랜치
	- `develop`: 다음 출시 버전을 위해 개발하는 브랜치
	- `feature`: 새로운 기능을 개발하는 브랜치
	- `release`: 다음 출시 버전을 준비하는 브랜치
	- `hotfix`: 출시된 제품의 버그를 고치기 위한 브랜치
- ##### 흐름
	1. 기능 개발
     - `develop` 브랜치에서 `feature/*` 브랜치 생성 →  기능 개발 후 **Pull Request(PR)** 를 통해 리뷰 → `develop`에 병합
	2. 릴리스 준비
     - `develop`에서 `release/*` 브랜치 생성 → 배포 전 테스트 및 버그 수정
	3. 배포
     - `release` 브랜치를 `main`(또는 `master`)에 병합 → 제품 출시
    4. 긴급 수정  
     - 배포 후 발생한 문제는 `main`에서 `hotfix/*` 브랜치를 만들어 해결 → `main`과 `develop`에 병합
### 2.2.2. Github-flow
![](https://i.imgur.com/oyKRRfY.png)
- ##### 브랜치 종류
	- `master`:  항상 배포 가능한 상태를 유지하는 브랜치
	- `feature`: 기능 개발용 브랜치(`master`에서 분기)
- ##### 흐름
	1. 기능 개발  
     - `master` 브랜치에서 `feature/*` 브랜치 생성 → 기능 개발 진행  
     - 변경사항을 **주기적으로 commit & push**  
     - 작업이 끝나면 Pull Request(PR) 생성 → 코드 리뷰 및 자동 테스트 진행
	2. 코드 병합  
     - 리뷰 승인 및 테스트 통과 시, `feature` 브랜치를 `master`에 병합  
     - 병합 후 `master`은 즉시 배포 가능 상태 유지  
     - 필요 시 `feature` 브랜치 삭제
### 2.2.3. 비교
| 항목       | **Git Flow**                                      | **GitHub Flow**                  |
| -------- | ------------------------------------------------- | -------------------------------- |
| 목적       | **복잡한 릴리스/버전 관리**                                 | **빠른 배포와 단순한 협업**                |
| 브랜치 구조   | `main`, `develop`, `feature`, `release`, `hotfix` | `main`, `feature/*`              |
| 릴리스 방식   | `release` 브랜치 기반, 정기적 버전 단위 배포                    | `main` 병합 즉시 배포 가능               |
| 코드 리뷰 방식 | 보통 수동 병합 or PR (팀에 따라 다름)                         | **PR 기반 병합 필수**, 자동 테스트와 연계      |
| 협업 효율    | 브랜치 많고 복잡 → 규칙 숙지가 필요                             | 브랜치 구조 단순 → 초보자도 빠르게 적응 가능       |
| 적합한 상황   | 대규모 프로젝트, 버전 관리 필요, 릴리스 주기 명확할 때                  | 소규모 팀, 빠른 배포, 잦은 기능 추가가 필요한 프로젝트 |

---
# 3. Git Commit Convention

> 일관된 커밋 메시지 작성으로 코드 변경 이력을 명확히 남기고, 협업과 자동화를 효율적으로 돕기 위한 약속

## 3.1. 필요한 이유
- **변경 내역 추적이 쉬워짐**  
    → 누가, 언제, 왜, 무엇을 수정했는지 커밋 로그만으로 파악 가능
- **협업 시 소통 효율 향상**  
    → 커밋 메시지만으로 작업 내용을 파악해 리뷰나 디버깅이 쉬워짐
- **자동화 도구와의 연동 가능**  
    → 릴리즈 노트 생성, 버전 태깅, CI 트리거 등에 활용
- **팀 코드 품질 및 작업 스타일 통일**
## 3.2. Angular JS Commit Convention
### 3.2.1. 기본 형식
``` html
<type>(<scope>): <short summary>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```
- `type`: 커밋의 성격을 나타냄 (필수)
- `scope`: 변경된 기능/모듈 영역 (선택)
- `summary`: 한 줄 요약 (명령문, 소문자 시작, 마침표 X)
### 3.2.2. 규칙
#### type
| 타입         | 설명                        |
| ---------- | ------------------------- |
| `feat`     | 새로운 기능 추가                 |
| `fix`      | 버그 수정                     |
| `docs`     | 문서 변경 (README 등)          |
| `style`    | 포맷팅, 세미콜론 누락 등 (로직 변화 없음) |
| `refactor` | 코드 리팩토링 (기능 변화 없음)        |
| `test`     | 테스트 코드 추가/수정              |
| `build`    | 빌드 관련 설정 변경               |
| `ci`       | CI 설정 변경                  |
| `perf`     | 성능 개선                     |
| `chore`    | 기타 자잘한 작업 (패키지 업데이트 등)    |
#### scope
- 변경된 영역 또는 파일/기능 이름
- 예: `login`, `auth`, `$browser`, `router`, `component/header`
#### summary
- **한 줄 요약 문장** (권장 길이: 50자 이내, 마침표 X)
- **명령문, 현재 시제**로 작성
    - 예: `fix(auth): handle token expiration`
    - `fixed`, `fixes`, `handle token expiration.` → X
- **첫 글자 소문자**, **마침표 생략**
#### body (본문)
- 요약 이후 **한 줄 띄우고 작성**
- **변경 이유**, **구체적인 구현 방식**, **기존 동작과의 차이점** 등을 기술
- 가능한 경우 **왜** 이렇게 수정했는지를 명확히 설명
- 문장은 **현재 시제의 명령문** 사용 권장 (e.g., "change", "add", "remove")
#### Footer
- **BREAKING CHANGE**  
    → 주요 변경사항 설명, 마이그레이션 가이드 포함
- **Issue 참조**  
    → `Closes #123`, `Fixes #456`
### 3.2.3. 예시
``` diff
feat(post): 게시글 작성 기능 추가

게시글 작성 시 다음 기능이 동작하도록 구현:
- 이미지 첨부
- 카테고리 선택
- 작성 중 임시 저장
```

``` diff
feat(user): 사용자 정보 수정 및 비밀번호 변경 기능 추가

1. 사용자 정보 수정 기능 추가
- 기존에는 사용자 정보 조회만 가능했음
- 이름, 닉네임, 이메일을 수정할 수 있도록 수정 API와 화면 연동
- 이메일 중복 검사는 입력 시 실시간 처리로 UX 개선

2. 비밀번호 변경 기능 추가
- 사용자가 현재 비밀번호를 입력해야만 변경 가능하도록 로직 추가
- 새 비밀번호는 보안 규칙(8자 이상, 숫자 포함 등)에 따라 유효성 검사
- 변경 완료 후 자동 로그아웃 처리로 보안 강화

Closes #210
```
---
# 4. 실습
## 4.1. GitHub에서 개인 리포지토리(git-practice) 생성
## 4.2. 로컬에 Clone & First Commit Push
![](https://i.imgur.com/fdnpZzz.png)
## 4.3. 브랜치 생성 및 커밋 푸시
### 4.3.1. `feature/1`
``` cmd
# 기능 개발을 위한 브랜치 생성 (예: feature/1)
git checkout -b feature/1

# 파일 생성 및 작성 (여기서는 예시로 1번)
echo -e "1\n1\n1" > 1.txt

# 변경 사항 스테이징 및 커밋
git add 1.txt
git commit -m "feat(1): 1번 기능 파일 작성"

# 브랜치 푸시 (원격 저장소에 feature/1 브랜치 업로드)
git push -u origin feature/1
```
### 4.3.2. `feature/2`
``` cmd
git checkout main

# 기능 개발을 위한 브랜치 생성 (예: feature/2)
git checkout -b feature/2

# 파일 생성 및 작성 (여기서는 예시로 2번)
echo -e "2\n2\n2" > 2.txt

# 변경 사항 스테이징 및 커밋
git add 2.txt
git commit -m "feat(2): 2번 기능 파일 작성"

# 브랜치 푸시 (원격 저장소에 feature/2 브랜치 업로드)
git push -u origin feature/2
```
### 4.3.3. `feature/3`
```
git checkout main

# 기능 개발을 위한 브랜치 생성 (예: feature/3)
git checkout -b feature/3

# 파일 생성 및 작성
echo -e "3\n3\n3" > 1.txt

# 변경 사항 스테이징 및 커밋
git add 1.txt
git commit -m "feat(1): 1번 기능 파일 작성(3)"

# 브랜치 푸시 (원격 저장소에 feature/2 브랜치 업로드)
git push -u origin feature/3
```
### 4.3.4. 결과
![](https://i.imgur.com/bFgSdnL.png)
## 4.5. GitHub 페이지에서 Pull Request 생성 및 Merge
### 4.5.1. 순서
1. GitHub 저장소 → Pull Requests → `New pull request`
	![](https://i.imgur.com/ognPY8P.png)
2. **브랜치 확인** + 제목 및 설명 작성 → Review 요청
	![](https://i.imgur.com/UZfDEIF.png)
3. 승인 후 `Merge pull request` 클릭
	![](https://i.imgur.com/KYYEFb7.png)
4. **원격 브랜치 삭제 가능**
    - GitHub에서 직접 삭제하고 로컬에서 `git fetch -p` 
		![](https://i.imgur.com/i5ruSkd.png)
    - 또는 로컬에서 `git push origin --delete feature/1`
5. 로컬 브랜치 삭제
	- `git branch -d feature/1`
6. Merge 후 해당 브랜치 pull
	- 원격 저장소의 최신 main을 로컬로 가져오기
	- `git pull origin main`
### 4.5.2. 결과
![](https://i.imgur.com/2BbuTnr.png)
## 4.6. 작업중인 브랜치로 `main` 변경 사항 병합하기
> main 브랜치에 누군가 PR을 병합했을 때, 
> 내 작업 브랜치(`feature/2`, `feature/3` 등)에도 **최신 변경 사항을 반영**한다.
### 4.6.1. 병합 방법
![](https://i.imgur.com/GhKMULR.png)

| 방법       | 설명                          | 히스토리 정리                   | 충돌 위험    | 권장 시점                                       |
| -------- | --------------------------- | ------------------------- | -------- | ------------------------------------------- |
| `merge`  | 브랜치 간 변경 사항을 합치는 방법         | 커밋 히스토리 유지됨 (merge 커밋 생김) | 낮음       | 공유 브랜치, 팀 협업 시                              |
| `rebase` | 내 커밋을 최신 브랜치 위로 "올려서" 다시 작성 | 히스토리 깔끔                   | 충돌 위험 있음 | 혼자 쓰는 브랜치에서만 사용 (push 전 or force push 가능 시) |
### 4.6.2. rebase 병합 예시
``` cmd
# feature/2 브랜치로 이동
git checkout feature/2

# 최신 main 브랜치를 기준으로 rebase 수행
git rebase main

# 변경된 커밋 이력을 원격 브랜치에 반영 (안전한 강제 푸시)
git push --force-with-lease
```
- **내 커밋이 최신 `main` 위에 올라가며** 히스토리 정리됨
- 충돌이 없기 때문에 자동으로 완료됨
- 일반 `push`는 불가능 → 커밋 이력이 달라졌기 때문
- `--force-with-lease`는 다른 팀원의 작업을 보호하며 강제 푸시 가능
- `1.txt`, `2.txt` 둘 다 있는거 확인할 수 있음
![](https://i.imgur.com/gYLlOE1.png)
![](https://i.imgur.com/Tn1xXnw.png)
### 4.6.3. `rebase` 병합 중 충돌 발생 예시
``` cmd
# feature/3 브랜치로 이동
git checkout feature/3

# 최신 main 브랜치를 기준으로 rebase 수행
git rebase main
```
![](https://i.imgur.com/bZMyuR0.png)
- 충돌(conflict)이 발생하면, 수동으로 수정 → `git add` → `git rebase --continue`
![](https://i.imgur.com/4wNMvno.png)
``` cmd
# 충돌 해결 후
git add 1.txt

# rebase 이어서 진행
git rebase --continue

# 변경된 커밋 이력을 원격 브랜치에 반영 (안전한 강제 푸시)
git push --force-with-lease
```
![](https://i.imgur.com/EdZrD9o.png)
![](https://i.imgur.com/hczqyX8.png)

---
# 5. Git 운영 규칙 사전 정의 항목
### 5.1. 브랜치 전략
-  **브랜치 전략 선택**  
    → `Git Flow` 또는 `GitHub Flow` 중 어떤 방식으로 진행할지 결정
-  **작업 브랜치 병합 후 정리 방식**  
    → 병합 후 원격 브랜치와 로컬 브랜치 모두 삭제할지 여부
### 5.2. 커밋 컨벤션
-  **본문(body) 작성 기준**  
    → 모든 커밋에 본문 작성 필수로 할지, 주요 변경에만 쓸지 / 자유롭게 문장으로 쓸지, 예: "변경사항 / 이유 / 영향" 등의 템플릿을 사용할지
-  **이슈 연동 방식**  
    → Footer에 `Closes #이슈번호` 방식 사용할지 여부
-  **커밋 단위 기준**  
    → 하나의 기능/수정/파일 단위로 커밋을 나눌지, 어느 정도 범위를 허용할지
### 5.3. Pull Request(PR) 규칙
-  **PR 제목/내용 작성 규칙**  
    → 제목은 한글/영문 중 어떤 언어로? 형식은? 예: `[Feat] 로그인 기능 추가`
-  **리뷰어 지정 기준**  
    → 지정 필수 여부 및 최소 리뷰어 수
-  **PR 병합 조건**  
    → 리뷰 승인 몇 명 이상, CI 통과 필수 여부 등
-  **PR 병합 방식 선택**  
    → `Merge Commit`, `Squash Merge`, `Rebase Merge` 중 어떤 방식으로 통일할지
### 5.4. Rebase 사용 규칙
-  **Rebase 사용 허용 범위**  
    → 개인 브랜치에서는 허용? 협업 브랜치에서는 금지? 모든 병합은 merge만 허용할지?
### 5.5. Force Push 및 실수 복구 규칙
- **Force Push 허용 범위를 정해야 함**  
    → 개인 브랜치에서는 `--force-with-lease` 사용을 허용할지 여부  
    → 협업 브랜치(main, develop 등)에서는 Force Push를 허용할지, 금지할지 결정 필요
- **잘못된 push 발생 시 복구 방식 정의 필요**  
    → 실수로 잘못 push했을 경우 `git revert`, `reset`, `reflog` 중 어떤 방식으로 복구할지
---
# 출처
- [broccoli (24.10.11) 개발 현장의 Git Flow: 시나리오별 문제 해결로 협업 능력 향상하기](https://devocean.sk.com/blog/techBoardDetail.do?ID=166878&boardType=techBlog)
- [heewon.ko (23.12.19) Git Branch 전략 비교 - Git Flow vs GitHub Flow ](https://devocean.sk.com/blog/techBoardDetail.do?ID=165571&boardType=techBlog)
- [아웃스탠딩보이 (21.01.08) # [Git] 커밋 메시지 규약 정리 (the AngularJS commit conventions)](https://velog.io/@outstandingboy/Git-%EC%BB%A4%EB%B0%8B-%EB%A9%94%EC%8B%9C%EC%A7%80-%EA%B7%9C%EC%95%BD-%EC%A0%95%EB%A6%AC-the-AngularJS-commit-conventions)
- [ByteByteGo (23.08.11) Git MERGE vs REBASE: Everything You Need to Know](https://www.youtube.com/watch?v=0chZFIZLR_0)
- [Charlie HUSKY로 GIT HOOK 하자](https://library.gabia.com/contents/8492/)

