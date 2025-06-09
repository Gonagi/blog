# 참조자(Reference)
- 다른 대상에게 또 다른 이름을 붙여주는 것(별명, 별칭)
# 참조자와 규칙
``` c++
#include <iostream>

int main(void) {
	int num = 1;
	int& ref = num;

	ref = 2;

	std::cout << "num value: " << num << std::endl; // num value: 2
	std::cout << "ref value: " << ref << std::endl; // ref value: 2

	std::cout << "num address: " << &num << std::endl; // num address와
	std::cout << "ref address: " << &ref << std::endl; // ref address는 동일

	return 0;
}
```
- `int num = 1;`은 메모리(스택) 특정 영역에 int 만큼의 크기를 할당하고 1 이라는 데이터를 복사하는 것이다.
- 할당된 메모리의 이름을 `num`이라 하고 이를 변수라고 한다.
- `int& ref = num;`은 `num`을 참조하는 참조자 `ref`를 선언하는 것이다.
- 이 변수의 이름은 `num`, `ref` 2개가 되는 것으로 ==하나의 메모리 공간에 이름을 2개 만들고, 이 둘의 주소 값이 같다==라는 의미 이다.
- `ref = 2;`를 하고 값과 주소를 모두 출력해보면 `num`과 `ref` 모두 2로 변경되고 주소가 같은 것을 확인할 수 있다.
### 선언 방법
``` c++
int num = 1;
int& ref1 = num; // 참조자 선언
int& ref2;       // Compile Error(초기화 필요)
```
- 참조자는 선언시 `&`를 붙여야 하며 ==선언과 동시에 참조할 대상을 지정하여 초기화== 해야 한다.(초기화 X → Compile Error)
### 참조 대상 변경 불가
``` c++
int num1 = 1;
int num2 = 2;

int& ref = num1; // ref와 num1은 같음
ref = num2;      // num2를 참조하는 것이 아니라 num1 = num2;를 뜻한다.
```
- ==참조의 대상을 바꿀 수 없다.==
### 상수 참조
``` c++
const int num = 10;    // 상수
int& ref1 = num;       // Compile Error: 비-상수 참조자로 상수 참조 불가
const int& ref2 = num; // Pass
const int& ref3 = 100; // Pass (리터럴 상수)
```
- 비-상수 참조자는 상수를 참조할 수 없다.
- 상수 참조자는 상수, 비상수 모두 참조 가능하다.
- 리터럴 상수는 임시적인 값으로써 다음 행을 실행하면 사라진다. (비-상수 참조자로 상수 참조 못함)
- 상수를 const 참조자로 참조하면 ==임시 변수==라는 것이 생기면서 참조가 가능하다.
``` c++
#include <iostream>

int Add(const int& num1, const int& num2){
	return num1 + num2;
}

int main(){
	std::cout << Add(1, 2) << std::endl;
	return 0;
}
```
- Add 함수의 매개변수를 const 참조자로 받는다.
- `Add(1,2)`처럼 ==바로 상수로 함수 호출이 가능하다.==
- `const int& num1 = 1; const int& num2 = 2;`이 가능
- const 참조자가 없다면 번거롭게 `num1`, `num2`를 선언해서 Add(num1, num2)로 변수를 전달해야 한다.
### NULL 참조 불가
- `NULL`은 상수 값 0을 define한 것이므로 ==일반 참조자는 NULL 참조가 불가능하다.==
# 참조자(Reference)와 참조
### 참조자가 매개변수인 함수
``` c++
#include <iostream>

// 포인터 값 전달
void swapByPTR(int* arg1, int* arg2){
	int tmp = *arg1;
	*arg1 = *arg2;
	*arg2 = tmp;
}

// 참조자 전달
void swapByREF(int& arg1, int& arg2){
	int tmp = arg1;
	arg1 = arg2;
	arg2 = tmp;
}

int main(){
	int num1 = 1;
	int num2 = 2;
	int num3 = 3;
	int num4 = 4;

	swapByPTR(&num1, &num2);
	std::cout << num1 << " " << num2 << std::endl; // 2 1

	swapByREF(num3, num4);
	std::cout << num3 << " " << num4 << std::endl; // 4 3

	return 0;
}
```
- C에서 `Call by Reference`를 하려면 포인터를 활용하는 방법밖에 없다.
	- 포인터는 해당 메모리 주소에 접근할 수 있는 일종의 참조 역할을 하지만, 함수 자체로 보면 여전히 포인터를 값으로 전달한다.
- C++에서는 참조자로도 `Call by Reference`가 가능하다.
``` c++
#include <iostream>

void PrintNum1(const int arg) { // 매개변수에 const를 붙여 의도치 않은 변형을 방지
	std::cout << arg << std::endl;
}

void PrintNum2(const int& arg) { 
	std::cout << arg << std::endl;
}

int main(void) {
	int num = 1;
	PrintNum1(num); // const int arg = num;
	PrintNum2(num); // const int& arg = num;
	return 0;
}
```
- `printNum1`함수를 호출할 때 `num`을 매개변수로 전달하는 것은 `const int arg = num;`와 같은 의미이다. (==num 크기 만큼 메모리 재할당이 일어난다.==)
- 전달하는 데이터가 ==엄청나게  큰 객체라면 그 크기 만큼의 메모리 재할당을 해야 한다.==
- `printNum2`처럼 함수의 매개변수를 값이 아닌 참조자로 받으면 해결된다.
	- `num`의 동일한 메모리에 `arg`라는 또다른 이름만 부여하므로 메모리 재할당이 없다.
- 메모리 재할당은 포인터로도 할 수 있지만 ==참조자는 포인터와 달리 주소값 연산을 이용해서 해당 변수의 메모리가 아닌 다른 메모리에 접근할 수 없기 때문에 안전하다.==
- #### 문제점
	- PrintNum2 입장에서는 이 함수가 매개 변수를 일반 변수로 받는지, 참조자를 받는지 알 수 없다.
	- 따라서 함수 작성자는 함수의 매개변수가 참조자이고 이 매개변수가 변형될 일이 없다면 ==매개변수를 const 참조자로 작성해야 하며==, 함수 호출자 또한 함수가 매개변수를 ==어떤 데이터로 받는지 확인==해야 한다.
### 반환형이 참조자인 함수
``` c++
#include <iostream>

int& AddNum(int& arg){ // 참조자 반환
	agr++;
	return arg;	
}

int main(){
	int num1 = 1;
	int num2 = AddNum(num1); // num1과 num2는 별개의 변수가 된다.

	num1++;

	std::cout << num1 << std::endl; // 3
	std::cout << num2 << std::endl; // 2

	int& num3 = AddNum(num1); // 참조자로 받았기 때문에 num1과 num3은 같음

	num1++;

	std::cout << num1 << std::endl; // 5
	std::cout << num3 << std::endl; // 5
	return 0;
}
```
- #### 반환값을 어떤 형태로 저장하느냐에 따라서, 결과가 달라진다.
	- ##### 일반 변수
		- 일반 변수로 참조자를 반환받으면 참조자가 가리키는 값이 복사가 된다.
		- `int num2 = arg(참조자) == num1` → 새로운 메모리 num2 할당
	- ##### 참조자
		- 참조자로 참조자를 반환받으면 참조형이 참조하는 변수를 참조하는 것이다.
		- `int& num3 = arg(참조자) == num1` → num3도 num1을 참조한다.
``` c++
#include <iostream>

int& GetNum(){
	int ret = 1;
	return ret; // Compile Warning
}

int main(void){
	int& num = GetNum();
	num = 2; // Runtime Error
	return 0;
}
```
- `GetNum`함수의 반환형이 참조자인데 지역 변수를 반환하고 있다.
- `num`은 `ret`을 참조하고 싶은데 지역변수이므로 `GetNum` 함수가 끝나면 메모리에서 소멸된다.
- 소멸된 메모리를 참조하려고 하므로 ==컴파일 경고==가 발생한다.
- 이후 `num`에 접근하려고 하면 ==컴파일 에러==가 발생한다.
	- 해제된 메모리를 참조하는 참조자를 ==댕글링 레퍼런스(Dangling Reference)==라고 한다.
- ==함수에서 참조자를 반환할 때는 지역 변수를 반환하여 댕글링 레퍼런스가 발생하지 않았는지 확인해야 한다.==
---
[EZC (2021.01) 참조자(Reference)의 개념과 함수 활용](https://easycoding91.tistory.com/entry/C-%EA%B0%95%EC%A2%8C-%EC%B0%B8%EC%A1%B0%EC%9E%90Reference%EC%9D%98-%EA%B0%9C%EB%85%90%EA%B3%BC-%ED%95%A8%EC%88%98-%ED%99%9C%EC%9A%A9)