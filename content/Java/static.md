# static
- Java에서 static은 메모리에 한번 할당되어 프로그램이 종료될 때까지 해제하지 않는 것을 의미한다.
![|500](https://i.imgur.com/wnMKQZg.png)
- Class는 Static 영역에 생성된다.
	- Static 영역에 할당된 메모리는 모든 객체가 공유하는 메모리라는 장점을 지니지만, Garbage Collector가 관리하지 않으므로, 사용할수록 프로그램 종료시까지 할당된 메모리의 크기가 크다.
- new로 생성한 객체는 Heap영역에 생성된다.
	- Heap 영역의 메모리는 Garbage Collector를 통해 수시로 관리 받는다.
### Static 변수 특징
- Static 변수는 클래스 변수이다.
- 객체를 생성하지 않고도 Static 자원에 접근이 가능하다.
# static 변수(정적 변수)
### 메모리에 고정적으로 할당되어, 프로그램이 종료될 때 해제되는 변수
``` java
public class Persion {
	private String name = "gonagi";

	public void printName(){
		System.out.println(this.name);
	}
}
```
- 100명의 Person 객체를 생성하면 `gonagi`의 값을 가지는 메모리 100개가 생성된다.
- static을 사용하여 하나의 메모리를 참조하게 하면 메모리 효율이 높아진다. 또한, `gonagi`라는 값이 변하지 않으므로 `final` 키워드를 붙여주고, 일반적으로 `static`은 상수의 값을 갖는 경우가 많아 `public`을 붙여준다.
``` java
public class Persion {
	private static final String name = "gonagi";
	public static final String APP_NAME = "MyApp";
	
	public void printName(){
		System.out.println(this.name);
	}
}
```
- 상수들만 모아서 상수의 변수명을 대문자, `_`을 조합하여 이름 짓는다.
- 상속을 방지하기 위해 `final class`로 선언한다.
# Static 메소드(정적 메소드)
``` java
```java
public class Test {
    private String name1 = "gonagi";
    private static String name2 = "gonagi";
 
    public static void printMax(int x, int y) {
        System.out.println(Math.max(x, y));
    }
         
    public static void printName(){
       // System.out.println(name1); 불가능한 호출
       System.out.println(name2);
    }
}
```
- 객체 생성 없이 호출이 가능하며, 객체에서는 호출이 가능하지만 지양하고 있다.
- static 메소드에 접근하기 위한 변수는 반드시 static으로 선언되어야 한다.
	- `name1`은 new 연산을 통해 객체가 생성된 후에 메모리가 할당된다. 
	- 하지만 static 메소드는 객체의 생성 없이 접근하는 함수이므로, 할당되지 않은 메모리 영역에 접근하는 것이어서 문제가 발생한다.
``` java
import java.text.SimpleDateFormat;
import java.util.Date;
import android.util.Patterns;
 
public final class CommonUtils {
    public static String getCurrentDate() {
        Date date = new Date();
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyMMdd");
        return dateFormat.format(date);
    }
     
    public static boolean isEmailValid(String email) {
        return Patterns.EMAIL_ADDRESS.matcher(email).matches();
    }    
}
```
- 상속을 방지하기 위해 `final class`로 선언하고, 유틸 관련된 함수들을 모아둔다.
	- 유틸리티 클래스는 `static` 메서드로만 구성되며, 인스턴스를 생성하거나 상속할 필요가 없다.
	- 공통적으로 사용될 메서드를 제공하는 것이므로 상속할 필요가 없다.
### static 클래스
- 중첩 클래스(nested class)를 사용할 때 사용한다.
- #### inner class의 문제점은 ==외부 참조를 하고, 메모리 누수 현상이 발생하는 것이다.==
	- inner class를 static으로 만들지 않으면 `Inner class may be 'static'`경고가 발생한다.
	- inner class를 생성하면 내부 클래스가 외부의 멤버를 사용하지 않아도, 숨겨잔 외부 참조가 생성된다.
	- inner class가 outer class 인스턴스에 대한 참조를 갖고 있기 때문에, Garbage Collection은 outer class의 인스턴스를 수거 대상으로 보지 않아 GC의 대상에서 빠지게 된다.
		- inner class, outer class 두 인스턴스가 연결되어 있어 outer class 인스턴스의 메모리를 못 뺀다.
``` java
import java.util.ArrayList;

class Outer_Class {
    // 외부 클래스 배열 변수
    private int[] data;

    // 내부 클래스
    class Inner_Class {
    }

    // 외부 클래스 Constructor
    public Outer_Class(int size) {
        data = new int[size]; // 사이즈를 받아 배열 필드의 크기를 불림
    }

    // 내부 클래스 객체를 생성하여 반환하는 메소드
    Inner_Class getInnerObject() {
        return new Inner_Class();
    }
}

public class Main {
    public static void main(String[] args) {

        ArrayList<Object> arr = new ArrayList<>();

        for (int cnt = 0; cnt < 50; cnt++) {
            // inner_Class 객체를 생성하기 위해 Outer_Class를 초기화하고 메서드를 호출하여 리스트에 넣는다.
            // Outer_Class 는 메서드 호출용으로 한번 사용되고 더이상 사용되지 않기에 GC 대상이 되어야 한다.
            arr.add(new Outer_Class(100000000).getInnerObject());
            System.out.println(cnt);
        }
    }
}
```
1. `Inner_Class`을 담을 리스트 arr 생성
2. 반복문을 통해 50개의 `Inner_Class` 객체를 리스트에 담는다.
3. 이 떄 내부 클래스 생성을 위해 외부 클래스를 먼저 인스턴스화 해야 하므로, `Outer_Class`를 new 키워드로 인스턴스화 한다.
4. `Outer_Class` 생성자 파라미터로 100,000,000 크기의 int 배열이 생성되어 400MB 크기의 객체가 힙 메모리에 쌓인다.
5. 그리고 `getInnerObject()` 메서드를 호출하여 `Inner_Class` 객체를 생성하고 반환한다.
6. 생성된 `Inner_Class` 객체를 리스트에 저장한다.
7. 메서드 호출용도로 사용된 `Outer_Class`는 더이상 필요가 없어 GC 대상이 되어야 하지만, `Inner_Class`와 결합되어 있어 GC가 관리하지 못한다.
``` java
// 내부 클래스
static class Inner_Class {
}
```
- Inner_Class를 static 클래스로 바꾸면, 외부 클래스의 인스턴스와 참조 관계가 없으므로, `Outer_Class`가 사용되지 않을 때 GC로 메모리 해제를 할 수 있다.
___ 
[망나니 개발자 (2019.04) static 변수와 static 메소드](https://mangkyu.tistory.com/47)
[devdo (2022.10) static 변수, static 메서드 그리고 static 클래스](https://velog.io/@mooh2jj/Java-static-%EB%B3%80%EC%88%98-static-%EB%A9%94%EC%84%9C%EB%93%9C-%EA%B7%B8%EB%A6%AC%EA%B3%A0-static-%ED%81%B4%EB%9E%98%EC%8A%A4)
[Redddy (2023.08) static 메서드와 static 클래스](https://lazypazy.tistory.com/231)