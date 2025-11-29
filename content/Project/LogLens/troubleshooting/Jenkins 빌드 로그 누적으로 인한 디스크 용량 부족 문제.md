## 1. 문제 상황

운영 중인 서버의 `/` 파티션 사용량이 갑자기 74%까지 치솟는 문제가 발생했습니다.  

확인해보니 Docker Volume 안의 Jenkins 빌드 기록이 계속 쌓여 디스크를 거의 다 사용하고 있었습니다.

```bash
df -h -T

# 결과
Filesystem     Type  Size  Used Avail Use% Mounted on
/dev/root      ext4   48G   36G   13G  74% /
```
---
## 2. 원인 분석

### 2.1 디렉토리별 사용량 확인

```bash
sudo du -xh / | sort -rh | head -n 20
```

결과를 보니 `/var/lib/docker`가 대부분의 공간을 차지하고 있었습니다.

특히:

|경로|용량|
|---|---|
|`/var/lib/docker/volumes`|23GB|
|`/var/lib/docker/volumes/loglens_jenkins-data/_data/jobs/BE-ci-build-job/builds`|**21GB**|

원인은 **Jenkins 빌드 기록이 무제한으로 저장되고 있었기 때문**입니다.

---
### 2.2 Jenkins Job 내부 확인

```bash
docker exec -it loglens-jenkins bash
cd /var/jenkins_home/jobs/BE-ci-build-job/builds
ls -lh

# 결과
1/
2/
3/
...
203/
```

총 203개의 빌드 폴더가 날짜별로 모두 남아 있었고, 각각 로그/아티팩트/워크스페이스까지 포함하고 있었습니다.

Jenkins는 기본 설정으로 **빌드를 무한정 보관**합니다.  즉, 설정을 하지 않으면 디스크가 언젠가는 꽉 차게 되어 있습니다.

---
## 3. 해결 방법

### 3.1 오래된 빌드 수동 삭제

Jenkins 컨테이너 내부에서:

```bash
cd /var/jenkins_home/jobs/BE-ci-build-job/builds

# 최근 10개만 남기고 모두 삭제
ls -1 | head -n -10 | xargs rm -rf

# 삭제 후 다시 확인
ls -lh
# 빌드 194~203만 남음
```
---
### 3.2 디스크 사용량 재확인

|항목|정리 전|정리 후|
|---|---|---|
|Jenkins builds|21GB|1.8GB|
|전체 디스크 사용|36GB|16GB|
|사용률|74%|33%|

약 **20GB** 용량을 즉시 확보했습니다.

---
## 4. 재발 방지
### 4.1 Jenkins UI에서 자동 정리 설정

경로:
``` text
BE-ci-build-job → 구성 → Discard old builds 체크
```

![](https://i.imgur.com/ifCAn5N.png)