"use strict";
var _a, _b, _c;
class Animal {
}
Animal.derived = new Set();
class Dog extends Animal {
}
_a = Dog;
Dog.dummy = Animal.derived.add(_a.name);
class Cat extends Animal {
}
_b = Cat;
Cat.dummy = Animal.derived.add(_b.name);
class Donkey extends Animal {
}
_c = Donkey;
Donkey.dummy = Animal.derived.add(_c.name);
console.log(Animal.derived);
//# sourceMappingURL=try.js.map