### Mac은 VM을 띄우고 그 위에 docker를 실행하기 때문에 `/var/lib/docker`가 없다.
  ![](https://i.imgur.com/bSeX0t9.png)
``` shell
// 볼륨 생성
docker volume create volume-test

// 볼륨 확인
docker volume ls

// 볼륨 상세 정보 확인
docker volume inspect volume-test
```
![](https://i.imgur.com/4rMSZzb.png)

![](https://i.imgur.com/Qfdpz4T.png)
- `/var/lib/docker` 없음

``` shell
// shell에 직접 접근
docker run -it --privileged --pid=host busybox:1.34.1 nsenter -t 123 -m
```
![](https://i.imgur.com/VWcY0QL.png)

---
# 출처
- [Volume 사용시 mac에 /var/lib/docker 경로가 없는 이유](https://amazelimi.tistory.com/entry/Docker-Volume-%EC%82%AC%EC%9A%A9%EC%8B%9C-mac-%EC%97%90-varlibdocker-%EA%B2%BD%EB%A1%9C%EA%B0%80-%EC%97%86%EB%8A%94-%EC%9D%B4%EC%9C%A0-LIM)
