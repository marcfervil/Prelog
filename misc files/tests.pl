%not(Goal) :- call(Goal), !, fail.
%not(Goal).

%permission(_,_):-fail.

%permission(_,_)

/*
john took apples.
	matt has fun.
	lacy has apples.
	$a $b $c if: $x $y $z.
*/

test(john, took, apples).
test(matt, has, fun).
test(lacy, has, apples).


best(A, B, C) :- test(X, Y, Z).

% $X has trust_issues if: matt has apples, $X has $Y.