


small(grapes).
edible(grapes).



%cans can harm anyone and launch projectiles
can(gun, harm(Y)).
can(gun, launch(projectiles)).


%is(X, Y) :- 


%Anything is dangerous if it can harm anything
iz(X, dangerous) :- can(X, harm(Y)) .


%a choking hazard is anything that is small, not edible and can harm a child
iz(X, chokingHazard) :- 
    \+(iz(X, edible)), 
    iz(X, dangerous), 
    
	iz(X, small).



is(X, dangerous) :- iz(X, chokingHazard).

is(X, Y) :- iz(X, Y).
iz(kinderegg, chokingHazard).
