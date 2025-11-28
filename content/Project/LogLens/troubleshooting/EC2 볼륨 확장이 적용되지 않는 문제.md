## 1. 문제 상황

> AWS 콘솔에서 EBS 볼륨 크기를 확장했지만, EC2 인스턴스 내부에서 용량이 반영되지 않았습니다.

AWS 콘솔에서 EBS 볼륨 크기를 8GB에서 30GB로 확장했지만, 실제 EC2 인스턴스에서 `df -h` 명령어로 확인하면 여전히 기존 용량만 인식되고 있었습니다.

EBS 볼륨 크기는 물리적으로 늘어났지만, 운영체제 내부의 파티션과 파일시스템이 확장되지 않았던것이 원인이었습니다.

---
## 2. 현재 상태 확인

### 2.1 디스크 및 파일시스템 확인
```bash
df -h
lsblk
```

### 2.2 확인 결과
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/root       6.8G  4.6G  2.2G  68% /

NAME         MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
nvme0n1      259:0    0   30G  0 disk
├─nvme0n1p1  259:1    0    7G  0 part /
```

**상태 분석**
- `/dev/nvme0n1`: EBS 디스크 전체 (30GB로 확장됨)
- `/dev/nvme0n1p1`: 실제 루트 파티션 (여전히 7GB)

EBS 볼륨은 늘어났지만, OS가 아직 확장된 크기를 반영하지 않음

---
## 3. 해결 방법

### 3.1 cloud-guest-utils 설치

파티션 확장을 위해 `growpart` 명령어를 제공하는 패키지를 설치
```bash
sudo apt-get update
sudo apt-get install -y cloud-guest-utils
```
`cloud-guest-utils`는 클라우드 환경에서 디스크 관리에 필요한 유틸리티를 포함하고 있으며, `growpart` 명령어로 파티션을 확장할 수 있습니다.

---
### 3.2 루트 파티션 확장
```bash
sudo growpart /dev/nvme0n1 1
```

**실행 결과**
```
CHANGED: partition=1 start=2099200 old: size=14677983 end=16777182 new: size=60815327 end=62914526
```
 `/dev/nvme0n1` 디스크의 1번 파티션(`/dev/nvme0n1p1`)이 디스크 전체 크기로 확장되었습니다.

---
### 3.3 파일시스템 확장
```bash
sudo resize2fs /dev/nvme0n1p1
```

**실행 결과**
```
Filesystem at /dev/nvme0n1p1 is mounted on /; on-line resizing required
old_desc_blocks = 1, new_desc_blocks = 4
The filesystem on /dev/nvme0n1p1 is now 7601915 (4k) blocks long.
```
`resize2fs` 명령어는 ext4 파일시스템의 크기를 확장합니다. 시스템이 실행 중인 상태에서도 안전하게 적용됩니다.

---
### 3.4 확장 결과 확인
```bash
df -h
```

**결과**
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/root        30G  4.6G   25G  16% /
```
루트(`/`) 파일시스템이 정상적으로 30GB 전체 용량을 인식합니다.

---
## 4. 전체 절차 요약

| 단계  | 명령어                                  | 설명                 |
| --- | ------------------------------------ | ------------------ |
| 1   | `df -h`, `lsblk`                     | 현재 디스크 및 파티션 구조 확인 |
| 2   | `sudo apt install cloud-guest-utils` | growpart 유틸리티 설치   |
| 3   | `sudo growpart /dev/nvme0n1 1`       | 루트 파티션 확장          |
| 4   | `sudo resize2fs /dev/nvme0n1p1`      | 파일시스템 확장           |
| 5   | `df -h`                              | 최종 용량 확인           |
