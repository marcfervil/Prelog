
small(grapes).
edible(grapes).



%cans can harm anyone
can(gun, harm(Y)).


%Anything is dangerous if it can harm anything
dangerous(X) :- can(X, harm(Y)).

launches(gun, projectile).

%a choking hazard is anything that is small, not edible and can harm a child
chokingHazard(X) :- 
	\+(edible(X)), 
	dangerous(child), 
	small(X).

 
can(kinderegg, harm(child)).