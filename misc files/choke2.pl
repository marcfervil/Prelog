
small(grapes).
edible(grapes).



%cans can harm anyone
%damage goes here
can(gun, harm(Y)).


iz(X, Y) :- fail.

%Anything is dangerous if it can harm anything
iz(X, dangerous) :- can(X, harm(Y)).

launches(gun, projectile).

%a choking hazard is anything that is small, not edible and can harm a child
iz(X, choking_hazard) :- 	
	\+(edible(X)), 
	iss(X, dangerous),
	small(X).

%if anything is dangerous if it is a choking hazard
iz(X, dangerous) :- iz(X, choking_hazard).
	

 
%iss(kinderegg, choking_hazard).