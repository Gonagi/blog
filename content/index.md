---
title: Gonagi
---
# 프로젝트

> [!example] LogLens
> <details>
> <summary>목차 보기</summary>
>
> ### 백엔드 라이브러리
> - [[목차]]
> - [[1. 전체 구조 개요]]
> - [[2. TraceID 관리 시스템]]
> - [[3. 의존성 정보 수집 메커니즘]]
> - [[4. 자동 로깅 시스템]]
> - [[5. 자동 설정 및 통합]]
> - [[6. 전체 실행 흐름]]
> - [[7. 핵심 기술]]
> - [[8. 사용자 가이드]]
>
> ### 인프라
> - [[인프라 아키텍처]]
> - [[로그 수집 파이프라인]]
> 	- [[2. 고객 서버 영역]]
> 	- [[3. AI 서버 영역]]
> 	- [[4. 로그 처리 흐름]]
> - [[Bastion을 통한 Private 서버 SSH 접속 가이드]]
> 
> ### 트러블슈팅
> - [[OpenSearch 시간대 불일치로 인해 그래프가 0으로 표시된 문제]]
> - [[Logstash log_id 중복 생성 문제]]
> - [[OpenSearch 인덱스 설계 개선 - 프로젝트 단위 인덱싱 구조로 전환하기]]
> - [[OpenSearch TraceID 검색 실패 원인 분석 및 해결]]
> - [[SSE 로그 스트리밍 401 인증 오류]]
> - [[EC2 볼륨 확장이 적용되지 않는 문제]]
> - [[HikariCP 커넥션 풀 고갈 원인 분석과 해결 과정]]
> - [[Jenkins 빌드 로그 누적으로 인한 디스크 용량 부족 문제]]
> - [[EC2 인스턴스 접속 불가 문제]]
> - [[Redis 연결 오류]]
> </details>


> [!example] Eatda
> <details>
> <summary>목차 보기</summary>
>
> - [[Redis Streams 도입기]]
> 	- [[리뷰 생성 기능 성능 최적화 - CPU 병목 해소와 비동기 처리 도입]]
> - [[로그 설계 및 기준 정립 과정]]
> - [[GitHub]]
> </details>


> [!example] TripMate
> <details>
> <summary>목차 보기</summary>
>
> - [[관광지 페이지네이션 성능 최적화(캐시 미적용 vs Ehcache vs Redis)]]
> - [[Swagger 문서화 개선기]]
>
> </details>


> [!example] 뽀송길
> <details>
> <summary>목차 보기</summary>
>
> ### 개요
> - [[content/Project/뽀송길/outline/1_프로젝트_소개]]
> - [[2_초단기예보_초단기실황]]
> - [[3_대중교통_경로]]
> - [[4_OSRM]]
> - [[5_결과]]
>
> ### 트러블슈팅
> - [[Docker_Springboot_환경설정_개선기]]
> - [[최단경로탐색_알고리즘]]
> - [[서울시_지리공간_데이터_만들기]]
> - [[OSRM_실행과정_일대기]]
> - [[뽀송_가중치_설정_과정]]
> - [[Promise_all을_이용한_기상_데이터_수집_개선기]]
>
> ### 산출물
> - [뽀송길_프로젝트_보고서](https://drive.google.com/file/d/1wrz1E6c7A9nHXzTyQL8pcUO7h0W5dfZO/view?usp=sharing)
> - [뽀송길_경진대회_보고서](https://drive.google.com/file/d/1k3UiB7mK23dokLBPTBnj6_33Zd_6Vqqt/view?usp=sharing)
> - [[발표자료]]
> - [시연영상](https://youtu.be/pW2QbOUD66s)
> - [GitHub 주소](https://github.com/Gonagi/pposonggil_v2)
>
> ### 특허
> - [뽀송길_발명신고서](https://drive.google.com/file/d/1_fZTv2taQnOpr-6V0mWEHvOHQl5bnMbx/view?usp=sharing)
> - [뽀송길_출원명세서_검토_의뢰서](https://drive.google.com/file/d/1zlzwJs632xbQXTzPHBOILQp1A8I4aWoL/view?usp=drive_link)
> - [해외 출원 기술설명서](https://docs.google.com/presentation/d/1XoxPb5tSyJI2GB6fRGezKFaXICcB3cYN/edit?usp=sharing&ouid=111875955541227552351&rtpof=true&sd=true)
>
> </details>

---

# CS

> [!note] 운영체제
> <details>
> <summary>목차 보기</summary>
>
> - [[OS_01_Introduction]]
> - [[OS_02_Operating_Systems]]
> - [[OS_03_OS_Structure_1]]
> - [[OS_04_Operating_Systems]]
> - [[OS_05_Computer_Architecture]]
>
> </details>

> [!note] 시스템 보안
> <details>
> <summary>목차 보기</summary>
>
> - [[ELF 파일 구조-1]]
> - [[메모리_구조]]
> - [[변수별 주소 공간]]
> - [[정리]]
> - [[Static Loading]]
> - [[Dynamic Loading]]
> - [[Dynamic Loading-1]]
> - [[Dynamic Loading-2]]
> - [[Segment Protection]]
>
> </details>

> [!note] 기타
> <details>
> <summary>목차 보기</summary>
>
> - [[참조자(Reference)]]
> - [[Paging]]
>
> </details>

---

# Docker

> [!info] Docker 정리
> <details>
> <summary>목차 보기</summary>
>
> - [[Docker를 사용하는 이유]]
> - [[도커_이미지_레이어-1]]
> - [[도커_이미지_레이어-2]]
> - [[도커_이미지_레이어-3]]
> - [[도커_이미지_레이어-4]]
> - [[Mac에서의_docker_volume_위치]]
>
> </details>

---

# JAVA

> [!tip] Java 정리
> <details>
> <summary>목차 보기</summary>
>
> - [[문자열_비교_방법]]
> - [[오류_예외]]
> - [[자바는_Call_by_reference가_없다]]
> - [[Collections Framework]]
> - [[JVM]]
> - [[static]]
>
> </details>
