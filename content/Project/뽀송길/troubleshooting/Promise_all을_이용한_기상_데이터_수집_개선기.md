# 기상 정보 DB 설계
![left](https://i.imgur.com/XQ0vLqi.png)
- [[2_초단기예보_초단기실황]]에서 시간대별로 수집한 데이터를 기반으로 DB를 다음과 같이 설계하였다.
- 기상청은 기상 정보를 격자 좌표(X, Y)로 제공하므로, DB에는 위도와 경도 대신 X, Y 좌표를 저장한다.
- 초단기예보와 초단기실황 API가 공통적으로 제공하는 기상 정보 중, 비가 올 때 사용자에게 영향을 주는 요소들(강수량, 온도, 습도, 풍속)만 선별해 DB에 저장한다.
# 기존 방식
### api.js
``` javascript
schedule.scheduleJob('0,10,20,30,40,50 * * * * *', async function () { 
	for (let idx = 0; idx < 30; idx++) { 
		const input_x = locArr[idx][0]; 
		const input_y = locArr[idx][1]; 
		var ultra_forecast_datas = await forecast.get_Ultra_Forecast_Data(input_date, input_time, input_x, input_y); 
		// db에 저장하는 코드 생략
	} 
});
```
- 10분 주기로 갱신되는 기상청 API 수집을 위해 node-schedule 모듈을 사용해 서울시 30개 격자의 기상 정보를 10분마다 호출했다.
- `async`로 함수를 비동기로 만들고, `await`을 사용해  `forecast.get_Ultra_Forecast_Data()`의 Promise가 완료된 후 다음 코드가 실행되게 구현했다.
### 문제점
- 30개 격자에 대한 기상 정보를 순차적으로 수집하는 방식으로 구현했기 때문에 시간이 많이 소요되었다.
  ![|400](https://i.imgur.com/QIgSuwR.png)
- 위 화면은 기상청 데이터 수집을 직렬로 처리한 기존 방식의 결과 화면이며, 한 작업 당 평균 6분정도 소요된것을 확인할 수 있다.
- 데이터 수집에 소요되는 시간으로 인해 실시간 데이터를 사용자에게 제공해야 하는 목표를 달성하지 못하며, 추후 프로젝트를 전국으로 확장할 경우 1629개 격자의 기상 정보를 수집해야 하기 때문에 개선이 필요했다.
# 개선 방식
### Promise.all
- 여러개의 Promise들을 비동기적으로 실행하며, 모든 Promise가 이행될 때까지 기다렸다가 그 결과값을 담은 배열을 반환한다.
- 주어진 Promise중 하나라도 실패하면 `Promise.all`은 에러와 함께 거부된다.(==에러 처리 필수==)
- #### 참고
	- [프라미스 API](https://ko.javascript.info/promise-api)
### api.js
``` javascript
schedule.scheduleJob("0 0,10,20,30,40,50 * * * *", async function () {
try {
	const connection = await db();
	const input_date = getTimeStamp(1);
	const input_time = getTimeStamp(2);
	const promises = [];
	const HH = input_time.toString().substring(0, 2);
	const MM = input_time.toString().substring(2);
	const time = input_time.toString().substring(0, 2) + "00";
	
	console.log("Time: " + time);
	console.log("________________________________");
	console.log(`Forecast Updating Started[${HH}:${MM}]`);
	console.time(`Forecast Update[${HH}:${MM}] 소요시간`);
	
	for (let idx = 0; idx < 30; idx++) {
		try {
			const input_x = locArr[idx][0];
			const input_y = locArr[idx][1];
			const Data = get_Ultra_Forecast_Data(input_date, input_time, input_x, input_y);
			promises.push(Data);
		} catch (error) {
			console.log("ERROR MERGED");
			console.error(error);
			idx--;
		}
	}

	const ultra_forecast_datas = await Promise.all(promises);
	console.log(`Promise End([${HH}:${MM}]날씨 데이터)`);

	// db에 저장하는 코드 생략
	
	connection.destroy();
```
- `Promise.all`을 이용해여 30개 격자에 대해 기상 정보를 비동기적으로 수집하여 `promises`배열에 저장한다.
- 오류가 발생한 경우 오류 로그를 출력하고 해당 인덱스를 다시 시도한다.
### Ultra_Forecast.js
``` javascript
for (let attempt = 0; attempt < maxAttempts; attempt++) {
	// 오류 발생시 try catch로 초단기예보API 최대 3번 재호출
	try {
		const f_response = await axios.get(f_url, { params: queryParams });
	
		// 데이터 처리 로직 생략

		return ultra_forecast_datas;
	} catch (error) {
		console.error(`forecast[${input_x}][${input_y}] Attempt[${attempt}] failed`, error);
		if (attempt >= maxAttempts - 1)
			console.error("forecast[${input_x}][${input_y}] Max attempts 초과");
	}
}

```
- API 호출이 실패할 경우, 최대 `maxAttempts`(3)번까지 재시도 한다.
- 오류 발생시, 오류 메시지와 함께 현재 시도 횟수를 `console.error`로 남긴다.
### 결과
- 기상 데이터 수집을 병렬적으로 처리하여 속도를 개선하였다.
- `Promise.all`에 전달된 Promise 중 하나라도 실패할 경우 작업이 중단되고 즉시 `reject`상태를 반환하는 것을 방지하기 위해 에러가 발생한 경우, 해당 격자에 대해 최대 3번까지 재시도 하는 에러 핸들링을 추가하였다.
- #### 에러가 발생한 경우![](https://i.imgur.com/jcKxODj.png)
	- 격자(60, 127)의 기상 정보 API 호출 중 에러가 발생하여 한번 다시 시도 했으며, 모든 작업이 끝날때까지 1분 10초가 소요되었다.
- #### 정상 흐름
  ![|400](https://i.imgur.com/MCJ7pUG.png)
	- 기상 정보 API를 병렬 호출하여 소요시간이 크게 단축돼었다.
# 추후 수정 예정
- 초기 뽀송길 서버는 Node.js로 구현 하였으나, 현재는 Spring으로 전환하고 있다. 기상 데이터 수집 또한 Spring을 통해 진행할 예정이다.