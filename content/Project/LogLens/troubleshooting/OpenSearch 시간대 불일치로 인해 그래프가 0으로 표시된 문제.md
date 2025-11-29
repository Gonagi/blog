## 1. 문제 상황

로그 집계 자체는 정상적으로 저장되고 있었지만, **01:00, 02:00, 04:00 같은 중간 시간대에 조회하면 모든 구간 값이 0으로 표시되는 현상**이 계속 발생했습니다.

예를 들어 02:00 KST에 조회하면:

``` text
00:00 → 0
03:00 → 0
06:00 → 0
...
```

하지만 03:00 정시에 조회하면 정상적으로 출력되었습니다.

---
## 2. 원인 분석

문제를 재현하는 과정에서, 시간 변환과 interval 해석 부분에 다음과 같은 구조적 문제가 있었다는 걸 깨달았습니다.

### 2.1 date_histogram의 timestamp 의미를 잘못 이해함

> OpenSearch의 date_histogram은 내부적으로 UTC 기준으로 버킷을 생성합니다.  
> 
> 하지만 **`time_zone: "+09:00"`을 설정하면 응답에 포함되는 `bucket.timestamp`는  KST(+09:00) 오프셋이 적용된 ISO-8601 문자열로 반환됩니다.**

우리가 date_histogram에

``` text
"time_zone": "+09:00"
```

을 설정해 두었기 때문에,

> **API 응답은 '+09:00' 오프셋이 적용된 ISO-8601 문자열(KST)로 반환됩니다.**

그런데 저는 이 timestamp를  “그래프에 표시해야 하는 최종 시각(KST)”이라고 잘못 이해해 그대로 매칭했습니다.

실제로는 다음처럼 해석해야 했습니다:
``` text
bucket.timestamp = interval 시작 (KST)
bucket.timestamp + interval = 그래프에 표시해야 하는 구간 끝 (KST)
```

이 지점에서부터 매칭이 어긋나기 시작했습니다.

---
### 2.2 UTC/KST가 여러 곳에서 뒤섞여 있었음

코드를 전체적으로 살펴보니:
- Service: 한 번 변환
- Repository: 또 다른 방식으로 변환
- Mapper: 다시 다른 기준으로 변환
- TrafficMapper: 또 다른 패턴…

즉, **시간 변환 로직이 여러 계층에 중복으로 흩어져** 있었습니다.

또한:
- timeSlots는 KST 기준
- bucket.timestamp는 date_histogram의 `time_zone: "+09:00"` 설정 덕분에 **KST로 반환됨**
- 하지만 Repository·Mapper는 이를 다시 UTC라고 가정하고 재변환함

그 결과:
``` text
12:00 (slot)  vs  09:00 (bucket) → 매칭 실패  
15:00 (slot)  vs  12:00 (bucket) → 매칭 실패
```

그래서 3시간 단위 정각에서만 우연히 맞아 떨어졌고, 그 외의 시간대는 전부 0이 출력되고 있었습니다.

---
## 3. 해결 과정

해결 과정에서는 크게 3가지를 바로잡았습니다.
1. Repository에서 timestamp 해석 방식 수정
2. Mapper에서 interval 기준 명확화(시작 → 끝)
3. TrafficMapper 기준도 동일하게 통일

## 3.1 Repository 단계: bucket.timestamp → “그대로 KST로 해석”만 수행

**기존 문제**
- bucket.timestamp가 UTC일 것이라고 가정하고 KST로 변환함
- 하지만 date_histogram에 `time_zone: "+09:00"` 을 설정해 두었기 때문에  
    **우리 환경에서는 bucket.timestamp가 이미 KST(+09:00) 문자열**로 들어옴
- 그 상태에서 다시 UTC로 처리하려 해서 두 번 변환되는 오류가 발생함
``` java
String timestampStr = bucket.keyAsString();
ZonedDateTime zoned = ZonedDateTime.parse(timestampStr, DateTimeFormatter.ISO_OFFSET_DATE_TIME);

// ❌ bucket.timestamp가 이미 KST(+09:00)인데,
// UTC라고 오해하고 “역변환”을 수행함 → 시간 왜곡 발생
LocalDateTime timestamp = zoned.withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();

// ❌ 여기에 다시 KST로 재변환까지 적용
timestamp = timestamp.atOffset(ZoneOffset.UTC)
                     .withOffsetSameInstant(ZoneOffset.of("+09:00"))
                     .toLocalDateTime();
```
즉, **UTC → KST 변환을 중복 적용**하면서  
timestamp가 실제 시간에서 3시간씩 밀리는 문제가 발생했습니다.

**수정 후**
변환을 더 하지 않고, 들어온 값을 그대로 LocalDateTime으로 해석만 수행:
```java
String timestampStr = bucket.keyAsString();

// timestampStr은 이미 KST(+09:00) 문자열
ZonedDateTime zoned = ZonedDateTime.parse(timestampStr, DateTimeFormatter.ISO_OFFSET_DATE_TIME);

// ✅ 수정된 로직
// timestampStr은 이미 KST로 들어오므로 "그대로 파싱"만 하면 됨
LocalDateTime timestamp = zoned.toLocalDateTime();
```
즉, Repository는 _오직 ‘문자열 → LocalDateTime’_ 변환만 수행하도록 단순화했습니다.

---
### 3.2 LogTrendMapper: interval “시작” → interval “끝” 기준으로 변환

OpenSearch bucket.timestamp는 “interval 시작(KST)”입니다.  
하지만 실제 timeSlot은 “interval 끝(KST)”을 기준으로 생성되었습니다.
``` text
bucket.start(KST)  != timeSlot(KST)
```

그래서 Mapper에서는:
``` java
LocalDateTime startKst = agg.timestamp(); 
LocalDateTime endKst = startKst.plusHours(INTERVAL_HOURS); 
LocalDateTime key = endKst.truncatedTo(ChronoUnit.HOURS);
```
이렇게 변환해 매칭 기준을 통일했습니다.
timeSlots도 동일한 규칙으로 생성해 완전히 일치하도록 수정했습니다.

---
### 3.3 TrafficMapper: 시간 슬롯 생성 및 매칭 기준을 LogTrendMapper와 완전히 통일

TrafficMapper에서도 기존에는 interval “시작” 기준을 사용하고 있어  
LogTrendMapper와 매칭이 어긋나고 있었습니다.

TrafficMapper도 동일하게 수정했습니다:
``` java
LocalDateTime endTs = agg.timestamp().plusHours(INTERVAL_HOURS); 
LocalDateTime key = endTs.truncatedTo(ChronoUnit.HOURS);
```

timeSlot 생성도:

``` java
LocalDateTime slotBaseKst = aggregations.getFirst().timestamp()         
		.plusHours(INTERVAL_HOURS)
		.truncatedTo(ChronoUnit.HOURS);
```
→ 이렇게 되면서 **모든 컴포넌트에서 동일한 기준**을 사용하게 되었습니다.

---
## 4. 정리

> date_histogram의 timestamp를 “구간 시작(UTC)”이 아니라 “표시해야 하는 시각(KST)”로 착각해서 발생한 문제였습니다.

그 과정에서:
- UTC/KST 변환이 중복 적용되고 
- 여러 계층에서 서로 다른 규칙을 사용해
- bucket과 slot이 서로 3시간씩 어긋나 매칭이 실패하고 있었다.

수정 후에는 모든 시간대에서 정상적으로 표시됨을 확인했습니다.

---
## 5. 소통의 중요성

문제를 해결하면서 가장 크게 느낀 점은 **“서로 알고 있겠지”라는 생각의 위험성**이었습니다.
``` text
"다들 시간 변환은 알겠지?"
→ 각자 다른 방식으로 구현
→ Service, Repository, Mapper마다 서로 다른 로직
→ 통합 시점에서 오류 발생
```

저를 포함해 팀원들이 “알겠지”라고 생각했던 영역에서  서로 전혀 다른 기준을 사용하고 있었다는 사실을 뒤늦게 깨달았습니다.

특히 시간대 처리처럼 본질적으로 복잡하고, 작은 기준 차이로도 전체 로직이 틀어지는 영역은  **반드시 공통 규칙과 가이드라인이 필요하다**는 것을 확실히 배웠습니다.

---
## 6. 향후 개선 계획

문제를 해결하면서 논의된 개선 방향은 다음과 같습니다.
### 6.1 즉시 적용할 사항

#### **1) TimeZoneUtils 유틸리티 클래스 생성**

> 시간 관련 로직이 여러 곳에 산재하는 문제를 재발 방지하기 위해 모든 변환을 한 곳에서 수행하도록 유틸 클래스를 추가할 예정입니다.

```java
@UtilityClass
public class TimeZoneUtils {
    private static final ZoneId UTC = ZoneOffset.UTC;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    public static LocalDateTime utcToKst(Instant timestamp) {
        return timestamp.atZone(UTC)
                        .withZoneSameInstant(KST)
                        .toLocalDateTime();
    }

    public static LocalDateTime intervalEnd(LocalDateTime start, int hours) {
        return start.plusHours(hours).truncatedTo(ChronoUnit.HOURS);
    }
}
```
- 모든 시간 변환은 `TimeZoneUtils`를 통해 실행 
- Service, Repository, Mapper에서 직접 `ZoneId` 사용 금지
- interval 시작/끝 처리 방식도 통일
- KST/UTC 변환을 일관되게 적용

#### **2) 팀 컨벤션 문서화**

시간 관련 버그는 팀원 간 기준 불일치가 원인이 되는 경우가 많기 때문에  명확한 문서를 만들어 공통 규칙으로 사용할 계획입니다.

```markdown
# 시간대 처리 가이드라인

## 원칙
1. 모든 시간 변환은 TimeZoneUtils 사용 필수
2. Service/Mapper에서 직접 ZoneId 사용 금지
3. OpenSearch timestamp는 항상 UTC 기준으로 인식
4. 프론트 표시 시간은 항상 KST 기준
5. date_histogram은 "interval 시작 시각"을 반환함

## 금지 사항
❌ 각 클래스에서 별도로 시간 변환  
❌ UTC/KST 변환 로직 중복 작성  
❌ bucket.timestamp를 그대로 표시 시간으로 사용  

## 권장 사항
✅ TimeZoneUtils 메서드 활용  
✅ 시간 관련 상수(Interval 등)는 클래스 상단에서 정의  
✅ 시간 변환 로직 수정 시 팀 공지 필수  
```
