# 시간을 허비한 이유
### 1. OSM
- OSRM은 `.osm.pbf`형식의 파일을 사용하여 경로를 탐색한다. 하지만 다운받을 수 있는 지리 공간 데이터는 대한민국밖에 없어서 직접 서울만 추출해야 했다.
	- 서울만 뽑아내는 과정이 어려워 전국 데이터를 사용할까 고민 했지만, 서울 외 지역의 데이터를 함께 전처리하는데 시간이 너무 오래 걸려 서버 다운과 같은 오류가 발생하여, 결국 서울 데이터만 추출하는 것이 필수적이었다.
	- 또한, 뽀송길의 프로젝트 범위를 서울로 한정했기에, 전국 데이터로 다루기에는 자원의 낭비가 컸다.
- [[서울시_지리공간_데이터_만들기]]에서 추출한 서울 데이터를 C++에서 직접 빌드하기 위해  `.osm`파일을 `.osm.pbf`로 변환한다.([링크](https://manpages.ubuntu.com/manpages/focal/man1/osmconvert.1.html))
	- 우분투 환경에서는 `osmconvert seoul.osm --out-pbf > seoul.osm.pbf`
	- Mac에서는 `osmium cat -o seoul.osm.pbf -O seoul.osm`
- #### 크기 비교
	![|500](https://i.imgur.com/qaiTCbO.png)
	- 전국 데이터(226.1MB) → 서울 데이터(7.9MB)
### 2. OSRM
- OSRM은 C++로 직접 빌드하거나, Node 라이브러리를 사용하거나, Docker로 실행할 수 있다.
- C++ 기반의 OSRM의 코드를 수정해야만 커스터마이징이 가능하다 판단해서 C++로 직접 빌드, 실행 하기로 결정했었다.
- #### C++(우분투 20.04)
	- AWS 프리티어(1GB) 우분투 20.04에서 먼저 빌드를 시도했다.
	- 빌드에 필요한 패키지들을 설치하고 전처리단계를 거쳐 실행했다.([링크](https://github.com/Project-OSRM/osrm-backend/wiki/Building-OSRM), [링크](https://www.linuxbabe.com/ubuntu/install-osrm-ubuntu-20-04-open-source-routing-machine))
	- ##### 1. 패키지 설치
		```
		sudo apt install build-essential git cmake pkg-config \
		libbz2-dev libstxxl-dev libstxxl1v5 libxml2-dev \
		libzip-dev libboost-all-dev lua5.2 liblua5.2-dev libtbb-dev
		```
	- ##### 2. 빌드
		```
		mkdir -p build
		cd build
		cmake .. -DCMAKE_BUILD_TYPE=Release
		cmake --build .
		sudo cmake --build . --target install
		```
		- 빌드 단계를 진행할 때 다음과 같은 오류가 발생했다.
			- 오류 1
				```
				-- Could NOT find Doxygen (missing: DOXYGEN_EXECUTABLE) CMake Error: The following variables are used in this project, but they are set to NOTFOUND. Please set them or make sure they are set and tested correctly in the CMake files: TBB_INCLUDE_DIR
				```
			- 오류 2 
				```
				Scanning dependencies of target EXTRACTOR [  0%] Building CXX object CMakeFiles/EXTRACTOR.dir/src/extractor/compressed_edge_container.cpp.o[  2%] Building CXX object CMakeFiles/EXTRACTOR.dir/src/extractor/edge_based_graph_factory.cpp.o/srv/osrm/osrm-backend/src/extractor/edge_based_graph_factory.cpp:35:10: fatal error: tbb/parallel_pipeline.h: No such file or directory 35 | # include
				```
		- `CMake가` `Doxygen과` `TBB(Template-Based Library)`를 찾지 못한 오류였고, 다음과 같이 필요한 패키지를 설치했다.
			- `sudo apt install Doxygen libtbb-dev`
		- 하지만 여전히 `TBB`관련 오류가 발생했다.
			- 오류 3
				```
				/osrm/osrm-backend/src/extractor/edge_based_graph_factory.cpp:35:10: fatal error: tbb/parallel_pipeline.h: No such file or directory  35 | # include <tbb/parallel_pipeline.h>  | ^~~~~~~~~~~~~~~~~~~~~~~~~  compilation terminated.  make[2]: *** [CMakeFiles/EXTRACTOR.dir/build.make:90: CMakeFiles/EXTRACTOR.dir/src/extractor/edge_based_graph_factory.cpp.o] Error 1  make[1]: *** [CMakeFiles/Makefile2:236: CMakeFiles/EXTRACTOR.dir/all] Error 2  make: *** [Makefile:156: all] Error 2
				```
		- 이러한 TBB 관련 오류를 해결하기 위해 구글링 하다 GitHub Issues에서 관련 질문을 발견하고 해당  패치를 적용해서 해결했다.([링크](https://github.com/Project-OSRM/osrm-backend/issues/6497))![](https://i.imgur.com/c759xGL.png)
			```
			wget -O patch-6497-fix-tbbparallelpipeline.patch https://patch-diff.githubusercontent.com/raw/Project-OSRM/osrm-backend/pull/6493.patch
			patch -p1 < patch-6497-fix-tbbparallelpipeline.patch
			```
	- ##### 3. 실행([링크](https://github.com/Project-OSRM/osrm-backend/wiki/Running-OSRM))
		```
		// 서울 지도(osm)에서 그래프를 추출한다.
		osrm-extract seoul.osm.pbf -p profiles/foot.lua
		// 그래프를 셀 단위로 재귀적으로 분할한다.
		osrm-partition seoul.osm
		// 각 셀에 대한 라우팅 가중치를 계산하고 초기화한다.
		osrm-contract seoul.osrm
		// 쿼리에 응답할 수 있도록 포트 8891에서 HTTP 서버를 실행한다.
		osrm-routed seoul.osm --port 8891
		```
		- 프리티어 자원의 한계로 인해  `osrm-extract`이 완료되지 않고, 서버가 계속 다운됐다.
			- [링크](https://blog.naver.com/PostView.naver?blogId=biud436&logNo=222325896267)를 참고해서 남는 디스크 공간을 활용하여 4GB의 스왑파일을 생성했다.
		- 하지만 워낙 메모리 소모가 큰 작업이고, 여유 디스크 공간도 많이 필요한 작업이어서   `osrm-extract`에는 14시간, `osrm-partition`에는 6시간, `osrm-contract`에는 4시간이 소요됐다.
- #### C++(M2 Air)
	- 속도가 너무 느리고 ==알고리즘을 수정할때마다 다시 빌드를 해야해서 프리티어로 작업하기에는 한계가 있었다.== 그래서 16GB 메모리를 가진 M2 Air에서 OSRM을 실행하여 뽀송길에 적합한 알고리즘을 개발한 후, 이를 우분투에서 실행하기로 결정했다.
	- ##### 1. 패키지 설치
		```
		brew install boost git cmake libzip libxml2 lua tbb ccache pkg-config
		brew install GDAL
		```
	- ##### 2. 빌드(우분투 환경과 동일)
		```
		mkdir -p build
		cd build
		cmake .. -DCMAKE_BUILD_TYPE=Release
		cmake --build .
		sudo cmake --build . --target install
		```
	- ##### 3. 실행(우분투 환경과 동일)
	    ```
		osrm-extract seoul.osm.pbf -p profiles/foot.lua
		osrm-partition seoul.osm
		osrm-contract seoul.osrm
		osrm-routed seoul.osm --port 8891
	    ```
	    - 전처리 후 실행 단계까지 ==걸리는 시간이 10분정도==로 크게 단축됐다.
### 3. Lua Profile 
- 서울시 OSM을 만들고, C++로 OSRM을 실행하는데까지 많은 노력과 시간을 쏟았지만, 알고리즘을 수정하기 위해 C++ 코드를 변경해야 한다고 생각했던 것과는 달리, ==Lua로 작성된 Profile을 수정하는 것만으로도 충분했다.==
- [[뽀송_가중치_설정_과정]]을 거쳐 foot.lua를 수정했다.
- 뽀송길 서비스는 Docker 기반의 컨테이너 환경에서 운영되기 때문에, 굳이 C++로 OSRM을 운영할 필요성을 느끼지 못했다. 슬프지만 지금까지 이뤄낸 성과를 뒤로하고 Docker로 OSRM을 구동하기로 결정했다.
---
# docker로 실행하기
### docker
- docker에서 OSRM을 실행하려면 다음과 같이 진행하면 된다.
	```
	// 서울 지도(osm)에서 그래프를 추출한다.
	docker run --name pposongExtract -t -v "${PWD}:/data" -v ./profiles/foot_pposong.lua:/opt/foot_pposong.lua osrm/osrm-backend osrm-extract -p /opt/foot_pposong.lua /data/seoul.osm
	
	// 그래프를 셀 단위로 재귀적으로 분할한다.
	docker run --name pposongPartition -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/seoul.osm
	
	// 각 셀에 대한 라우팅 가중치를 계산하고 초기화한다.
	docker run --name pposongCustomize -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/seoul.osm
	
	// 쿼리에 응답할 수 있도록 포트 5000에서 HTTP 서버를 실행한다.
	docker run --name pposongRouted -t -i -p 5000:5000 -v "${PWD}:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/seoul.osm
	```
### docker compose
- 뽀송길 서비스는 docker-compose을 이용하기 때문에 OSRM의 extract, partition, customize, routed도 이에 맞춰 docker-compose형식으로 작성했다.
	``` docker-compose.yml
	osrm-extract:
	  image: osrm/osrm-backend
	  container_name: osrm-extract
	  command: osrm-extract -p /opt/foot_pposong.lua /data/seoul.osm
	  volumes:
	    - type: bind
	      source: ./Backend/osrm/data
	      target: /data
	    - type: bind
	      source: ./Backend/osrm/profiles/foot_pposong.lua
	      target: /opt/foot_pposong.lua
	  networks:
	    - osrm-network
	
	osrm-partition:
	  image: osrm/osrm-backend
	  container_name: osrm-partition
	  command: osrm-partition /data/seoul.osrm
	  volumes:
	    - type: bind
	      source: ./Backend/osrm/data
	      target: /data
	  depends_on:
	    osrm-extract:
	      condition: service_completed_successfully
	  networks:
	    - osrm-network
	
	osrm-customize:
	  image: osrm/osrm-backend
	  container_name: osrm-customize
	  command: osrm-customize /data/seoul.osrm
	  volumes:
	    - type: bind
	      source: ./Backend/osrm/data
	      target: /data
	  depends_on:
	    osrm-partition:
	    condition: service_completed_successfully
	  networks:
	    - osrm-network
	
	osrm-routed:
	  image: osrm/osrm-backend
	  container_name: osrm-routed
	  command: osrm-routed --algorithm mld /data/seoul.osm
	  expose:
	    - 5000
	  volumes:
	    - type: bind
	      source: ./Backend/osrm/data
	      target: /data
	  depends_on:
	    osrm-customize:
	    condition: service_completed_successfully
	  networks:
	    - osrm-network
	```
---
# 회고
OSRM 실행 과정에서 OSRM의 GitHub Wiki와 JOSM의 Wiki의 도움을 크게 받았다. 각각의 Wiki에는 오픈소스 사용 방법과 내가 겪고 있는 문제를 먼저 겪은 사람들이 올린 질문, 해결법들이 있었고 이러한 자료들을 통해 프로젝트에  OSRM을 성공적으로 도입할 수 있었다. 이 경험을 통해 잘 정리된 문서의 필요성을 느꼈고, 내가 겪었던 어려움과 해결 과정을 공유하여 다른 사람들에게도 도움이 되고 싶다는 생각이 들어 블로그에 내 경험들을 작성하게 됐다. 또한, 돌고돌아 docker로 OSRM을 구동하게 됐지만 처음에 충분한 사전 조사 없이 C++로  실행하려 해서 많은 시간을 잡아먹은 경험을 통해 앞으로는 어떤 일이든 바로 시작하기보다는 넓은 시각으로 다양한 방면을 철저히 조사한 후 방향을 잡아야겠다고 느꼈다.