## 1. 문제 상황

### 1.1 발생한 문제

GitHub에 push 된 커밋 히스토리를 확인하던 중,  
Conventional Commit 규칙에 맞지 않는 커밋 메시지가 포함된 것을 발견했습니다.
![](https://i.imgur.com/0ieF6xb.png)

---
### 1.2 환경 정보

**Git 환경**
- Repository: **개인 프로젝트**
- Branch: `main`
- 원격 저장소: GitHub (`origin/main`)
- 상태: 로컬 브랜치와 원격 브랜치 동기화됨
```text
main → origin/main
```

**문제 커밋 위치**
- 가장 오래된 커밋 (히스토리 하단)
- 이미 원격 저장소에 push 완료된 상태

---
## 2. 해결 방법 (Interactive Rebase)

### 2.1 Interactive Rebase란?

**Interactive Rebase**는  
과거 커밋의 순서, 내용, 메시지를 수정할 수 있는 Git 기능입니다.

**주요 특징**
- 과거 커밋 메시지 수정 가능
- 커밋 히스토리 재작성
- 이미 push된 커밋의 경우 force push 필요

---
### 2.2 해결 절차

#### 1. 수정할 커밋 범위 지정

최근 커밋이 3개이므로 다음 명령 실행
```bash
git rebase -i HEAD~3
```

#### 2. rebase 편집 화면 수정
```text
pick a1b2c3 feat: 게시글 CRUD 기능 구현
pick d4e5f6 chore: JPA 및 MySQL 의존성 추가
pick g7h8i9 featL snowflake 추가
```

`featL` 커밋을 수정 대상으로 변경
```text
pick a1b2c3 feat: 게시글 CRUD 기능 구현
pick d4e5f6 chore: JPA 및 MySQL 의존성 추가
reword g7h8i9 featL snowflake 추가
```

#### 3. 커밋 메시지 수정
```text
feat: snowflake 추가
```

저장 후 종료하면 rebase가 완료됩니다.

#### 4. 변경 사항 원격 반영 (Force Push)
```bash
git push --force-with-lease
```
- `--force-with-lease`: 원격 변경 사항이 있을 경우 push 차단
- 단순 `--force`보다 안전
    

---
## 3. 결과 확인

### 3.1 커밋 히스토리 확인
```bash
git log --oneline
```

```text
feat: 게시글 CRUD 기능 구현
chore: JPA 및 MySQL 의존성 추가
feat: snowflake 추가
```

➡️ 잘못된 커밋 메시지가 정상적으로 수정됨
아래 내용을 **그대로 이어 붙여서 쓸 수 있게**, 기존 톤·형식 유지해서 정리해봤어요.  
(블로그 글로 읽었을 때도 흐름이 자연스럽게 이어지도록 구성했습니다)

---
## 4. 공용 리포지토리였다면 어떻게 해야 했을까?

앞선 방법은 **개인 리포지토리**이기 때문에 문제없이 적용할 수 있었습니다.  
하지만 **공용 리포지토리(팀 프로젝트)**에서 이미 push 된 커밋을 수정하는 경우에는  
히스토리 변경이 팀원들에게 영향을 줄 수 있으므로 **다른 접근이 필요합니다**.

### 4.1 공용 리포지토리에서 Force Push가 위험한 이유

공용 브랜치(`main`, `develop` 등)에 대해 `rebase + force push`를 수행하면,
- 다른 팀원의 로컬 히스토리와 충돌 발생
- pull 시 rebase/merge 충돌 유발
- 최악의 경우 작업 내역 유실 가능

즉, **히스토리 재작성은 팀 전체에 영향을 주는 행위**가 됩니다.

---
### 4.2 권장 방법 ①: 새로운 커밋으로 수정 (가장 안전)

이미 push 된 커밋 메시지가 잘못된 경우,  
**히스토리는 그대로 두고 새로운 커밋으로 보완**하는 방식이 가장 안전합니다.

#### 예시
기존 잘못된 커밋
```text
featL snowflake 추가
```

이를 바로 고치지 않고, 설명 보완 커밋 추가
```bash
git commit -m "chore: snowflake 기능 커밋 메시지 보완"
```

**장점**
- 히스토리 변경 없음
- 팀원 영향 없음
- 리뷰·추적에 안전

**단점**
- 커밋 로그가 완벽하게 깔끔하지는 않음

---
### 4.3 권장 방법 ②: 관리자 합의 후 제한적 Rebase

정말로 커밋 히스토리 정합성이 중요한 경우  
(예: 릴리즈 브랜치 정리, 오픈소스 메인 브랜치)

다음 조건을 **모두 만족할 때만** rebase를 고려합니다.

**사전 조건**
- 해당 브랜치를 사용하는 인원이 극소수
- 모든 참여자에게 사전 공유 완료
- 작업 중인 사람이 없음을 확인

#### 절차 개요
1. 팀원에게 rebase 예정 공지
2. Interactive Rebase로 커밋 수정
3. `--force-with-lease`로 push
4. 팀원들은 로컬 브랜치 reset 또는 rebase 수행

```bash
git fetch origin
git reset --hard origin/main
```

---
### 4.4 상황별 정리

| 상황             | 권장 방식                                 |
| -------------- | ------------------------------------- |
| 개인 리포지토리       | Interactive Rebase + force-with-lease |
| 공용 리포지토리 (일반)  | 새 커밋으로 보완                             |
| 공용 리포지토리 (합의됨) | 제한적 rebase + 사전 공유                    |
