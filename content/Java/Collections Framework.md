- 컬랙션 프레임워크에 저장할 수 있는 데이터는 오직 객체이다.
- 원시 타입은 박싱하여 저장해야 하며, 주소값을 담는 것이므로 null도 저장이 가능하다.
# 종류![](https://i.imgur.com/fqNKeES.png)
- `List`와 `Set` 인터페이스를 구현한 컬렉션 클래스들은 공통부분이 많아, `Collection` 인터페이스로 상속되어 있다.
- `Map` 인터페이스 컬렉션들은 두개의 데이터를 묶어 한쌍으로 다루기 때문에 `Collection` 인터페이스와 분리되어 있다.
### Iterable 인터페이스
- 컬렉션 인터페이스들의 가장 최상위 인터페이스
- #### Iterator
	- `ArrayList`, `HashSet과` 같은 컬렉션을 반복하는 데 사용할 수 있는 객체
	- ##### `for-each`와 비교되는 장점
		- 컬렉션에서 요소를 제어할 수 있다.(반복하는 동안 요소를 제거할 수 있다.)
			- `for-each`문으로 자료구조를 돌다가 값을 수정, 삭제하는 경우, `ConcurrentModificationException`이 발생한다.
		- `next()` 및 `previous()`를 써서 앞뒤로 이동할 수 있다.
		- `hasNext()`를 써서 더 많은 요소가 있는지 확인할 수 있다.
``` java
Iterator<String> iterator = cars.iterator();

// iterator 출력
while(iterator.hasNext()){
System.out.println(iterator.next());
}

// for-each 출력
for(String str : cars){
System.out.println(str);
}

// iterator 삭제
while(iterator.hasNext()){
System.out.println("iter.next(): ") + iterator.next())
iterator.remove()
}

// iterator 수정
while(iterator.hasNext()){
Object element = iterator.next();
iterator.set(element + "+");
}
```
### Collection 인터페이스
- 컬렉션 프레임워크에서 가장 기본이 되는 `interface`는 `Collection` 인터페이스이다.
	- 중복도 허용하고, 자료가 저장된 순서도 기억하지 못한다.
	- `add()`, `size()`, `iterator()`, ... 메소드가 있다.
	- 저장된 순서를 기억하지 못하기 때문에 저장된 자료를 하나씩 꺼내 쓸 수 있는 `iterator` 인터페이스를 반환한다.
		- Iterator는 꺼낼것이 있는지 없는지 살펴보는 hasNext()메소드와 하나씩 자료를 꺼낼때 사용하는 next()메소드를 가지고 있다.
![|500](https://i.imgur.com/2GnjDje.png)
---
# List
![|500](https://i.imgur.com/OO3es8D.png)
- 중복을 허용하면서 순서를 기억하는 자료구조 
- `Collection` 인터페이스를 상속받는다.
- `get(int)` 메소드로 n번째 자료를 꺼낼 수 있다.
- 배열과 마찬가지로 `index`로 요소에 접근한다.
- 자료형의 크기가 고정이 아닌 데이터의 양에 따라 동적으로 늘었다 줄어들 수 있다.
- 요소 사이에 빈 공간을 허용하지 않아 삽입/삭제 할때마다 배열 이동이 일어난다.
![|500](https://i.imgur.com/Wb23dF7.png)
### ArrayList 클래스
- 단방향 포인터 구조로 자료에 대한 순차적인 접근에 강점이 있어 ==조회가 빠르다.==
- ==삽입/삭제가 느리다.== 단, 순차적으로 추가/삭제 하는 경우에는 가장 빠르다.
### LinkedList 클래스
- 노드(객체)를 연결하여 리스트처럼 만든 컬렉션
- ==중간 삽입, 삭제가 빈번할 경우 빠른 성능==을 보장한다.
- ==임의의 요소에 대한 접근 성능은 좋지 않다.==
- 리스트 이외에도 스택, 큐, 트리 등의 자료구조의 근간이 된다.
### Vector 클래스![](https://i.imgur.com/CWhjWxB.png)
- `ArrayList`의 구형 버전
- 동기화가 되어 있어 `Thread-Safe`하지만, 잘 쓰지 않는다.
- 협업에서 컬렉션에 동기화가 필요하면 `Collections.synchronizedList()` 메서드를 이용해 `ArrayList`를 동기화 처리하여 사용한다.
### Stack 클래스
- 후입선출(LIFO) 자료구조
- `Vector`를 상속하기 때문에 문제점이 많아 잘 안쓴다. ==(대신 `ArrayDeque` 사용)==
---
# Queue 인터페이스
![|500](https://i.imgur.com/8jSd0MK.png)
- 선입선출 FIFO 구조
![|500](https://i.imgur.com/ASzwOQS.png)
### PriorityQueue 클래스
![|500](https://i.imgur.com/gKQOgiT.png)
- 우선 순위(priority)를 부여하여 우선 순위가 높은 순으로 정렬되고 꺼낸다.
- 수행할 작업이 여러개 있고 시간이 제한되어 있을 때 우선순위가 높은 것부터 수행할 때 쓰인다.
- 우선순위 큐에 저장할 객체는 필수적으로 ==Comparable 인터페이스==를 구현해야 한다.
	- `compareTo()` 메서드 로직에 따라 자료 객체의 우선순위를 결정하는 식으로 동작한다.
- 저장공간으로 배열을 사용하며, 각 요소를 힙(heap) 형태로 저장한다.
	- 힙은 이진 트리의 한 종료로 우선순위가 가장 높은 자료를 루트 노드로 갱신한다는 점으로, 가장 큰 값이나 가장 작은 값을 빠르게 찾을 수 있다는 특징이 있다.
- `null` 저장 불가능
``` java
Queue Student implements Comparable<Student>{
	String name;
	int priority;
	
	// 생성자  생략

	@Override
	public int comapreTo(Student user){
		if (this.priority < user.priority) {
			return -1;
		} else if (this.priority == user.priority){
			return 0;
		} else{
			return 1;
		}
	}
}

public static void main(String[] args){
	Queue<Student> priorityQueue = new PriorityQueue<>();

    priorityQueue.add(new Student("주몽", 5));
    priorityQueue.add(new Student("세종", 9));
    priorityQueue.add(new Student("홍길동", 1));
    priorityQueue.add(new Student("임꺽정", 2));

    // 우선순위 대로 정렬되어 있음
    System.out.println(priorityQueue);
    // [Student{name='홍길동', priority=1}, Student{name='임꺽정', priority=2}, Student{name='주몽', priority=5}, Student{name='세종', priority=9}]
```
### LinkedList 클래스
- `LinkedList는` `List` 인터페이스와 `Queue` 인터페이스를 동시에 상속받고 있기 떄문에, 스택/큐로서도 응용이 가능하다.
- 큐는 데이터를 꺼낼 때 항상 첫번 째 저장된 데이터를 삭제하므로 `QrrayList`와 같이 배열 기반의 컬렉션 클래스를 사용한다면, 데이터를 꺼낼때마다 빈 공간을 채우기 위해 데이터의 이동 & 복사가 발생하므로 비효율적이다.
	- 따라서 `ArrayList`보다 데이터의 추가/삭제가 용이한 `LinkedList`로 구현하는 것이 적합하다.
# Deque 인터페이스
![|500](https://i.imgur.com/NJ6r03c.png)
- 양쪽으로 넣고 빼는 것이 가능한 큐를 말한다.
- 스택과 큐를 하나로 합쳐놓은 것과 같으며 스택으로 사용할 수도 있고, 큐로 사용할 수도 있다.
- `Deque`의 조상은 `Queue`이며, 구현체로 `ArrayDeque`와 `LinkedList` 등이 있다.
### ArrayDeque 클래스
![|500](https://i.imgur.com/7vu2Qb2.png)
- 스택으로 사용할 때 `Stack` 클래스보다 빠르며, 대기열로 사용할 때는 `LinkedList`보다 빠르다.
- 사이즈에 제한이 없다.
- `null`은 요소는 저장되지 않는다.
---
# Set 인터페이스
![|500](https://i.imgur.com/MgX7Wr7.png)
- 중복을 허용하지 않는 자료구조를 표현하는 인터페이스
- 순서 자체가 없으므로 인덱스로 객체를 가져오는 `get(index)` 메서드가 존재하지 않는다.
![|500](https://i.imgur.com/7FVjvJT.png)
### HashSet 클래스
![|500](https://i.imgur.com/iaymdGL.png)
- 배열과 연결 노드를 결합한 자료구조 형태
- 가장 빠른 임의 검색 접근 속도를 가진다.
- 추가, 삭제, 검색, 접근성 모두 뛰어나다.
- 순서를 전혀 예측할 수 없다.
### LinkedHashSet 클래스
- 순서를 가지는 Set 자료
- 중복을 제거하는 동시에 저장한 ==순서를 유지==하고 싶으면, `HashSet` 대신 `LinkedHashSet`을 사용하면 된다.
### TreeSet 클래스
![|500](https://i.imgur.com/9FHY4y0.png)
- 이진 검색 트리 자료구조의 형태로 데이터를 저장
- 중복을 허용하지 않고, 순서를 가지지 않는다.
- ==데이터를 정렬하여 저장한다.==
- 정렬, 검색, 범위 검색에 높은 성능을 뽐낸다.
---
# Map 인터페이스
![|500](https://i.imgur.com/4FOIte8.png)
- `Key`와 `Value`를 가지는 자료구조
- 값(value)은 중복되서 저장될수 있지만, 키(key)는 해당 Map에서 고유해야만 한다.
- 만일 기존에 저장된 데이터와 중복된 키와 값을 저장하면 기존의 값은 없어지고 마지막에 저장된 값이 남게 된다.
- 저장 순서가 유지 되지 않는다
![|500](https://i.imgur.com/hd3FApv.png)
- 모든 `key`들에 대한 정보를 읽어들일 수 있는 `Set`을 반환하는 `keySet()`메소드를 가지고 있다.
- `values`는 중복을 허용하기 때문에 `Collection` 타입으로 반환한다.
### Map.Entry 인터페이스
- Map.Entry 인터페이스는 Map 인터페이스 안에 있는 내부 인터페이스이다.
- Map 에 저장되는 key - value 쌍의 Node 내부 클래스가 이를 구현하고 있다.
- Map 자료구조를 보다 객체지향적인 설계를 하도록 유도하기 위한 것이다.
![|500](https://i.imgur.com/yFfCQQg.png)
``` java
Map<String, Integer> map = new HashMap<>();
map.put("a", 1);
map.put("b", 2);
map.put("c", 3);

// Map.Entry 인터페이스를 구현하고 있는 Key-Value 쌍을 가지고 있는 HashMap의 Node 객체들의 Set 집합을 반환
Set<Map.Entry<String, Integer>> entry = map.entrySet();

System.out.println(entry); // [1=a, 2=b, 3=c]

// Set을 순회하면서 Map.Entry를 구현한 Node 객체에서 key와 value를 얻어 출력
for (Map.Entry<String, Integer> e : entry) {
    System.out.printf("{ %s : %d }\n", e.getKey(), e.getValue());
}
```
### HashMap 클래스
![|500](https://i.imgur.com/64grUGo.png)
- 중복을 허용하지 않고 순서를 보장하지 않는다.
- 키와 값으로 `null`이 허용된다.
- 추가, 삭제, 검색, 접근성이 모두 뛰어나다.
- 비동기로 작동하기 때문에 멀티 쓰레드 환경에서는 ==`ConcurrentHashMap`==을 사용한다.
### LinkedHashMap 클래스
![|500](https://i.imgur.com/Gh7RDrx.png)
- `HashMap`을 상속하지만, Entry들이 연결 리스트를 구성하여 ==데이터의 순서를 보장==한다.
### TreeMap 클래스
![|500](https://i.imgur.com/Dgl2Z8B.png)
- 이진 검색 트리의 형태로 키와 값의 쌍으로 이루어진 데이터를 저장
- `TreeMap`은 `SortedMap` 인터페이스를 구현하고 있어 ==`Key` 값을 기준으로 정렬==되는 특징을 가지고 있다.
- 정렬된 순서로 키/값 쌍을 저장하므로 빠른 검색이 가능하다.
- 단, 키와 값을 저장하는 동시에 정렬을 행하기 때문에 저장시간이 다소 오래 걸린다.
- 정렬되는 순서느 ==숫자 → 알파벳 대문자 → 알파벳 소문자 → 한글== 순이다.
---
[인파 (2023.01) Java Collections Framework 종류 💯총정리](https://inpa.tistory.com/entry/JCF-%F0%9F%A7%B1-Collections-Framework-%EC%A2%85%EB%A5%98-%EC%B4%9D%EC%A0%95%EB%A6%AC)