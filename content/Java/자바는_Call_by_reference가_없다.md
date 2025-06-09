# Call by value
- 메서드를 호출하는 호출자의 변수와 호출 당하는 수신자의 파라미터는 복사된 서로 다른 변수이다.
# Call by reference
- 참조(주소)를 직접 전달하며 호출자의 변수와 수신자의 파라미터는 ==완전히 동일한 변수==이다.
### Java는 오직 Call by Value로만 동작한다.
- #### 자바에서 참조의 의미는 ==객체가 힙에 저장된 위치를 가리키는 메모리 주소==이다.
- c++에서는 [[참조자(Reference)]]를 전달해서 원본 데이터에 직접 접근하지만 java에서는 ==주소값==을 복사해서 넘긴다.
---
# [[JVM]] 메모리에 변수가 저장되는 위치![|500](https://i.imgur.com/KzjWjl7.png)
### 원시 타입(Primitive Type)
``` java
public class primitive{
	void test(){
		int a = 1;
		int b = 2;

		modify(a, b);
	}

	private void modify(int a, int b){
		a = 5;
		b = 10;
	}
}
```
![|500](https://i.imgur.com/lyW10Uh.png)
- 원시 타입(Primitive Type)은 stack 영역에 변수와 함께 저장된다.
- `modify()`로 값을 바꿔도 `test()`의 변수는 변화가 없다.
- #### 원시 타입의 전달은 값만 전달하는 Call by Value로 동작한다.
### 참조 타입(Reference Type)
``` java
class User{
	public int age;
	
	public User(int age){
		this.age = age;
	}
}

public class Reference{
	void test(){
		User a = new User(10);
		User b = new User(20);
		
		modify(a, b);
	}

	public void modify(User a, User b){
		a.age++;

		b = new User(30);
		b.age++;
	}
}
```
![|500](https://i.imgur.com/0zkGXzK.png)
- 참조 타입(Reference Type) 객체는 Heap 영역에 저장되고 stack 영역에 있는 변수가 객체의 ==주소값==을 가지고 있다.
- 주소값을 복사해서 넘기기 때문에 주소값이 가리키는 객체의 내용이 변경된다.
- #### 참조 타입의 전달도 주소 값만 전달하므로 Call by Value로 동작한다.
---
[coco3o (2024.04) 자바가 Call by Value 방식인 이유](https://dev-coco.tistory.com/189)
[인파 (2022.10) 자바는 Call by reference 개념이 없다?](https://inpa.tistory.com/entry/JAVA-%E2%98%95-%EC%9E%90%EB%B0%94%EB%8A%94-Call-by-reference-%EA%B0%9C%EB%85%90%EC%9D%B4-%EC%97%86%EB%8B%A4-%E2%9D%93)
[EricJeong (2020.03) Java는 Call by reference가 없다](https://deveric.tistory.com/92)